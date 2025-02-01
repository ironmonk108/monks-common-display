import { registerSettings } from "./settings.js";
import { MonksCommonDisplayLayer } from './monks-common-display-layer.js';
import { CommonToolbar } from "./apps/toolbar.js"

export const DEBUG = false;

export let debug = (...args) => {
    if (DEBUG) console.log("DEBUG: monks-common-display | ", ...args);
};
export let log = (...args) => console.log("monks-common-display | ", ...args);
export let warn = (...args) => console.warn("monks-common-display | ", ...args);
export let error = (...args) => console.error("monks-common-display | ", ...args);
export let i18n = key => {
    return game.i18n.localize(key);
};
export let setting = key => {
    return game.settings.get("monks-common-display", key);
};

export let patchFunc = (prop, func, type = "WRAPPER") => {
    let nonLibWrapper = () => {
        const oldFunc = eval(prop);
        eval(`${prop} = function (event) {
            return func.call(this, ${type != "OVERRIDE" ? "oldFunc.bind(this)," : ""} ...arguments);
        }`);
    }
    if (game.modules.get("lib-wrapper")?.active) {
        try {
            libWrapper.register("monks-common-display", prop, func, type);
        } catch (e) {
            nonLibWrapper();
        }
    } else {
        nonLibWrapper();
    }
}

function registerLayer() {
    /*
    CONFIG.Canvas.layers.monkscommondisplay = { group: "interface", layerClass: MonksCommonDisplayLayer };
    CONFIG.MonksCommonDisplayLayer = {
        documentClass: null,
        layerClass: MonksCommonDisplayLayer,
        prototypeSheetClass: NoteConfig,
        objectClass: Note,
        sheetClasses: {}
    };
    */
    /*
    const layers = foundry.utils.mergeObject(Canvas.layers, {
        MonksCommonDisplayLayer: MonksCommonDisplayLayer
    });
    Object.defineProperty(Canvas, 'layers', {
        get: function () {
            return layers
        }
    });*/
}

export class MonksCommonDisplay {
    static playerdata = {};
    static windows = {};
    static gmControlledTokens = new Set();
    static init() {
        MonksCommonDisplay.SOCKET = "module.monks-common-display";

        registerSettings();
        MonksCommonDisplay.registerHotKeys();

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.ignore_conflicts("monks-common-display", "monks-active-tiles", "ActorDirectory.prototype._onClickEntryName");
        }

        //this is so the screen starts up with the correct information, it'll be altered once the players are actually loaded
        this.playerdata.display = setting('startupdata');
        MonksCommonDisplay.toggleCommonDisplay();

        //registerLayer();

        patchFunc("Notifications.prototype.warn", async function (wrapped, ...args) {
            let [message, options] = args;

            let display = MonksCommonDisplay.playerdata.display || false;
            if (message == "TOKEN.WarningNoVision" && display)
                return;

            return wrapped(...args);
        }, "MIXED");

        patchFunc("Journal.prototype.constructor.showImage", async function (wrapped, ...args) {
            let [src, data] = args;

            let commonid = foundry.utils.randomID();
            foundry.utils.setProperty(data, "commonid", commonid);
            await wrapped(src, data);

            let closeAfter = setting("close-after") ?? 0;
            if (closeAfter != 0) {
                window.setTimeout(() => {
                    MonksCommonDisplay.emit("closeImage", { args: { id: commonid } });
                }, closeAfter * 1000);
            }
        });

        patchFunc("ImagePopout.prototype.shareImage", async function (...args) {
            let commonid = foundry.utils.randomID();
            game.socket.emit("shareImage", {
                image: this.object,
                title: this.options.title,
                caption: this.options.caption,
                uuid: this.options.uuid,
                commonid: commonid
            });
            ui.notifications.info(game.i18n.format("JOURNAL.ActionShowSuccess", {
                mode: "image",
                title: this.options.title,
                which: "all"
            }));
            let closeAfter = setting("close-after") ?? 0;
            if (closeAfter != 0) {
                window.setTimeout(() => {
                    MonksCommonDisplay.emit("closeImage", { args: { id: commonid } });
                }, closeAfter * 1000);
            }
        }, "OVERRIDE");

