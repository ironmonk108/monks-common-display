import { MonksCommonDisplay, log, i18n, setting } from '../monks-common-display.js';

export class CommonToolbar extends Application {
  constructor(options = {}) {
    super(options);

    this.tokens = [];
    this.thumbnails = {};
    this._collapsed = false;

    Hooks.on('canvasReady', () => {
      if (setting('show-toolbar')) this.render(true);
    });

    Hooks.on('updateCombat', () => {
      if (setting('show-toolbar')) this.render(true);
    });
  }

  static get defaultOptions() {
    let options = foundry.utils.mergeObject(super.defaultOptions, {
      id: 'common-toolbar',
      template: './modules/monks-common-display/templates/toolbar.html',
      width: 'auto',
      height: 95,
      popOut: false,
    });
    return options;
  }

  async getData(options) {
    let data = super.getData(options);

    let css = [!game.user.isGM ? 'hidectrl' : null, setting('show-vertical') ? 'vertical' : null].filter((c) => !!c).join(' ');
    let pos = this.getPos();

    let collapseIcon;
    if (setting('show-vertical')) collapseIcon = this._collapsed ? 'fa-caret-down' : 'fa-caret-up';
    else collapseIcon = this._collapsed ? 'fa-caret-right' : 'fa-caret-left';

    let screen = (setting('per-scene') ? foundry.utils.getProperty(canvas.scene, 'flags.monks-common-display.screen') : setting('screen')) || 'gm';
    let focus = (setting('per-scene') ? foundry.utils.getProperty(canvas.scene, 'flags.monks-common-display.focus') : setting('focus')) || 'gm';

    return foundry.utils.mergeObject(super.getData(options), {
      tokens: this.tokens,
      cssClass: css,
      screen: {
        icon: this.getIcon(screen, 'screen'),
        img: this.getImage(screen, 'screen'),
        tooltip: this.getTooltip(screen, 'screen'),
        active: setting('screen-toggle'),
      },
      focus: {
        icon: this.getIcon(focus, 'focus'),
        img: this.getImage(focus, 'focus'),
        tooltip: this.getTooltip(focus, 'focus'),
        active: setting('focus-toggle'),
      },
      //inCombat: game.combats.active?.started,
      pos: pos,
      collapsed: this._collapsed,
      collapseIcon: collapseIcon,
    });

    return data;
  }

  getIcon(id, type) {
    if (MonksCommonDisplay.selectToken == type) return 'fa-bullseye';

    if (id == 'combat')
      // && game.combats.active)
      return 'fa-swords';
    else if (id == 'gm' || !id) return 'fa-people-arrows';
    else if (id == 'party') return 'fa-users-viewfinder';
    else if (id == 'scene') return 'fa-presentation-screen';

    return 'fa-users';
  }

  getImage(id, type) {
    if (MonksCommonDisplay.selectToken == type) return null;

    if (id != 'combat' && id != 'gm') {
      //try and find the image of the token
      if (id.indexOf(',') > -1) return null;

      let token = canvas.scene.tokens.find((t) => t.id == id || t.actor?.id == id);
      if (token) return token.texture.src;
    }
    return null;
  }

  getTooltip(id, type) {
    if (MonksCommonDisplay.selectToken == type) return 'Selecting an Actor';

    if (id == 'combat')
      // && game.combats.active)
      return 'Combatant';
    else if (id == 'gm' || !id) return 'GM';
    else if (id == 'party') return 'Party';
    else if (id == 'scene') return 'Full screen';

    if (id.indexOf(',') > -1) return null;

    let token = canvas.scene.tokens.find((t) => t.id == id || t.actor?.id == id);
    if (token) return token.name;

    return '';
  }

  getPos() {
    this.pos = game.user.getFlag('monks-common-display', 'position');

    if (this.pos == undefined) {
      this.pos = {
        top: 60,
        left: 120,
      };
      game.user.setFlag('monks-common-display', 'position', this.pos);
    }

    let result = '';
    if (this.pos != undefined) {
      result = Object.entries(this.pos)
        .filter((k) => {
          return k[1] != null;
        })
        .map((k) => {
          return k[0] + ':' + k[1] + 'px';
        })
        .join('; ');
    }

    return result;
  }

  setPos() {
    this.pos = game.user.getFlag('monks-common-display', 'position');

    if (this.pos == undefined) {
      this.pos = {
        top: 60,
        left: $('#board').width / 2 - 150,
      };
      game.user.setFlag('monks-common-display', 'position', this.pos);
    }

    log('Setting position', this.pos, this.element);
    $(this.element).css(this.pos);

    return this;
  }

