import {
  MonksCommonDisplay,
  log,
  i18n,
  setting,
} from "../monks-common-display.js";

export class PlayerInterface extends Application {
  constructor(options = {}) {
    super(options);

    this.selected = game.user?.character;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "player-display",
      title: "",
      template:
        "./modules/monks-common-display/templates/player-interface.html",
      tabs: [
        {
          navSelector: ".tabs",
          contentSelector: ".player-interface",
          initial: "direction",
        },
      ],
      width: 400,
      height: 400,
      popOut: true,
    });
  }

  getData(options) {
    let data = super.getData(options);

    data.actors = this.actors = game.actors
      .filter((a) => a.testUserPermission(game.user, "OWNER"))
      .map((a) => ({ id: a.id, name: a.name, img: a.img }))
      .sort((a, b) => {
        return a.id == game.user?.character?.id
          ? -1
          : b.id == game.user?.character?.id
            ? 1
            : 0;
      }); // user character first, player characters second, npcs third, and sort by name

    if (!this.selected) this.selected = data.actors[0];

    data.selected = this.selected;

    return data;
  }

  async _render(...args) {
    await super._render(...args);

    $("#chat").appendTo($(".player-content .chat-container", this.element));
  }

  activateListeners(html) {
    super.activateListeners(html);

    $(".character-icon", html).on("click", this.changeActor.bind(this));

    $(".player-direction", html).on("click", this.moveActor.bind(this));
  }

  changeActor(evt) {
    let id = evt.currentTarget.data["id"];
    this.selected = this.actors.find((a) => a.id == id);
    this.render();
  }

  moveActor(evt) {
    //get the current scene
    let scene = game.scenes.active;
    let tokens = scene.data.tokens.filter(
      (t) => t.actor.id == this.selected.id,
    );
    for (let token of tokens) {
      token.update({ x: token.data.x + scene.data.size });
    }
  }
}