        patchFunc("ImagePopout.prototype.constructor._handleShareImage", async function (wrapped, ...args) {
            let [options] = args;
            let ip = await wrapped(...args);

            if (options.commonid) {
                MonksCommonDisplay.windows[options.commonid] = ip;
            }

            return ip;
        });

        patchFunc("ActorDirectory.prototype._onClickEntryName", async function (wrapped, ...args) {
            let event = args[0];
            if (!!MonksCommonDisplay.selectToken) {
                event.preventDefault();
                const documentId = event.currentTarget.closest(".document").dataset.documentId;

                if (setting("per-scene")) {
                    await canvas.scene.setFlag("monks-common-display", MonksCommonDisplay.selectToken, documentId);
                    foundry.utils.setProperty(canvas.scene, `flags.monks-common-display.${MonksCommonDisplay.selectToken}`, documentId);
                } else {
                    await game.settings.set("monks-common-display", MonksCommonDisplay.selectToken, documentId);
                }

                if (MonksCommonDisplay.selectToken == "screen") MonksCommonDisplay.screenChanged(); else MonksCommonDisplay.focusChanged();
                MonksCommonDisplay.selectToken = null;
                if (MonksCommonDisplay.toolbar && setting("show-toolbar") && game.user.isGM)
                    MonksCommonDisplay.toolbar.render(true);
            } else
                wrapped(...args);
        }, "MIXED");

        /*
        patchFunc("Journal.prototype.constructor._showEntry", async function (...args) {
            let entry = await fromUuid(uuid);
            const options = { tempOwnership: force, mode: JournalSheet.VIEW_MODES.MULTIPLE, pageIndex: 0 };
            if (entry instanceof JournalEntryPage) {
                options.mode = JournalSheet.VIEW_MODES.SINGLE;
                options.pageId = entry.id;
                // Set temporary observer permissions for this page.
                entry.ownership[game.userId] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
                entry = entry.parent;
            }
            else if (entry instanceof JournalEntry) entry.ownership[game.userId] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
            else return;
            if (!force && !entry.visible) return;
    
            // Show the sheet with the appropriate mode
            entry.sheet.render(true, options);
    
            if (options.commonid) {
                MonksCommonDisplay.windows[options.commonid] = ip;
            }
        }, "OVERRIDE");
        */

        patchFunc("PlayerList.prototype._getUserContextOptions", function (wrapped, ...args) {
            let menu = wrapped(...args);

            menu.push({
                name: i18n("MonksCommonDisplay.ShowAsCommonDisplay"),
                icon: '<i class="fas fa-presentation-screen"></i>',
                condition: li => game.user.isGM && !game.users.get(li[0].dataset.userId).isGM,
                callback: li => {
                    let playerdata = setting('playerdata');
                    let id = li[0].dataset.userId;
                    let data = playerdata[id] || {};

                    data.display = !data.display;

                    playerdata[id] = data;

                    game.settings.set('monks-common-display', 'playerdata', playerdata).then(() => {
                        MonksCommonDisplay.emit("dataChange");
                    });
                    ui.players.render();
                }
            });

            return menu;
        });

