import { MonksCommonDisplay, log, i18n, setting } from "../monks-common-display.js";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export class PlayerInterface extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(options = {}) {
        super(options);

        this.selected = game.user?.character;
    }

    static DEFAULT_OPTIONS = {
        id: "player-display",
        tag: "form",
        classes: [],
        window: {
            contentClasses: ["standard-form"],
            icon: "fa-solid fa-align-justify",
            resizable: false,
            title: "",
        },
        actions: {
        },
        form: {
            closeOnSubmit: true,
        },
        position: {
            width: 400,
            height: 400,
        }
    };

    static PARTS = {
        tabs: { template: "templates/generic/tab-navigation.hbs" },
        direction: { template: "modules/monks-little-details/templates/direction-tab.hbs" },
        information: { template: "modules/monks-little-details/templates/information-tab.hbs" },
    };

    static TABS = {
        sheet: {
            tabs: [
                { id: "direction", icon: "fa-solid fa-cubes" },
                { id: "information", icon: "fa-solid fa-list" },
            ],
            initial: "direction",
            labelPrefix: "MonksCommonDisplay.PLAYER.TABS"
        }
    };

    async _prepareContext(options) {
        const context = await super._prepareContext(options);

        context.actors = this.actors = game.actors
            .filter(a => a.testUserPermission(game.user, "OWNER"))
            .map(a => ({ id: a.id, name: a.name, img: a.img }))
            .sort((a, b) => { return (a.id == game.user?.character?.id ? -1 : (b.id == game.user?.character?.id ? 1 : 0)) });   // user character first, player characters second, npcs third, and sort by name

        if (!this.selected)
            this.selected = data.actors[0];

        context.selected = this.selected

        return context;
    }

    async _render(...args) {
        await super._render(...args);

        $('#chat').appendTo($('.player-content .chat-container', this.element));
    }

    activateListeners(html) {
        super.activateListeners(html);

        $('.character-icon', html).on("click", this.changeActor.bind(this));

        $('.player-direction', html).on("click", this.moveActor.bind(this));
    };

    changeActor(evt) {
        let id = evt.currentTarget.data["id"];
        this.selected = this.actors.find(a => a.id == id);
        this.render();
    }

    moveActor(evt) {
        //get the current scene
        let scene = game.scenes.active;
        let tokens = scene.data.tokens.filter(t => t.actor.id == this.selected.id);
        for (let token of tokens) {
            token.update({ x: token.data.x + scene.data.size });
        }
    }
}