  activateListeners(html) {
    //$('.toggle-collapse', html).on("click", this.toggleCollapse.bind(this));

    $('.common-display-button[data-action="clear-journal"]', html).on('click', () => {
      MonksCommonDisplay.emit('closeJournals');
    });
    $('.common-display-button[data-action="clear-image"]', html).on('click', () => {
      MonksCommonDisplay.emit('closeImagePopout');
    });

    $('.common-display-button.screen', html).on('click', async (event) => {
      if (!!MonksCommonDisplay.selectToken) {
        let tokenids = canvas.tokens.controlled.map((t) => t.id).join(',');
        if (setting('per-scene')) {
          await canvas.scene.setFlag('monks-common-display', MonksCommonDisplay.selectToken, tokenids);
          foundry.utils.setProperty(canvas.scene, `flags.monks-common-display.${MonksCommonDisplay.selectToken}`, tokenids);
        } else {
          await game.settings.set('monks-common-display', MonksCommonDisplay.selectToken, tokenids);
        }
        if (MonksCommonDisplay.selectToken == 'screen') MonksCommonDisplay.screenChanged();
        else MonksCommonDisplay.focusChanged();

        MonksCommonDisplay.selectToken = null;
      } else {
        let active = !setting('screen-toggle');
        await game.settings.set('monks-common-display', 'screen-toggle', active);
        if (active) {
          MonksCommonDisplay.screenChanged();
        }
      }
      this.render();
    });
    $('.common-display-button.focus', html).on('click', async (event) => {
      let active = !setting('focus-toggle');
      await game.settings.set('monks-common-display', 'focus-toggle', active);
      MonksCommonDisplay.focusChanged();
      this.render();
    });

    /*
        $('.header.screen', html).on("click", async (event) => {
            event.preventDefault();
            event.stopPropagation();
            $(event.currentTarget).closest(".common-button-group").get(0).dispatchEvent(new Event("contextmenu"));
        });
        $('.header.focus', html).on("click", async (event) => {
            event.preventDefault();
            event.stopPropagation();
            $(event.currentTarget).closest(".common-button-group").get(0).dispatchEvent(new Event("contextmenu"));
        });
        */

    this._contextMenu(html);

    html.find('.move-handle').mousedown((ev) => {
      ev.preventDefault();
      ev = ev || window.event;
      let isRightMB = false;
      if ('which' in ev) {
        // Gecko (Firefox), WebKit (Safari/Chrome) & Opera
        isRightMB = ev.which == 3;
      } else if ('button' in ev) {
        // IE, Opera
        isRightMB = ev.button == 2;
      }

      if (!isRightMB) {
        dragElement(document.getElementById('common-display-toolbar'));
        let pos1 = 0,
          pos2 = 0,
          pos3 = 0,
          pos4 = 0;

        function dragElement(elmnt) {
          elmnt.onmousedown = dragMouseDown;
          function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;

            if (elmnt.style.bottom != undefined) {
              elmnt.style.top = elmnt.offsetTop + 'px';
              elmnt.style.bottom = null;
            }

            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
          }

          function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            // calculate the new cursor position:
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            // set the element's new position:
            elmnt.style.bottom = null;
            elmnt.style.right = null;
            elmnt.style.top = elmnt.offsetTop - pos2 + 'px';
            elmnt.style.left = elmnt.offsetLeft - pos1 + 'px';
            elmnt.style.position = 'fixed';
            elmnt.style.zIndex = 100;
          }

          function closeDragElement() {
            // stop moving when mouse button is released:
            elmnt.onmousedown = null;
            elmnt.style.zIndex = null;
            document.onmouseup = null;
            document.onmousemove = null;

            let xPos = Math.clamp(elmnt.offsetLeft - pos1, 0, window.innerWidth - 200);
            let yPos = Math.clamp(elmnt.offsetTop - pos2, 0, window.innerHeight - 20);

            let position = { top: null, bottom: null, left: null, right: null };
            if (yPos > window.innerHeight / 2) position.bottom = window.innerHeight - yPos - elmnt.offsetHeight;
            else position.top = yPos + 1;

            //if (xPos > (window.innerWidth / 2))
            //    position.right = (window.innerWidth - xPos);
            //else
            position.left = xPos; // + 1;

            elmnt.style.bottom = position.bottom ? position.bottom + 'px' : null;
            elmnt.style.right = position.right ? position.right + 'px' : null;
            elmnt.style.top = position.top ? position.top + 'px' : null;
            elmnt.style.left = position.left ? position.left + 'px' : null;

            //$(elmnt).css({ bottom: (position.bottom || ''), top: (position.top || ''), left: (position.left || ''), right: (position.right || '') });

            //log(`Setting monks-tokenbar position:`, position);
            game.user.setFlag('monks-common-display', 'position', position);
            this.pos = position;
          }
        }
      }
    });
  }

  _contextMenu(html) {
    ContextMenu.create(this, html, '.common-button-group', this._getContextOptions(), {
      hookName: 'CommonDisplayContext',
    });
    ContextMenu.create(this, html, '.common-button-group .header', this._getContextOptions(), {
      eventName: 'click',
      hookName: 'CommonDisplayContext',
    });
  }

  _getContextOptions() {
    return [
      {
        name: i18n('MonksCommonDisplay.GM'),
        icon: '<i class="fas fa-user"></i>',
        condition: game.user.isGM,
        callback: async (btn) => {
          let action = btn.closest('.common-button-group').data('action');
          MonksCommonDisplay.selectToken = null;
          if (setting('per-scene')) await canvas.scene.setFlag('monks-common-display', action, 'gm');
          else await game.settings.set('monks-common-display', action, 'gm');
          if (action == 'screen') MonksCommonDisplay.screenChanged();
          else MonksCommonDisplay.focusChanged();
          this.render(true);
        },
      },
      {
        name: i18n('MonksCommonDisplay.FullScene'),
        icon: '<i class="fas fa-presentation-screen"></i>',
        condition: (btn) => {
          return game.user.isGM && btn.closest('.common-button-group').data('action') == 'screen';
        },
        callback: async (btn) => {
          let action = btn.closest('.common-button-group').data('action');
          MonksCommonDisplay.selectToken = null;
          if (setting('per-scene')) await canvas.scene.setFlag('monks-common-display', action, 'scene');
          else await game.settings.set('monks-common-display', action, 'scene');
          if (action == 'screen') MonksCommonDisplay.screenChanged();
          else MonksCommonDisplay.focusChanged();
          this.render(true);
        },
      },
      {
        name: i18n('MonksCommonDisplay.Combatant'),
        icon: '<i class="fas fa-swords"></i>',
        condition: game.user.isGM,
        callback: async (btn) => {
          let action = btn.closest('.common-button-group').data('action');
          MonksCommonDisplay.selectToken = null;
          if (setting('per-scene')) await canvas.scene.setFlag('monks-common-display', action, 'combat');
          else await game.settings.set('monks-common-display', action, 'combat');
          if (action == 'screen') MonksCommonDisplay.screenChanged();
          else MonksCommonDisplay.focusChanged();
          this.render(true);
        },
      },
      {
        name: i18n('MonksCommonDisplay.Party'),
        icon: '<i class="fas fa-users-viewfinder"></i>',
        condition: (btn) => {
          return game.user.isGM && btn.closest('.common-button-group').data('action') == 'screen';
        },
        callback: async (btn) => {
          let action = btn.closest('.common-button-group').data('action');
          MonksCommonDisplay.selectToken = null;
          if (setting('per-scene')) await canvas.scene.setFlag('monks-common-display', action, 'party');
          else await game.settings.set('monks-common-display', action, 'party');
          if (action == 'screen') MonksCommonDisplay.screenChanged();
          else MonksCommonDisplay.focusChanged();
          this.render(true);
        },
      },
      {
        name: i18n('MonksCommonDisplay.SelectTokens'),
        icon: '<i class="fas fa-bullseye"></i>',
        condition: game.user.isGM,
        callback: (btn) => {
          let action = btn.closest('.common-button-group').data('action');
          MonksCommonDisplay.selectToken = !!MonksCommonDisplay.selectToken ? null : action;
          this.render(true);
        },
      },
    ];
  }

  async updateToken(tkn, refresh = true) {
    let diff = {};

    if (tkn.img != (tkn.token.actor.img || tkn.token.texture.src)) {
      diff.img = tkn.token.actor.img || tkn.token.texture.src;
      let thumb = this.thumbnails[diff.img];
      if (!thumb) {
        try {
          thumb = await ImageHelper.createThumbnail(diff.img, { width: 50, height: 50 });
          this.thumbnails[diff.img] = thumb?.thumb || thumb;
        } catch {
          thumb = 'icons/svg/mystery-man.svg';
        }
      }

      diff.thumb = thumb?.thumb || thumb;
    }

    if (Object.keys(diff).length > 0) {
      foundry.utils.mergeObject(tkn, diff);
      if (refresh) this.render();
    }
  }

  toggleCollapse(event) {
    event.preventDefault();
    event.stopPropagation();
    if (this._collapsed) this.expand();
    else this.collapse();
  }

  collapse() {
    if (this._collapsed) return;
    const toggle = this.element.find('.toggle-collapse');
    const icon = toggle.children('i');
    const bar = this.element.find('.toolbar-list');
    return new Promise((resolve) => {
      bar.slideUp(200, () => {
        bar.addClass('collapsed');
        if (setting('show-vertical')) icon.removeClass('fa-caret-up').addClass('fa-caret-down');
        else icon.removeClass('fa-caret-left').addClass('fa-caret-right');
        this._collapsed = true;
        resolve(true);
      });
    });
  }

  expand() {
    if (!this._collapsed) return true;
    const toggle = this.element.find('.toggle-collapse');
    const icon = toggle.children('i');
    const bar = this.element.find('.toolbar-list');
    return new Promise((resolve) => {
      bar.slideDown(200, () => {
        bar.css('display', '');
        bar.removeClass('collapsed');
        if (setting('show-vertical')) icon.removeClass('fa-caret-down').addClass('fa-caret-up');
        else icon.removeClass('fa-caret-right').addClass('fa-caret-left');
        this._collapsed = false;
        resolve(true);
      });
    });
  }
}