        patchFunc("Scene.prototype.view", async function (wrapped, ...args) {
            let result = await wrapped.call(this, ...args);
            if (MonksCommonDisplay.playerdata.display || false) {

                if (setting("screen-toggle")) {
                    if (MonksCommonDisplay.screenValue == "gm")
                        MonksCommonDisplay.emit("requestScreenPosition");
                    else if (MonksCommonDisplay.screenValue == "scene")
                        MonksCommonDisplay.sceneView();
                    else
                        MonksCommonDisplay.changeScreen();
                }
                if (setting("focus-toggle")) {
                    if (MonksCommonDisplay.screenValue == "gm")
                        MonksCommonDisplay.emit("requestGMTokens");
                    else
                        MonksCommonDisplay.changeFocus();
                }
            } else if (game.user.isGM && setting("screen-toggle") && MonksCommonDisplay.screenValue == "gm" && canvas.scene.active)
                MonksCommonDisplay.sendScreenMessage("canvasPan", game.canvas.scene._viewPosition);

            return result;
        });
    }

    static ready() {
        let display = MonksCommonDisplay.playerdata.display || false;
        //check to see if this is a display screen
        MonksCommonDisplay.dataChange();

        if (game.user.isGM) {
            MonksCommonDisplay.initGM();
        } 
        game.socket.on(MonksCommonDisplay.SOCKET, MonksCommonDisplay.onMessage);

        if (display && game.combats.active) {
            ui.combat.renderPopout(ui.combat);
            window.setTimeout(function () {
                MonksCommonDisplay.setScrollTop();
            }, 500);
        }

        if (setting("show-toolbar") && game.user.isGM)
            MonksCommonDisplay.toolbar = new CommonToolbar().render(true);

        if (!game.modules.get('monks-combat-details')?.active && !game.modules.get('monks-enhanced-journal')?.active) {
            patchFunc("Draggable.prototype._onDragMouseUp", async function (wrapped, ...args) {
                try {
                    if (this.app.constructor._getInheritanceChain) {
                        for (const cls of this.app.constructor._getInheritanceChain()) {
                            Hooks.callAll(`dragEnd${cls.name}`, this.app, this.app.position);
                        }
                    } else {
                        Hooks.callAll(`dragEnd${this.app.constructor.name}`, this.app, this.app.position);
                    }
                } catch (e) { }
                return wrapped(...args);
            });
        }
    }

    static emit(action, args = {}) {
        args.action = action;
        args.senderId = game.user.id
        game.socket.emit(MonksCommonDisplay.SOCKET, args, (resp) => { });
    }

    static requestScreenPosition() {
        if (game.user.isGM && canvas.scene.active && setting("screen-toggle") && MonksCommonDisplay.screenValue == "gm")
            MonksCommonDisplay.sendScreenMessage("canvasPan", game.canvas.scene._viewPosition);
    }

    static requestGMTokens() {
        if (game.user.isGM && canvas.scene.active && setting("focus-toggle") && MonksCommonDisplay.focusValue == "gm")
            MonksCommonDisplay.sendFocusMessage("controlToken", { tokens: canvas.tokens.controlled.map((t) => t.id), control: true });
    }

    static dataChange() {
        let data = setting('playerdata');
        let olddata = MonksCommonDisplay.playerdata;
        MonksCommonDisplay.playerdata = data[game.user.id] || { display: false, mirror: false, selection: false };

        game.settings.set('monks-common-display', 'startupdata', MonksCommonDisplay.playerdata.display);

        if (olddata.display != MonksCommonDisplay.playerdata.display)
            MonksCommonDisplay.toggleCommonDisplay();

        // release all tokens on common display for easier sync
        if (MonksCommonDisplay.playerdata.display) {
            for (const token of game.canvas.tokens.controlled) {
                token.release();
            }
        }

        ui.players.render();
    }

    static toggleCommonDisplay() {
        let display = (MonksCommonDisplay.playerdata.display || false) && setting("hide-ui");
        $('body')
            .toggleClass('hide-ui', display)
            .toggleClass('hide-chat', display && !setting('show-chat-log'))
            .toggleClass('hide-camera-views', display && !setting('show-camera-views'))
            .toggleClass('show-combat', display && setting('show-combat'))
            .toggleClass('show-combatants', display && setting('show-combatants'))
            .attr('limit-combatants', setting('limit-shown'));
        if (display && ui.sidebar)
            ui.sidebar.activateTab('chat');
        //$("body").get(0).style.setProperty("--combat-popout-scale", display ? setting('combat-scale') : 1);
    }

    static registerHotKeys() {
        game.keybindings.register('monks-common-display', 'clear-images', {
            name: 'MonksCommonDisplay.ClearImages',
            editable: [{ key: 'Comma', modifiers: ['Control'] }],
            onDown: () => {
                MonksCommonDisplay.emit("closeImagePopout");
            }
        });
        game.keybindings.register('monks-common-display', 'clear-journals', {
            name: 'MonksCommonDisplay.ClearJournals',
            editable: [{ key: 'Period', modifiers: ['Control'] }],
            onDown: () => {
                MonksCommonDisplay.emit("closeJournals");
            }
        });
    }

    static initGM() {
        Hooks.on("canvasPan", (canvas, data) => {
            if (MonksCommonDisplay.screenValue == "gm" && canvas.scene.active && setting("screen-toggle")) {
                MonksCommonDisplay.sendScreenMessage("canvasPan", data);
            }
        });
    }

    static sendScreenMessage(action, data) {
        if (setting("screen-toggle") && MonksCommonDisplay.isAnyDisplayPlayerLoggedIn()) {
            debug('screen message', action, data)
            MonksCommonDisplay.emit(action, { args: data });
        }
    }

    static sendFocusMessage(action, data) {
        if (MonksCommonDisplay.isAnyDisplayPlayerLoggedIn()) {
            debug('focus message', action, data);
            MonksCommonDisplay.emit(action, { args: data }); //{ args: { tokens: control ? [tokenId] : null, control } });
        }
    }

    static isAnyDisplayPlayerLoggedIn() {
        for (let [k, v] of Object.entries(setting('playerdata'))) {
            if (v.display === true && game.users.get(k)?.active == true) {
                return true;
            }
        }

        return false;
    }

    static onMessage(data) {
        //log('onMessage', data);
        MonksCommonDisplay[data.action].call(MonksCommonDisplay, data.args)
    }

    static closeImage(data) {
        if (MonksCommonDisplay.playerdata.display) {
            let app = MonksCommonDisplay.windows[data.id];
            if (app && app.close)
                app.close();
        }
    }

    static closeImagePopout(id) {
        //check to see if this is a player, if this is and it currently applies to this user, then we need to clear all the potentially open windows
        let user = game.users.find(u => u.id == id);
        if (user || (id == undefined && MonksCommonDisplay.playerdata.display)) {
            $('.image-popout .header-button.close').click();
        }//else
        //    $('#app-' + id + ' .header-button.close').click(); //app-id isn't shared, I guess that should be obvious
    }

    static closeJournals(id) {
        let user = game.users.find(u => u.id == id);
        if (user || (id == undefined && MonksCommonDisplay.playerdata.display)) {
            //find a journal window
            $('.app.journal-sheet .header-button.close').click();
        }
    }

    static canvasPan(data) {
        if (MonksCommonDisplay.playerdata.display) {
            if (data.animate)
                canvas.animatePan(data);
            else
                canvas.pan(data);
        }
    }

    static controlToken(data) {
        if (MonksCommonDisplay.playerdata.display) {
            if (data.overwrite)
                MonksCommonDisplay.gmControlledTokens.clear();

            for (let id of data.tokens || []) {
                let token = canvas.scene.tokens.get(id);
                if (token) {
                    if (data.control) {
                        MonksCommonDisplay.gmControlledTokens.add(token.id);
                        if (token.testUserPermission(game.user, "OBSERVER") && !token.hidden)
                            token._object?.control({ releaseOthers: false });
                    } else {
                        MonksCommonDisplay.gmControlledTokens.delete(token.id);
                        token._object?.release();
                    }
                }
            }
        }
    }

    static setScrollTop() {
        let active = $('#combat-popout #combat-tracker li.active')[0];
        log('Active', active, active?.offsetTop);
        if (active)
            $('#combat-popout #combat-tracker').scrollTop(active.offsetTop - (setting("limit-shown") > 2 ? 50 : 0));
    }

    static screenChanged() {
        if (MonksCommonDisplay.screenValue == "gm") {
            if (canvas.scene.active) {
                let data = foundry.utils.mergeObject({ animate: true, speed: 1000 }, game.canvas.scene._viewPosition);
                MonksCommonDisplay.sendScreenMessage("canvasPan", data);
            }
        } else if (MonksCommonDisplay.screenValue == "scene") {
            MonksCommonDisplay.sendScreenMessage("sceneView");
        } else {
            MonksCommonDisplay.sendScreenMessage("changeScreen");
        }
    }

    static changeScreen() {
        if (MonksCommonDisplay.playerdata.display && setting("screen-toggle")) {
            // The screen has changed and this is a player display so refresh the screen
            let tokens = MonksCommonDisplay.getTokens(MonksCommonDisplay.screenValue);
            if (tokens && tokens.length) {
                let x1, y1, x2, y2;
                for (let token of tokens) {
                    let x = token._mcd_x ?? token.x;
                    let y = token._mcd_y ?? token.y;
                    delete token._mcd_x;
                    delete token._mcd_y;
                    log('Token', token.name, x, y);
                    x1 = !x1 ? x : Math.min(x1, x);
                    y1 = !y1 ? y : Math.min(y1, y);
                    x2 = !x2 ? x + (token.width * canvas.dimensions.size) : Math.max(x2, x + (token.width * canvas.dimensions.size));
                    y2 = !y2 ? y + (token.height * canvas.dimensions.size) : Math.max(y2, y + (token.height * canvas.dimensions.size));
                }

                if (setting("show-chat-log"))
                    x2 += ($("#sidebar").width() / 2);

                // I want 4 squares on either side, with a minimum of 15 squares width
                // I also need to make sure that the entire rectangle is within the screen
                let screenWidth = $('body').width() - (setting("show-chat-log") ? $("#sidebar").width() : 0);
                let ratio = screenWidth / $('body').height();
                let width = Math.max((x2 - x1) + canvas.dimensions.size, (setting("focus-padding") * ratio * canvas.dimensions.size));
                let height = Math.max((y2 - y1) + canvas.dimensions.size, (setting("focus-padding") * canvas.dimensions.size));
                let scaleWidth = screenWidth / width;
                let scaleHeight = $('body').height() / height;
                let panData = { x: x1 + ((x2 - x1) / 2), y: y1 + ((y2 - y1) / 2), animate: true, scale: Math.min(scaleWidth, scaleHeight) };
                if (panData.x != canvas.scene._viewPosition.x || panData.y != canvas.scene._viewPosition.y) {
                    panData.speed = 250 * setting("pan-speed");
                } else {
                    panData.duration = 1000;
                }

                canvas.animatePan(panData);
            }
        }
    }

    static sceneView() {
        if (MonksCommonDisplay.playerdata.display && setting("screen-toggle")) {
            let screenWidth = $('body').width() - (setting("show-chat-log") ? $("#sidebar").width() : 0);
            let scaleWidth = screenWidth / canvas.scene.dimensions.sceneWidth;
            let scaleHeight = $('body').height() / canvas.scene.dimensions.sceneHeight;
            let panData = { x: (canvas.scene.dimensions.width / 2) + (setting("show-chat-log") ? $("#sidebar").width() : 0), y: canvas.scene.dimensions.height / 2, animate: true, speed: 200 * setting("pan-speed"), scale: Math.min(scaleWidth, scaleHeight) };
            canvas.animatePan(panData);
        }
    }

    static focusChanged() {
        if (MonksCommonDisplay.focusValue == "gm" && setting("focus-toggle") && canvas.scene.active) {
            let tokens = game.canvas.tokens.controlled.map(t => t.id);
            MonksCommonDisplay.sendFocusMessage("controlToken", { tokens: tokens, overwrite: true, control: true });
        } else {
            MonksCommonDisplay.sendFocusMessage("changeFocus");
        }
    }

    static changeFocus() {
        if (MonksCommonDisplay.playerdata.display) {
            if (setting("focus-toggle")) {
                // The screen has changed and this is a player display so refresh the screen 
                let focus = MonksCommonDisplay.focusValue;
                let tokens = [];
                if (focus == "gm")
                    tokens = MonksCommonDisplay.gmControlledTokens.filter(t => {
                        let token = canvas.tokens.get(t);
                        if (!token) return false;
                        return token.testUserPermission(game.user, "OBSERVER") && !token.hidden
                    });
                else if (focus == "combat")
                    tokens = [game.combats.active?.combatant?.token._object];
                else
                    tokens = canvas.scene.tokens.filter(t => t.id == focus || t.actor?.id == focus).map(t => t?._object);

                canvas.tokens.releaseAll();
                if (tokens.length) {
                    for (let token of tokens)
                        token.control({ releaseOthers: false });
                }
            } else {
                canvas.tokens.releaseAll();
            }
        }
    }

    static get screenValue() {
        return setting("per-scene") ? foundry.utils.getProperty(canvas.scene, "flags.monks-common-display.screen") : setting("screen");
    }

    static get focusValue() {
        return setting("per-scene") ? foundry.utils.getProperty(canvas.scene, "flags.monks-common-display.focus") : setting("focus");
    }

    static isDefeated(token) {
        return (token && (token.combatant && token.combatant.defeated) || token.actor?.statuses.has(CONFIG.specialStatusEffects.DEFEATED));
    }

    static getTokens(value) {
        if (value == "combat" && game.combats.active && game.combats.active.started && game.combats.active.combatant?.token && !game.combats.active.combatant?.token.hidden) {
            let targets = Array.from(game.user.targets).map(t => t.document);
            return [game.combats.active.combatant?.token, ...targets];
        }

        if (value == "party")
            return canvas.scene.tokens.filter(t => t.testUserPermission(game.user, "LIMITED") && !t.hidden && !MonksCommonDisplay.isDefeated(t));

        let ids = value.split(",").filter(i => /^[a-zA-Z0-9]{16}$/.test(i));
        return canvas.scene.tokens.filter(t => (ids.includes(t.id) || t.actor?.id == value) && !t.hidden);
    }
}

