import { MonksCommonDisplay, log, error, i18n, setting } from "../monks-common-display.js";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export class ResetPosition extends HandlebarsApplicationMixin(ApplicationV2) {

    static DEFAULT_OPTIONS = {
        id: "common-display-resetposition",
        tag: "div",
        sheetConfig: false,
        position: { width: 1, height: 1 },
    };

    static PARTS = {
        form: {
            template: "modules/monks-common-display/templates/resetposition.html"
        }
    };

    static async resetPosition(app) {
        await game.user.unsetFlag("monks-common-display", "position");
        MonksCommonDisplay.emit("positionReset");
        if (MonksCommonDisplay.toolbar != undefined)
            MonksCommonDisplay.toolbar.render(true);
        app.close({ force: true });
    }
}

Hooks.on("renderResetPosition", ResetPosition.resetPosition);