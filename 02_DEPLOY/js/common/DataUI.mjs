import { defProp } from "./common-extension.mjs"
import Accessor from "./Accessor.mjs"
import { is, isStr, isArr, isFn, ifElFn } from "./util.mjs"

/*

INCOMPLETE / WIP
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
    static bind(t, parentEl, addConfig={}) {
        if (!t?.constructor?.dataUI) {
            console.error("COULD NOT FIND static dataUI on", t);
            return;
        }
        this.#privateConstruction = true;
        const config = {...t.constructor.dataUI, ...addConfig};
        t.dataUI = new DataUI(config, t, parentEl);
        this.#privateConstruction = false;
        return t.dataUI;
    }

    get el() { return this.#el; }

    updateUI() {
        this.#keys.forEach(acc=>acc.updateUI?.());
    }

    set(key, value) {
        this.#keys.get(key)?.set?.(value);
    }

    // construct with DataUI.bind
    constructor(config, t, parentEl) {
        if (!DataUI.#privateConstruction) {
            throw TypeError("Construct with DataUI.bind, eg: DataUI.bind(this, parentEl);")
        }
        // console.log("binding", t, parentEl, config);
        this.#t = t;
        this.#parentEl = parentEl;
        this.#html = config.html;
        this.#parentData = config.parentData ?? null;
        this.#parentKey = config.parentKey ?? null;
        this.#createUI();
        this.#bind(config);
        this.#bindControls(config);
        this.#bindHandlers(config);

        if (config.startEditOnInit) this.startEdit();
        else if (this.cancelEdit)   this.cancelEdit();
        else                        this.updateUI();
    }
    static #privateConstruction = false;

    #t;             // bound instance
    #parentData     // DataUI
    #parentKey      // DataUI
    #parentEl       // HTMLElement
    #el;            // HTMLElement
    #html;          // string
    #keys;          // map of key accessors
    #control;       // map of actions

    #createUI() {
        this.#el = this.#parentEl.appendHTML(this.#html);
    }

    #bind(config) {
        this.#keys = new Map();
        // for each bind key
        for (const key in config.bind) {
            const bindKey = {...config.bind[key]};
            bindKey.el = ifElFn(bindKey.el, this.#el);
            bindKey.parent = this;

            // type is set to array of types with dataUI static descriptors
            if (isArr(bindKey.type)) {
                if (bindKey.type[0]?.dataUI == null) {
                    throw SyntaxError("Arrays non-dataUI types not supported.");
                }
                const type = bindKey.type[0];
                const arr = this.#t[key];
                if (!isArr(arr)) {
                    throw SyntaxError(`Error in binding, ${this} key ${key} of array not found.`);
                }
                if (arr.length > 0 && !is(arr[0], type)) {
                    console.error(`WARNING! binding to array but ${key}[0] is not of type ${type}!`);
                }
                // so we bind the instances in the bound[key] array, each to the
                // parent element: bindKey.el
                this.#t[key].forEach(sub=>
                    DataUI.bind(sub, bindKey.el, {parentData:this, parentKey:key})
                );
                // then we create an accessor for this key,
                // which will be array aware
                this.#keys.set(key, new Accessor(this.#t, key, bindKey));
            }
            // type is normal
            else {
                // create accessor for this key
                this.#keys.set(key, new Accessor(this.#t, key, bindKey));
            }
        }
    }

    #bindControls(config) {
        this.#control = new Map();

        if (config.control.startEdit) {
            this.#setControl(config.control, "startEdit");
            defProp(this, "startEdit", { value: function() {
                this.#showControl("startEdit", false);
                this.#showControl("cancelEdit", true);
                this.#showControl("submitEdit", true);
                this.#showControl("remove", false);
                this.#keys.forEach(acc=>acc.startEdit?.());
            }});
        }

        if (config.control.cancelEdit) {
            this.#setControl(config.control, "cancelEdit");
            defProp(this, "cancelEdit", { value: function() {
                this.#showControl("startEdit", true);
                this.#showControl("cancelEdit", false);
                this.#showControl("submitEdit", false);
                this.#showControl("remove", true);
                this.#keys.forEach(acc=>
                    (acc.cancelEdit) ? acc.cancelEdit() : acc.updateUI()
                );
            }});
        }

        if (config.control.submitEdit) {
            this.#setControl(config.control, "submitEdit");
            defProp(this, "submitEdit", { value: function() {
                if (this.#allValid()) {
                    this.#showControl("startEdit", true);
                    this.#showControl("cancelEdit", false);
                    this.#showControl("submitEdit", false);
                    this.#showControl("remove", true);
                    this.#keys.forEach(acc=>acc.submitEdit?.());
                }
            }});
        }

        if (config.control.remove) {
            this.#setControl(config.control, "remove");
            defProp(this, "remove", { value: function() {
                const index = this.#t.index;
                console.log("index?", index);
                this.#parentData?.#keys.get(this.#parentKey)?.remove(index);
                // console.log("remove", );
            }});
        }
    }

    #allValid() {
        let valid = true;
        this.#keys.forEach(acc=>{
            if (acc.validateEdit) {
                valid &&= acc.validateEdit();
            }
        });
        return valid;
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

    #bindHandlers(config) {
        // called by the Accessors in #keys to report changes
        this.#setHandler(config, "onChange");
    }

    // a handler only gets set if set in config object AND bound instance can
    // respond to it
    #setHandler(config, handlerKey) {
        const boundKey = config[handlerKey];
        if (isStr(boundKey) && isFn(this.#t[boundKey])) {
            defProp(this, handlerKey, { value: function(accKey) {
                this.#t[boundKey](accKey);
            }});
        }
    }
}