Hooks.on('init', () => {
    MonksCommonDisplay.init();
});

Hooks.on('ready', () => {
    MonksCommonDisplay.ready();
});

Hooks.on("updateCombat", function (combat, delta) {
    if (MonksCommonDisplay.playerdata.display && setting("show-combat")) {
        if (delta.round === 1 && combat.turn === 0 && combat.started === true) {
            //new combat, pop it out
            const tabApp = ui["combat"];
            tabApp.renderPopout(tabApp);

            if (ui.sidebar.activeTab !== "chat")
                ui.sidebar.activateTab("chat");
        }
        if (setting("show-combatants") && setting("limit-shown") > 1) {
            window.setTimeout(function () {
                MonksCommonDisplay.setScrollTop();
            }, 500);
        }
    }
    if (MonksCommonDisplay.toolbar && setting("show-toolbar") && game.user.isGM) {
        MonksCommonDisplay.toolbar.render();
    }
});

Hooks.on("deleteCombat", function (combat) {
    if (MonksCommonDisplay.playerdata.display && game.combats.combats.length == 0 && setting("show-combat")) {
        const tabApp = ui["combat"];
        if (tabApp._popout != undefined) {
            MonksCommonDisplay.closeCount = 0;
            MonksCommonDisplay.closeTimer = setInterval(function () {
                MonksCommonDisplay.closeCount++;
                const tabApp = ui["combat"];
                if (MonksCommonDisplay.closeCount > 100 || tabApp._popout == undefined) {
                    clearInterval(MonksCommonDisplay.closeTimer);
                    return;
                }

                const states = tabApp?._popout.constructor.RENDER_STATES;
                if (![states.CLOSING, states.RENDERING].includes(tabApp?._popout._state)) {
                    tabApp?._popout.close();
                    clearInterval(MonksCommonDisplay.closeTimer);
                }
            }, 100);
        }
    }
    if (MonksCommonDisplay.toolbar && setting("show-toolbar") && game.user.isGM) {
        MonksCommonDisplay.toolbar.render();
    }
});

