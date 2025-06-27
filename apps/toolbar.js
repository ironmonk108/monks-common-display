import { MonksCommonDisplay, log, i18n, setting } from "../monks-common-display.js";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export class CommonToolbar extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(options = {}) {
        super(options);

        this.tokens = [];
        this.thumbnails = {};
        this._collapsed = false;

        Hooks.on('canvasReady', () => {
            if (setting("show-toolbar"))
                this.render(true);
        });

        Hooks.on("updateCombat", () => {
            if (setting("show-toolbar"))
                this.render(true);
        });
    }

    static DEFAULT_OPTIONS = {
        id: "common-display-toolbar",
        tag: "div",
        classes: [],
        window: {
            contentClasses: ["flexrow"],
            icon: "fa-solid fa-chalkboard-teacher",
            resizable: false,
        },
        actions: {
            clearJournal: CommonToolbar.clearJournals,
            clearImage: CommonToolbar.clearImage,
            toggleScreen: CommonToolbar.toggleScreen,
            toggleFocus: CommonToolbar.toggleFocus,
        },
        position: {
            height: 95,
            width: 'auto',
        }
    };

    static PARTS = {
        main: {
            root: true,
            template: "modules/monks-common-display/templates/toolbar.html",
        }
    };

    persistPosition = foundry.utils.debounce(this.onPersistPosition.bind(this), 1000);

    onPersistPosition(position) {
        game.user.setFlag("monks-common-display", "position", { left: position.left, top: position.top });
    }

    async _onFirstRender(context, options) {
        await super._onFirstRender(context, options);
        this._createContextMenus(this.element);
    }

    async _prepareContext(options) {
        const context = await super._prepareContext(options);

        let css = [
            !game.user.isGM ? "hidectrl" : null
        ].filter(c => !!c).join(" ");
        let pos = this.getPos();

        let screen = (setting("per-scene") ? foundry.utils.getProperty(canvas.scene, "flags.monks-common-display.screen") : setting("screen")) || "gm";
        let focus = (setting("per-scene") ? foundry.utils.getProperty(canvas.scene, "flags.monks-common-display.focus") : setting("focus")) || "gm";

        return foundry.utils.mergeObject(context, {
            tokens: this.tokens,
            cssClass: css,
            screen: {
                icon: this.getIcon(screen, "screen"),
                img: this.getImage(screen, "screen"),
                tooltip: this.getTooltip(screen, "screen"),
                active: setting("screen-toggle")
            },
            focus: {
                icon: this.getIcon(focus, "focus"),
                img: this.getImage(focus, "focus"),
                tooltip: this.getTooltip(focus, "focus"),
                active: setting("focus-toggle")
            },
            pos: pos,
        });
    }

    getIcon(id, type) {
        if (MonksCommonDisplay.selectToken == type)
            return "fa-bullseye";

        if (id == "combat") // && game.combats.active)
            return "fa-swords";
        else if (id == "gm" || !id)
            return "fa-people-arrows";
        else if (id == "party")
            return "fa-users-viewfinder";
        else if (id == "controlled")
            return "fa-street-view";
        else if (id == "scene")
            return "fa-presentation-screen";

        return "fa-users";
    }

    getImage(id, type) {
        if (MonksCommonDisplay.selectToken == type)
            return null;

        if (id != "combat" && id != "gm") {
            //try and find the image of the token
            if (id.indexOf(",") > -1)
                return null;

            let token = canvas.scene.tokens.find(t => t.id == id || t.actor?.id == id);
            if (token)
                return token.texture.src;
        }
        return null;
    }

    getTooltip(id, type) {
        if (MonksCommonDisplay.selectToken == type)
            return "Selecting an Actor";

        if (id == "combat") // && game.combats.active)
            return i18n("MonksCommonDisplay.Combatant");
        else if (id == "gm" || !id)
            return i18n("MonksCommonDisplay.GM");
        else if (id == "party")
            return i18n("MonksCommonDisplay.Party");
        else if (id == "controlled")
            return i18n("MonksCommonDisplay.Controlled");
        else if (id == "scene")
            return i18n("MonksCommonDisplay.FullScene");

        if (id.indexOf(",") > -1)
            return null;

        let token = canvas.scene.tokens.find(t => t.id == id || t.actor?.id == id);
        if (token)
            return token.name;

        return "";
    }

    getPos() {
        this.pos = game.user.getFlag("monks-common-display", "position");

        if (this.pos == undefined) {
            this.pos = {
                top: 60,
                left: 120
            };
            game.user.setFlag("monks-common-display", "position", this.pos);
        }

        let result = '';
        if (this.pos != undefined) {
            result = Object.entries(this.pos).filter(k => {
                return k[1] != null;
            }).map(k => {
                return k[0] + ":" + k[1] + 'px';
            }).join('; ');
        }

        return result;
    }

    setPosition(position) {
        position = super.setPosition(position);
        this.persistPosition(position);
        return position;
    }

    static clearJournals() {
        MonksCommonDisplay.emit("closeJournals");
    }

    static clearImage() {
        MonksCommonDisplay.emit("closeImagePopout");
    }

    static async toggleScreen() {
        if (!!MonksCommonDisplay.selectToken) {
            let tokenids = canvas.tokens.controlled.map((t) => t.id).join(",");
            if (setting("per-scene")) {
                await canvas.scene.setFlag("monks-common-display", MonksCommonDisplay.selectToken, tokenids);
                foundry.utils.setProperty(canvas.scene, `flags.monks-common-display.${MonksCommonDisplay.selectToken}`, tokenids);
            } else {
                await game.settings.set("monks-common-display", MonksCommonDisplay.selectToken, tokenids);
            }
            if (MonksCommonDisplay.selectToken == "screen") MonksCommonDisplay.screenChanged(); else MonksCommonDisplay.focusChanged();

            MonksCommonDisplay.selectToken = null;
        } else {
            let active = !setting("screen-toggle");
            await game.settings.set("monks-common-display", "screen-toggle", active);
            if (active) {
                MonksCommonDisplay.screenChanged();
            }
        }
        this.render();
    }

    static async toggleFocus() {
        let active = !setting("focus-toggle");
        await game.settings.set("monks-common-display", "focus-toggle", active);
        MonksCommonDisplay.focusChanged();
        this.render();
    }

    _createContextMenus() {
        this._createContextMenu(this._getContextOptions, ".common-button-group", {
            fixed: true,
            hookName: "getCommonDisplayContextOptions",
            parentClassHooks: false
        });
        this._createContextMenu(this._getContextOptions, ".common-button-group .header", {
            fixed: true,
            hookName: "getCommonDisplayContextOptions",
            parentClassHooks: false,
            eventName: "click",
        });
    }

    _getContextOptions() {
        return [
            {
                name: i18n("MonksCommonDisplay.GM"),
                icon: '<i class="fas fa-user"></i>',
                condition: (btn) => {
                    return game.user.isGM && btn.closest(".common-button-group").dataset.group == "screen"
                },
                callback: async (btn) => {
                    let group = btn.closest(".common-button-group").dataset.group;
                    MonksCommonDisplay.selectToken = null;
                    if (setting("per-scene"))
                        await canvas.scene.setFlag("monks-common-display", group, "gm");
                    else
                        await game.settings.set("monks-common-display", group, "gm");
                    if (group == "screen") MonksCommonDisplay.screenChanged(); else MonksCommonDisplay.focusChanged();
                    this.render(true);
                }
            },
            {
                name: i18n("MonksCommonDisplay.Controlled"),
                icon: '<i class="fas fa-street-view"></i>',
                condition: game.user.isGM,
                callback: async (btn) => {
                    let group = btn.closest(".common-button-group").dataset.group;
                    MonksCommonDisplay.selectToken = null;
                    if (setting("per-scene"))
                        await canvas.scene.setFlag("monks-common-display", group, "controlled");
                    else
                        await game.settings.set("monks-common-display", group, "controlled");
                    if (group == "screen") MonksCommonDisplay.screenChanged(); else MonksCommonDisplay.focusChanged();
                    this.render(true);
                }
            },
            {
                name: i18n("MonksCommonDisplay.FullScene"),
                icon: '<i class="fas fa-presentation-screen"></i>',
                condition: (btn) => {
                    return game.user.isGM && btn.closest(".common-button-group").dataset.group == "screen";
                },
                callback: async (btn) => {
                    let group = btn.closest(".common-button-group").dataset.group;
                    MonksCommonDisplay.selectToken = null;
                    if (setting("per-scene"))
                        await canvas.scene.setFlag("monks-common-display", group, "scene");
                    else
                        await game.settings.set("monks-common-display", group, "scene");
                    if (group == "screen") MonksCommonDisplay.screenChanged(); else MonksCommonDisplay.focusChanged();
                    this.render(true);
                }
            },
            {
                name: i18n("MonksCommonDisplay.Combatant"),
                icon: '<i class="fas fa-swords"></i>',
                condition: game.user.isGM,
                callback: async (btn) => {
                    let group = btn.closest(".common-button-group").dataset.group;
                    MonksCommonDisplay.selectToken = null;
                    if (setting("per-scene"))
                        await canvas.scene.setFlag("monks-common-display", group, "combat");
                    else
                        await game.settings.set("monks-common-display", group, "combat");
                    if (group == "screen") MonksCommonDisplay.screenChanged(); else MonksCommonDisplay.focusChanged();
                    this.render(true);
                }
            },
            {
                name: i18n("MonksCommonDisplay.Party"),
                icon: '<i class="fas fa-users-viewfinder"></i>',
                condition: (btn) => {
                    return game.user.isGM && btn.closest(".common-button-group").dataset.group == "screen";
                },
                callback: async (btn) => {
                    let group = btn.closest(".common-button-group").dataset.group;
                    MonksCommonDisplay.selectToken = null;
                    if (setting("per-scene"))
                        await canvas.scene.setFlag("monks-common-display", group, "party");
                    else
                        await game.settings.set("monks-common-display", group, "party");
                    if (group == "screen") MonksCommonDisplay.screenChanged(); else MonksCommonDisplay.focusChanged();
                    this.render(true);
                }
            },
            {
                name: i18n("MonksCommonDisplay.SelectTokens"),
                icon: '<i class="fas fa-bullseye"></i>',
                condition: game.user.isGM,
                callback: btn => {
                    let group = btn.closest(".common-button-group").dataset.group;
                    MonksCommonDisplay.selectToken = (!!MonksCommonDisplay.selectToken ? null : group);
                    this.render(true);
                }
            }
        ];
    }

    async updateToken(tkn, refresh = true) {
        let diff = {};

        if (tkn.img != (tkn.token.actor.img || tkn.token.texture.src)) {
            diff.img = (tkn.token.actor.img || tkn.token.texture.src);
            let thumb = this.thumbnails[diff.img];
            if (!thumb) {
                try {
                    thumb = await ImageHelper.createThumbnail(diff.img, { width: 50, height: 50 });
                    this.thumbnails[diff.img] = (thumb?.thumb || thumb);
                } catch {
                    thumb = 'icons/svg/mystery-man.svg';
                }
            }

            diff.thumb = (thumb?.thumb || thumb);
        }

        if (Object.keys(diff).length > 0) {
            foundry.utils.mergeObject(tkn, diff);
            if (refresh)
                this.render();
        }
    }
}