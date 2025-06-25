export class MonksCommonDisplayLayer extends InteractionLayer {
  constructor() {
    super();
  }

  static get layerOptions() {
    return foundry.utils.mergeObject(super.layerOptions, {
      objectClass: Note,
      sheetClass: NoteConfig,
      sheetClasses: {
        base: {},
      },
      canDragCreate: false,
      zIndex: 180,
    });
  }

  static documentName = 'MonksCommonDisplayLayer';

  async draw() {
    //don't draw anything, it's not that kind of layer
  }

  /*
    activate() {
        //don't activate anything, it's not that kind of layer
        const wasActive = this._active;
        this._active = true;

        // Deactivate other layers
        for (let name of Object.keys(Canvas.layers)) {
            const layer = canvas[name];
            if (layer !== this) layer.deactivate();
        }
        if (wasActive) return this;

        // Assign interactivity for the active layer
        this.zIndex = this.getZIndex();
        this.interactive = false;
        this.interactiveChildren = true;

        // Re-render Scene controls
        if (ui.controls) ui.controls.initialize({ layer: this.constructor.layerOptions.name });
        return this;
    }

    deactivate() {
        //don't deactivate anything, it's not that kind of layer
        this._active = false;
        this.interactive = false;
        this.interactiveChildren = false;
        this.zIndex = this.getZIndex();
        return this;
    }*/
}