/*
Hooks.on("getSceneControlButtons", (controls) => {
    if (game.settings.get('monks-common-display', 'show-mirror-tool')) {
        const mirrorPanTool = {
            name: "mirror-screen",
            title: "MonksCommonDisplay.mirror-screen",
            icon: "fas fa-people-arrows",
            toggle: true,
            active: setting('mirror-movement'),
            onClick: MonksCommonDisplay.toggleMirrorScreen
        };
        let tokenTools = controls.find(control => control.name === "token").tools;
        tokenTools.push(mirrorPanTool);
    }
});*/

/*
Hooks.on('getSceneControlButtons', (controls) => {
    controls.push({
        name: 'monkscommondisplay',
        title: "Monks Common Display",
        icon: 'fas fa-chalkboard-teacher',
        toggle: true,
        visible: game.user.isGM,
        active: setting('show-toolbar'),
        tools: [],
        onClick: toggled => {
            game.settings.set('monks-common-display', 'show-toolbar', toggled);
            if (toggled) {
                if (!MonksCommonDisplay.toolbar)
                    MonksCommonDisplay.toolbar = new CommonToolbar().render(true);
            } else {
                if (MonksCommonDisplay.toolbar)
                    MonksCommonDisplay.toolbar.close({ properClose: true });
            }
        }
    });
});
*/

