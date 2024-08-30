import { defProp } from "./common-extension.mjs"
import Accessor from "./Accessor.mjs"
import { is, isStr, isArr, isFn, ifElFn } from "./util.mjs"

/*

INCOMPLETE / WIP

DataUI is a group of Accessors, optionally attached to an instance.

It is usually created by reading Type.dataUI static, then attaching itself
to an instances of Type as type.dataUI.

DataUI handles any communication Accessors might need, like checking all inputs
are valid, sumitting, adding to lists

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
        removeSelf:     ,
        cancelEdit: ,
        submitEdit: ,
        reset:      ,

    },

    callback: {         //  Callbacks are strings. Only created if set here AND
                        //      fn matching string exists on attached instance.
                        //      Callbacks get passed the accessor's key.

        onChange:"..."  //  Called anytime a change is made. Primary callback.

        on(control)     //  Each key in "control" gets matching callback
                                onStartEdit, onRemoveSelf, etc

        onReorder       //  Array-like accessors have a few extra callbacks that
        onAdd           //      don't have matching controls.
        onReIndex
    },

    tempCallback:  {    //  Matches callback, but only exist during creation
                        //      process. Removed from dataUI when attached to
                        //      bound. Instead of strings, are functions.
                        //      Temp callbacks will always pass dataUI instance
                        //      as first parameter, in addition to normal
                        //      callback parameters.
    }
}

All possible added functions

                    //  these are setup but mostly called by click actions
                    //  they might be convenient to the user once the dataUI
                    //  object has been attached.
    startEdit
    cancelEdit
    submitEdit
    removeSelf          //  only works if parent is array-like?


                    //  These are only called by this dataUI
                    //  TODO: should prob be something other than public methods
    onStartEdit
    onRemoveSelf
    onReset

                    //  Same as above but only used in tempCallback (so far)
    onCancelEdit
    onSubmitEdit

                    //  These are only called by the child Accessors...
                    //  TODO: change these to not be public functions but
                    //  something only child Accessors have access to
    onChange
    onReorder
    onAdd
    onReIndex
*/


export default class DataUI {
    // Create and attach DataUI an instance
    static bind(t, parentEl, addConfig={}) {
        return DataUI.create(t, parentEl, addConfig).attach();
    }

    // Create DataUI by binding instance and parent HTML element
    // where t is of Type, uses Type.dataUI as main config object
    static create(t, parentEl, addConfig={}) {
        if (!t?.constructor?.dataUI) {
            console.error("COULD NOT FIND static dataUI on", t);
            return null;
        }
        this.#privateConstruction = true;
        const config = {...t.constructor.dataUI, ...addConfig};
        const dataUI = new DataUI(config, t, parentEl);
        this.#privateConstruction = false;
        return dataUI;
    }

    get el() { return this.#el; }
    get instance() { return this.#t; }

    updateUI() {
        this.#keys.forEach(acc=>acc.updateUI?.());
    }

    set(key, value) {
        this.#keys.get(key)?.set?.(value);
    }

    setEnabled(enabled) {
        if (enabled) {
            this.#control.forEach(c=>c.removeAttribute("disabled"));
        }
        else {
            this.#control.forEach(c=>c.setAttribute("disabled", true));
        }
    }

    isAttached() { return (this.#t && this.#t.dataUI === this); }

    attach() {
        if (this.isAttached()) {
            throw CustomError(`DataUI instance is already attached.`);
        }
        this.#tempCallback?.clear();
        this.#tempCallback = null;
        defProp(this.#t, "dataUI", { value: this });
        Object.preventExtensions(this);
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
        this.#bindCallbacks(config);
        this.#addTempCallbacks(config);

        // init
        if (config.startEditOnInit) {
            this.updateUI();
            this.startEdit(true);
        }
        else if (this.cancelEdit) {
            this.cancelEdit();
        }
        else {
            this.updateUI();
        }
    }
    static #privateConstruction = false;

    #t;             // instance, might be attached...
    #parentData     // DataUI
    #parentKey      // String
    #parentEl       // HTMLElement
    #el;            // HTMLElement
    #html;          // string
    #keys;          // Map of key accessors
    #control;       // Map of actions
    #tempCallback;  // Map of temp callbacks. Removed when dataUI is attached.

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

            // accessor for this key is array-like
            if (isArr(bindKey.type)) {
                if (bindKey.type[0]?.dataUI == null) {
                    throw SyntaxError("Arrays of non-dataUI types not supported.");
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
            // accessor for normal value
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
            defProp(this, "startEdit", { value: function(allDirty=false) {
                this.#showControl("startEdit", false);
                this.#showControl("cancelEdit", true);
                this.#showControl("submitEdit", true);
                this.#showControl("removeSelf", false);
                this.#keys.forEach(acc=>acc.startEdit?.(allDirty));
                this.#callback("startEdit");
            }});
        }

        if (config.control.cancelEdit) {
            this.#setControl(config.control, "cancelEdit");
            defProp(this, "cancelEdit", { value: function() {
                this.#showControl("startEdit", true);
                this.#showControl("cancelEdit", false);
                this.#showControl("submitEdit", false);
                this.#showControl("removeSelf", true);
                this.#keys.forEach(acc=>
                    (acc.cancelEdit) ? acc.cancelEdit() : acc.updateUI()
                );
                this.#callback("cancelEdit");
            }});
        }

        if (config.control.submitEdit) {
            this.#setControl(config.control, "submitEdit");
            defProp(this, "submitEdit", { value: function() {
                if (this.#allValid()) {
                    this.#showControl("startEdit", true);
                    this.#showControl("cancelEdit", false);
                    this.#showControl("submitEdit", false);
                    this.#showControl("removeSelf", true);

                    const dirtyKeys = this.#getDirtyKeys();

                    this.#keys.forEach(acc=>acc.submitEdit?.());
                    this.#callback("submitEdit");

                    dirtyKeys.forEach(key=>this.#callback("change", key));
                }
            }});
        }

        if (config.control.removeSelf) {
            this.#setControl(config.control, "removeSelf");
            defProp(this, "removeSelf", { value: function() {
                const index = this.#t.index;
                this.#parentData?.#keys.get(this.#parentKey)?.removeChild?.(index);
                // this.#callback("removeSelf");
                // console.log("removeSelf", );
            }});
        }
    }

    #bindCallbacks(config) {
        for (const key in config.callback) {
            const fnKey = config.callback[key];
            if (!isStr(fnKey)) {
                console.error(`WARNING: callback.${fnKey} expect to be string `+
                    `key matching method on bound instance:`, this.#t);
            }
            if (isStr(fnKey) && isFn(this.#t[fnKey])) {
                defProp(this, key, { value: function(...args) {
                    this.#t[fnKey](...args);
                }});
            }
        }
    }

    #addTempCallbacks(config) {
        this.#tempCallback = new Map();
        for (const key in config.tempCallback) {
            this.#tempCallback.set(key, config.tempCallback[key]);
        }
    }

    #callback(key, ...args) {
        const callKey = `on${key.toStartCase()}`;
        // console.log("DOING CALLBACK", key, callKey, this[callKey], this.#tempCallback?.get(callKey));
        // callback to methods on bound instance
        this[callKey]?.(...args);
        // callback to temporary callbacks
        this.#tempCallback?.get(callKey)?.(this, ...args);
    }

    #getDirtyKeys() {
        let keys = [];
        this.#keys.forEach((acc,key)=>{
            if (acc.isDirty) {
                keys.push(key);
            }
        });
        return keys;
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
}
