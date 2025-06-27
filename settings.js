import { MonksCommonDisplay, i18n, setting } from "./monks-common-display.js";
import { ControllerApp } from "./apps/controller.js"

export const registerSettings = function () {
	// Register any custom module settings here
	let modulename = "monks-common-display";

	game.settings.registerMenu(modulename, 'configure', {
		name: 'Configure Common Display',
		label: 'Configure Common Display',
		hint: 'Configure what player is used for the common display.',
		icon: 'fas fa-chalkboard-teacher',
		restricted: true,
		type: ControllerApp,
		onClick: (value) => {
			log('Reset position');
		}
	});

	game.settings.register(modulename, "per-scene", {
		name: i18n("MonksCommonDisplay.per-scene.name"),
		hint: i18n("MonksCommonDisplay.per-scene.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean,
		onChange: () => {
			if (MonksCommonDisplay.toolbar && setting("show-toolbar") && game.user.isGM) {
				MonksCommonDisplay.toolbar.render();
			}
			MonksCommonDisplay.screenChanged();
			MonksCommonDisplay.focusChanged();
		}
	});

	game.settings.register(modulename, "hide-ui", {
		name: i18n("MonksCommonDisplay.hide-ui.name"),
		hint: i18n("MonksCommonDisplay.hide-ui.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
		onChange: () => {
			MonksCommonDisplay.toggleCommonDisplay();
		}
	});

	game.settings.register(modulename, "allow-gm-players", {
		name: i18n("MonksCommonDisplay.allow-gm-players.name"),
		hint: i18n("MonksCommonDisplay.allow-gm-players.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean
	});

	game.settings.register(modulename, "close-image-on-close", {
		name: i18n("MonksCommonDisplay.close-image-on-close.name"),
		hint: i18n("MonksCommonDisplay.close-image-on-close.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean
	});

	game.settings.register(modulename, "just-friendly", {
		name: i18n("MonksCommonDisplay.just-friendly.name"),
		hint: i18n("MonksCommonDisplay.just-friendly.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
		onChange: () => {
			if (MonksCommonDisplay.toolbar && setting("show-toolbar") && game.user.isGM) {
				MonksCommonDisplay.toolbar.render();
			}
			if (setting("screen") == "controlled")
				MonksCommonDisplay.screenChanged();
			if (setting("focus") == "controlled")
				MonksCommonDisplay.focusChanged();
		}
	});

	game.settings.register(modulename, "focus-padding", {
		name: i18n("MonksCommonDisplay.focus-padding.name"),
		hint: i18n("MonksCommonDisplay.focus-padding.hint"),
		scope: "world",
		config: true,
		range: {
			min: 1,
			max: 30,
			step: 1,
		},
		default: 10,
		type: Number,
		onChange: () => {
			MonksCommonDisplay.screenChanged();
		}
	});

	game.settings.register(modulename, "pan-speed", {
		name: i18n("MonksCommonDisplay.pan-speed.name"),
		hint: i18n("MonksCommonDisplay.pan-speed.hint"),
		scope: "world",
		config: true,
		range: {
			min: 50,
			max: 5000,
			step: 10,
		},
		default: 250,
		type: Number
	});

	game.settings.register(modulename, "show-chat-log", {
		name: i18n("MonksCommonDisplay.show-chat-log.name"),
		hint: i18n("MonksCommonDisplay.show-chat-log.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
		onChange: () => {
			MonksCommonDisplay.toggleCommonDisplay();
		}
	});
	game.settings.register(modulename, "expand-chat-log", {
		name: i18n("MonksCommonDisplay.expand-chat-log.name"),
		hint: i18n("MonksCommonDisplay.expand-chat-log.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
		onChange: () => {
			MonksCommonDisplay.toggleCommonDisplay();
		}
	});
	game.settings.register(modulename, "show-camera-views", {
		name: i18n("MonksCommonDisplay.show-camera-views.name"),
		hint: i18n("MonksCommonDisplay.show-camera-views.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean,
		onChange: () => {
			MonksCommonDisplay.toggleCommonDisplay();
		}
	});
	game.settings.register(modulename, "show-combat", {
		name: i18n("MonksCommonDisplay.show-combat.name"),
		hint: i18n("MonksCommonDisplay.show-combat.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
		onChange: () => {
			MonksCommonDisplay.toggleCommonDisplay();
		}
	});

	game.settings.register(modulename, "limit-shown", {
		name: i18n("MonksCommonDisplay.limit-shown.name"),
		scope: "world",
		config: true,
		range: {
			min: 1,
			max: 10,
			step: 1,
		},
		default: 1,
		type: Number,
		onChange: () => {
			MonksCommonDisplay.toggleCommonDisplay();
		}
	});

	/*
	game.settings.register(modulename, "combat-scale", {
		name: i18n("MonksCommonDisplay.combat-scale.name"),
		hint: i18n("MonksCommonDisplay.combat-scale.hint"),
		scope: "world",
		config: true,
		range: {
			min: 0.1,
			max: 5,
			step: 0.1,
		},
		default: 1,
		type: Number,
		onChange: () => {
			MonksCommonDisplay.toggleCommonDisplay();
		}
	});
	*/

	game.settings.register(modulename, "close-after", {
		name: i18n("MonksCommonDisplay.close-after.name"),
		hint: i18n("MonksCommonDisplay.close-after.hint"),
		scope: "world",
		config: true,
		range: {
			min: 0,
			max: 60,
			step: 1,
		},
		default: 10,
		type: Number
	});

	game.settings.register(modulename, "startupdata", {
		scope: "client",
		config: false,
		default: false,
		type: Boolean,
	});

	game.settings.register(modulename, "playerdata", {
		scope: "world",
		config: false,
		default: {},
		type: Object,
	});

	game.settings.register(modulename, "show-toolbar", {
		scope: "client",
		config: false,
		default: false,
		type: Boolean,
	});

	game.settings.register(modulename, "screen", {
		scope: "world",
		config: false,
		default: "gm",
		type: String,
	});

	game.settings.register(modulename, "focus", {
		scope: "world",
		config: false,
		default: "gm",
		type: String,
	});

	game.settings.register(modulename, "screen-toggle", {
		scope: "world",
		config: false,
		default: false,
		type: Boolean,
	});

	game.settings.register(modulename, "focus-toggle", {
		scope: "world",
		config: false,
		default: false,
		type: Boolean,
	});
};