/*
Hooks.on("getSceneControlButtons", (controls) => {
    if (game.user.isGM) {
        let tokenControls = controls.find(control => control.name === "token")
        tokenControls.tools.push({
            name: "monkscommondisplay",
            title: "Toggle Common Display Bar",
            icon: "fas fa-chalkboard-teacher",
            toggle: true,
            visible: game.user.isGM,
            active: setting('show-toolbar'),
            onClick: toggled => {
                game.settings.set('monks-common-display', 'show-toolbar', toggled);
                if (toggled) {
                    if (!MonksCommonDisplay.toolbar)
                        MonksCommonDisplay.toolbar = new CommonToolbar().render(true);
                } else {
                    if (MonksCommonDisplay.toolbar)
                        MonksCommonDisplay.toolbar.close({ properClose: true });
                }
            }
        });
    }
});*/

Hooks.on('renderPlayerList', async (playerList, html, data) => {
    let playerdata = setting('playerdata');

    const styles = `flex:0 0 17px;width:17px;height:16px;border:0`;
    const title = "This player is a common display";
    const i = `<i style="${styles}" class="fas fa-presentation-screen" title="${title}"></i>`;

    game.users.forEach((user) => {
        let data = playerdata[user.id] || {};
        if (data.display) {
            html.find(`[data-user-id="${user.id}"]`).append(i);
        }
    });
});

