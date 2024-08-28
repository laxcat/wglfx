import { defProp } from "./common-extension.mjs"
import Accessor from "./Accessor.mjs"
import { isStr, isFn, ifElFn } from "./util.mjs"

/*

config object:
{
    html: `<tr></tr>`,  // String, should have single base node
    bind: {             // Object
                        // keys match bound keys
        key: {          // values are config objects passed to Accessor
            ...
        }
    },
    control: {
        startEdit:  ,
        remove:     ,
        cancelEdit: ,
        submitEdit: ,
    },

    onChange:"..."      // String, key of callback on bound instance
}

*/


export default class DataUI {
    // bind DataUI structure to an instance
    // calling DataUI.bind(this, parentEl) will look for a static dataUI config
    // object, and set this.dataUI with the an instance of DataUI, bound to this
    static bind(t, parentEl) {
        this.#privateConstruction = true;
        t.dataUI = new DataUI(t.constructor.dataUI, t, parentEl);
        this.#privateConstruction = false;
        return t.dataUI;
    }

    get el() { return this.#el; }

    updateUI() {
        this.#keys.forEach(acc=>acc.updateUI());
    }

    // construct with DataUI.bind
    constructor(config, t, parentEl) {
        if (!DataUI.#privateConstruction) {
            throw TypeError("Construct with DataUI.bind, eg: DataUI.bind(this, parentEl);")
        }
        this.#t = t;
        this.#parentEl = parentEl;
        this.#html = config.html;
        this.#createUI();
        this.#bind(config.bind);
        this.#bindControls(config.control);
        this.#bindHandlers(config);

        (this.cancelEdit) ? this.cancelEdit() : this.updateUI();
    }
    static #privateConstruction = false;

    #t;         // bound instance
    #parentEl   // HTMLElement
    #el;        // HTMLElement
    #html;      // string
    #keys;      // map of key accessors
    #control;   // map of actions

    #createUI() {
        this.#el = this.#parentEl.appendHTML(this.#html);
    }

    #bind(obj) {
        this.#keys = new Map();
        for (const key in obj) {
            const config = {...obj[key]};
            config.el = ifElFn(config.el, this.#el);
            config.parent = this;
            this.#keys.set(key, new Accessor(this.#t, key, config));
        }
    }

    #bindControls(obj) {
        this.#control = new Map();

        if (obj.startEdit) {
            this.#setControl(obj, "startEdit");
            defProp(this, "startEdit", { value: function() {
                this.#showControl("startEdit", false);
                this.#showControl("cancelEdit", true);
                this.#showControl("submitEdit", true);
                this.#showControl("remove", false);
                this.#keys.forEach(acc=>{if (acc.editable) acc.startEdit()});
                // this.#el.addKeyListener("Enter", e=>this.submitEdit());
                // this.#el.addKeyListener("Escape", e=>this.cancelEdit());
            }});
        }

        if (obj.cancelEdit) {
            this.#setControl(obj, "cancelEdit");
            defProp(this, "cancelEdit", { value: function() {
                this.#showControl("startEdit", true);
                this.#showControl("cancelEdit", false);
                this.#showControl("submitEdit", false);
                this.#showControl("remove", true);
                this.#keys.forEach(acc=>
                    (acc.editable) ? acc.cancelEdit() : acc.updateUI()
                );
            }});
        }

        if (obj.submitEdit) {
            this.#setControl(obj, "submitEdit");
            defProp(this, "submitEdit", { value: function() {
                this.#showControl("startEdit", true);
                this.#showControl("cancelEdit", false);
                this.#showControl("submitEdit", false);
                this.#showControl("remove", true);
                this.#keys.forEach(acc=>{if (acc.editable) acc.submitEdit()});
            }});
        }

        if (obj.remove) {
            this.#setControl(obj, "remove");
            defProp(this, "remove", { value: function() {
            }});
        }
    }

    #bindHandlers(obj) {
        // called by the Accessors in #keys to report changes
        this.#setHandler(obj, "onChange");
    }

    // a handler only gets set if set in config object AND bound instance can
    // respond to it
    #setHandler(obj, handlerKey) {
        const boundKey = obj[handlerKey];
        if (isStr(boundKey) && isFn(this.#t[boundKey])) {
            defProp(this, handlerKey, { value: function(accKey) {
                this.#t[boundKey](accKey);
            }});
        }
    }

    #setControl(obj, key) {
        const el = ifElFn(obj[key], this.#el);
        if (el === null) {
            throw new SyntaxError(`Could not get el for control ${key}.`);
        }
        el.addEventListener("click", e=>this[key]());
        this.#control.set(key, el);
    }

    #showControl(key, showing) {
        this.#control.get(key).classList.toggle("hidden", !showing);
    }
}
