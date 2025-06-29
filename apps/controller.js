import { MonksCommonDisplay, log, i18n, setting } from "../monks-common-display.js";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export class ControllerApp extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(options = {}) {
        super(options);
    }

    static DEFAULT_OPTIONS = {
        id: "configure-common-display",
        tag: "form",
        window: {
            contentClasses: ["standard-form", "player-list"],
            icon: "fa-solid fa-chalkboard-teacher",
            resizable: false,
            title: "MonksCommonDisplay.MonksCommonDisplay",
        },
        form: {
            closeOnSubmit: true,
            handler: ControllerApp.onSubmitDocumentForm
        },
        position: {
            width: 400
        }
    };

    static PARTS = {
        main: {
            root: true,
            template: "modules/monks-common-display/templates/controller.html",
        }
    };

    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        let playerdata = setting('playerdata');
        let players = game.users.filter(u =>
            (setting('allow-gm-players') ? u.id != game.user.id && u.role < CONST.USER_ROLES.GAMEMASTER : !u.isGM))
            .map(u => {
                let data = playerdata[u.id] || {};
                return foundry.utils.mergeObject({
                    id: u.id,
                    name: u.name,
                    display: false,
                    mirror: false,
                    selection: false
                }, data);
            });

        context.players = players;

        return context;
    }

    static async onSubmitDocumentForm(event, form, formData, options = {}) {
        let playerdata = setting('playerdata');
        let data = foundry.utils.expandObject(formData.object);
        for (let [key, value] of Object.entries(data)) {
            let player = playerdata[key] || {};
            player.display = value.display || false;
            playerdata[key] = player;
        };

        game.settings.set('monks-common-display', 'playerdata', playerdata).then(() => {
            MonksCommonDisplay.emit("dataChange");
        });

        this.submitting = true;
    }
}