Hooks.on('renderSceneControls', (control, html, data) => {
    if (game.user.isGM) {
        const name = 'monkscommondisplay';
        const title = "Toggle Common Display Bar";
        const icon = 'fas fa-chalkboard-teacher';
        const active = setting('show-toolbar');
        const btn = $(`<li class="common-display toggle ${game.modules.get("minimal-ui")?.active ? "minimal " : ""}${active ? 'active' : ''}" title="${title}" data-tool="${name}"><i class="${icon}"></i></li>`);
        btn.on('click', () => {
            let toggled = !setting("show-toolbar");
            game.settings.set('monks-common-display', 'show-toolbar', toggled);
            if (toggled) {
                if (!MonksCommonDisplay.toolbar)
                    MonksCommonDisplay.toolbar = new CommonToolbar().render(true);
                else
                    MonksCommonDisplay.toolbar.render(true);
            } else {
                if (MonksCommonDisplay.toolbar)
                    MonksCommonDisplay.toolbar.close({ properClose: true });
            }
            $('.main-controls .common-display', html).toggleClass("active", toggled);
        });
        html.find('.main-controls').append(btn);
    }
});

Hooks.on("controlToken", async (token, control) => {
    let focus = MonksCommonDisplay.focusValue;

    if (focus == "gm" && game.user.isGM && setting("focus-toggle")) {
        MonksCommonDisplay.sendFocusMessage("controlToken", { tokens: [token.id], control });
    }

    let display = MonksCommonDisplay.playerdata.display || false;
    if (display && setting("focus-toggle")) {
        // double-check that this is the token that should be focussed
        let shouldControl = (focus == "gm" && MonksCommonDisplay.gmControlledTokens.has(token.id)) ||
            (focus == "combat" && game.combats.active && game.combats.active.combatant?.token.id == token.id) || 
            (focus == token.id || focus == token.actor?.id);
        if (control != shouldControl) {
            if (shouldControl)
                token.control({ releaseOthers: false });
            else
                token.release();
        }
    }
    else if (setting("screen-toggle") && MonksCommonDisplay.screenValue != ("gm" || "scene") && setting("control-follow"))
    {
        let shouldMirror = token.actor.type == "character" ||
            token.actor.token?.disposition == foundry.CONST.TOKEN_DISPOSITIONS.FRIENDLY ||
            token.actor.prototypeToken?.disposition == foundry.CONST.TOKEN_DISPOSITIONS.FRIENDLY;

        if (game.user.isGM && MonksCommonDisplay.toolbar && shouldMirror) {

            if(!control && canvas.tokens.controlled.length > 0)
                return;

            let tokenids = control ? canvas.tokens.controlled.map((t) => t.id).join(",") : "screen";

            MonksCommonDisplay.selectToken = tokenids;

            if (setting("per-scene"))
                await canvas.scene.setFlag("monks-common-display", "screen", tokenids);
            else
                await game.settings.set("monks-common-display", "screen", tokenids);

            MonksCommonDisplay.screenChanged();
            MonksCommonDisplay.toolbar.render(true);
            
            MonksCommonDisplay.selectToken = null;
        }
    }
});

