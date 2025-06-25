import { MonksCommonDisplay, log, i18n, setting } from '../monks-common-display.js';

export class ControllerApp extends FormApplication {
  constructor(options = {}) {
    super(options);
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'monkscommondisplay',
      title: 'Monks Common Display',
      template: './modules/monks-common-display/templates/controller.html',
      width: 400,
      height: 'auto',
      popOut: true,
    });
  }

  getData(options) {
    let playerdata = setting('playerdata');
    let players = game.users
      .filter((u) => (setting('allow-gm-players') ? u.id != game.user.id && u.role < CONST.USER_ROLES.GAMEMASTER : !u.isGM))
      .map((u) => {
        let data = playerdata[u.id] || {};
        return foundry.utils.mergeObject(
          {
            id: u.id,
            name: u.name,
            img: u.avatar,
            display: false,
            mirror: false,
            selection: false,
          },
          data
        );
      });

    return {
      players: players,
    };
  }

  saveData() {
    let playerdata = setting('playerdata');
    $('.item-list .item', this.element).each(function () {
      let id = this.dataset.itemId;
      let data = playerdata[id] || {};

      data.display = $('.display', this).is(':checked');

      playerdata[id] = data;
    });

    game.settings.set('monks-common-display', 'playerdata', playerdata).then(() => {
      MonksCommonDisplay.emit('dataChange');
    });

    this.close();
  }

  activateListeners(html) {
    super.activateListeners(html);
    var that = this;

    $('.dialog-buttons.save', html).click($.proxy(this.saveData, this));
  }
}