Hooks.on("updateToken", async function (document, data, options, userid) {
    /*
    if (game.user.isGM && MonksCommonDisplay.toolbar) {
        let tkn = MonksCommonDisplay.toolbar.tokens.find(t => t.token.id == document.id);
        if (tkn) {
            this.updateToken(tkn, options.ignoreRefresh !== true);
        }
    }*/

    //+++ only if this is a selected token and the texture src is changing
    if (MonksCommonDisplay.toolbar && setting("show-toolbar") && game.user.isGM)
        MonksCommonDisplay.toolbar.render(true);

    let display = MonksCommonDisplay.playerdata.display || false;
    log("updateToken", display, data, setting("screen-toggle"), document.hidden);
    if (display &&
        (data.x != undefined || data.y != undefined) &&
        setting("screen-toggle") &&
        !document.hidden) {

        document._mcd_x = data.x ?? document.x;
        document._mcd_y = data.y ?? document.y;
        MonksCommonDisplay.changeScreen();
    }
});

Hooks.on("deleteToken", () => {
    if (MonksCommonDisplay.toolbar && setting("show-toolbar") && game.user.isGM)
        MonksCommonDisplay.toolbar.render(true);
});

Hooks.on("updateCombat", async function (combat, delta) {
    let display = MonksCommonDisplay.playerdata.display || false;
    if (display &&
        combat.started &&
        combat.active &&
        combat.combatant?.token &&
        !combat.combatant.token.hidden)
    {
        if (setting("screen-toggle") && MonksCommonDisplay.screenValue == "combat") {
            MonksCommonDisplay.changeScreen();
        }

        if (setting("focus-toggle") &&
            MonksCommonDisplay.focusValue == "combat" &&
            combat.combatant?.token.isOwner)
        {
            combat.combatant?.token?._object?.control({ releaseOthers: true });
        }
    }
});

Hooks.on("targetToken", async function (user, token, targeted) {
    if (game.combats.viewed?.started &&
        game.combats.viewed?.active &&
        MonksCommonDisplay.screenValue == "combat")
    {
        window.setTimeout(() => {
            MonksCommonDisplay.changeScreen();
        }, 100);
    }
});
