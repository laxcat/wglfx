import { extd } from "./common-extension.mjs"
import "./html-extension.mjs"
import { confirmDialog } from "./util-ui.mjs"
import { is, isEl, isArr, isNum, isStr, isFn, isPOJO } from "./util.mjs"

/*
    THIS TEXT REFELCTS MOST OF THE RECENT CHANGES, BUT STILL NEEDS WORK

    Accessor is a setter/getter object.
    Sometimes called a binding, value link...basically a pointer or reference.

    At its most basic, just takes a obj and a key, and creates set, get, and
    getStr functions to read/write to that value.

    Additionally can optionally hold a reference to HTMLElement, adding ability
    to update to/from ui.

    Additionally can be set as "editable", adding the ability to provide input
    elements to the user, basic validating, setting value back with setter on
    submit, etc.

    Accessors can be array-like. In this case, the Accessor manages an array of
    child accessors, each managing their own obj-like Accessor (array-like
    child accessors be obj-like. array-like Accessor with scalar children didn't
    make much sense to me yet.)

    Accessors can be object-like, managing a set of keys on the obj[key]
    instance. Accessors can access Type[Accessor.configKey] static config
    object on the Type itself, making for convenient automatic config of
    objects designed for use with Accessor. When obj-like, Accessors can
    generate html, and assign their child accessors to be contained within.
    While the children of array-like accessors, can only be obj-like accessors,
    the children of obj-like accessors can be anything.

    Example use:

    class Bar { ... }

    class Foo {
        name;
        size;
        bar;
        static accessorConfig = {
            html: `
            <div>
                <p data-bind="name"></p>
                <p data-bind="bar"></p>
                <p data-bind="size"></p>
            </div>`,
            bind: {
                name: {editable:true},
                bar: {type:Bar, editable:true},
                size: {},
            }
        }
    }
    const base = {foo: new Foo()};
    const accr = new Accessor(base, "foo", document.body);
    accr.editStart();


    Full list of potentially added methods, properties, and getters below.
    See #setup* methods for logic of what is enabled.

    addChildCancel
    addChildStart
    addChildSubmit
    arr
    children
    ChildType
    container
    controls
    createUI
    editCancel
    editStart
    editSubmit
    editValidate
    el
    get
    getDirtyChildren
    getStr
    html
    inputEl
    isDirty
    obj
    onReorder
    parent
    reIndex
    removeChild
    removeSelf
    reorderable
    resetUI
    set
    setEnabled
    setEnabledAll
    setEnabledAllExcept
    setFromStr
    showControls
    Type
    updateUI

*/
export default class Accessor {
    /*
    Accessor global settings
    */
    static configKey  = "accessorConfig";
    static setVisible = (el,visible)=>el.classList.toggle("hidden", !visible);

    /*
    Main pointer data
    */
    #obj;   //  any Type where Type[String] permitted, parent object
    #key;   //  String, property key

    /*
    Config object
    all keys are optional
    {
        bind,           Object of keys to bind for obj-like accessors. The value
                            of each key is the config object for that child's
                            accessor.

        config,         Type, automatically create config from
                            Type[Accessor.configKey].
                            Syntax error if static config object missing.
                            Passed propoerties take priority.

        container,      HTMLElement, element which contains our data in the ui

        control,        Object

        editable,       Boolean,

        editOnInit,     Boolean, automatically calls editStart on init
                            Automatically sets editable to true

        fromStr,        Fn that wraps input.value in editSubmit,
                            defaults to parseFloat if limit set

        focusOnEdit,    TODO

        getStrKey,      String, if set, getStr() uses obj[getStrKey]

        html,           String, enables createUI. Add special attributes to
                            mark obj-like key children:
                            // div becomes container for keyName accessor
                            <div data-key="keyName"></div>
                            // control called accessorFunction gets added to
                            // keyName accessor. when clicked, calls
                            // accessorFunction fn on that same accessor
                            <button data-control-keyName="accessorFunction"></button>
                            // control called editStart gets added to
                            // accessor controlling this html
                            <button data-control="editStart"></button>

        limit,          Number/Array that defines min/max/step input attributes

        parent,         Accessor

        pattern,        String, set to input attribute, used in validation msg

        reorderable     Expects options object to pass to makeReorderable (see
                            below). Can also be simple truthy if no options
                            needed.

        temp,           Anything, if set, assumes the accessor is temporary.
                            Used in adding children to array so far. Might need
                            better system.
                            If present routes the following functions:
                            editCancel  ->  addChildCancel
                            editSubmit  ->  addChildSubmit

        type,           suported:
                        • [Type],       array-like,
                        • Type,         obj-like
                        • undefined,    scalar string/number value

        unique,         Boolean, if set on key of obj-like that is child of
                            array-like, will check same key on other items
                            in array-like to ensure uniqueness for validation.

    }
    */
    constructor(obj, key, config={}) {
        this.#obj = obj;
        this.#key = key;

        // DEFINE PROPS
        // handle global pre-setup
        config = this.#setupPre(config);
        // array-like
        if (this.Type === Array) {
            this.#setupAsArray(config);
        }
        // obj-like
        else if (this.Type) {
            this.#setupAsObj(config);
        }
        // scalar
        else {
            this.#setupAsScalar(config);
        }
        Object.preventExtensions(this);

        // INIT
        if (config.editOnInit) {
            this.updateUI?.();
            this.editStart?.(true);
        }
        else if (this.editCancel) {
            this.editCancel();
        }
        else {
            this.updateUI?.();
        }
    }

    // Setup some universal properties
    #setupPre(config) {
        // TYPE
        // config.config pulls from Type[Accessor.configKey]
        if (config.config) {
            const type = config.config;
            if (!type ||
                type !== type?.prototype?.constructor ||
                !isPOJO(type[Accessor.configKey]))
            {
                throw SyntaxError(
                    "config property expects Type where "+
                    "Type[Accessor.configKey] static is an Accessor config "+
                    "object."
                );
            }
            extd(this, "Type", {get:()=>type});
            config = {...type[Accessor.configKey], ...config, type};
        }
        // type set in config
        // if type is Array, also set ChildType
        else if (config.type) {
            const { type } = config;
            if (isArr(type)) {
                extd(this, "Type",      {get:()=>Array});
                extd(this, "ChildType", {get:()=>type[0]});
            }
            else {
                extd(this, "Type",      {get:()=>type});
            }
        }

        // PARENT
        if (is(config.parent, Accessor)) {
            const { parent } = config;
            extd(this, "parent", {get:()=>parent});
        }

        // RESOLVE DEFAULTS AND SHORTCUTS

        if (config.editOnInit) config.editable = true;

        return config;
    }

    // Accessor only controls a single value like a string or number
    #setupAsScalar(config) {
        // SCALAR : GENERAL ------------------------------------------------- //

        // get
        extd(this, "get", {value:function() {
            return this.#obj[this.#key];
        }});

        // set
        extd(this, "set", {value:function(value) {
            this.#obj[this.#key] = value;
        }});

        // getStr
        let getStrKeyFn;
        if (isStr(config.getStrKey)) {
            const { getStrKey } = config;
            getStrKeyFn = function() { return this.#obj[getStrKey]; };
        }
        else {
            getStrKeyFn = function() { return this.get()?.toString(); };
        }
        extd(this, "getStr", {value:getStrKeyFn});

        // stop here if no ui (simple accessor)
        if (!isEl(config.container)) {
            return;
        }

        // SCALAR : UI ------------------------------------------------------ //

        // container
        const { container } = config;
        extd(this, "container", {get:()=>container});

        // updateUI
        // set the value in ui, also clears from editing mode
        extd(this, "updateUI", {value:function() {
            this.container.innerHTML = this.getStr();
        }});

        // stop here if not editable
        if (!config.editable) {
            return;
        }

        // SCALAR : EDITABLE ------------------------------------------------ //

        // setup minMaxStepStr
        // convert config.limit (array/number) to min/max/step string
        // limit can be:
        // 0 or [0] ,              ->  min="0"
        // n or [n] , where n > 0  ->  min="0" max="n"
        // [n, x]   , where n < x  ->  min="n" max="x"
        // [n, x, s], where n < x  ->  min="n" max="x" step="s"
        const minMaxStepStr = (limit=>{
            // single number is allowed
            if (isNum(limit)) limit = [limit];
            // bail if invalid
            else if (!isArr(limit) || limit.length < 1) return "";

            // 1 item, either n-Inf or 0-n
            if (limit.length === 1) {
                return (limit[0] === 0) ?
                    `min="0"` :
                    `min="0" max="${limit[0]}"`;
            }
            // min >= max, invalid
            if (limit[0] >= limit[1]) {
                return "";
            }
            // 2-3 items
            return (limit.length === 2) ?
                `min="${limit[0]}" max="${limit[1]}"` :
                `min="${limit[0]}" max="${limit[1]}" step="${limit[2]}"`;
        })(config.limit);

        // setup patternStr
        // setup fromStr, used to determine how setFromStr is configured
        let { fromStr } = config;
        let inputType = "text";
        // if limit was set and valid, treat as a number
        if (minMaxStepStr) {
            inputType = "number";
            if (!fromStr) {
                fromStr = parseFloat;
            }
        }
        // make pattern attribute string
        const { pattern } = config;
        const patternStr = (isStr(pattern)) ?
            `placeholder="${pattern}" pattern="${pattern}"`:
            "";

        // setFromStr
        // setting back from input.value means we need to convert from string
        extd(this, "setFromStr", {value:
            // use fromStr wrapper
            isFn(fromStr) ? function(str) {
                this.set(fromStr(str));
            } :
            // use set fn directly
            this.set
        });

        // inputEl
        extd(this, "inputEl", {value:null,writable:true});

        // isDirty
        // if input is present (editing state), true if value has changed
        extd(this, "isDirty", {get:function() {
            if (!this.inputEl) return false;
            if (this.inputEl.dataset.prevValue === "") return true;
            return (this.inputEl.value !== this.inputEl.dataset.prevValue);
        }});

        // editStart
        // creates the input in el
        const { focusOnEdit } = config;
        extd(this, "editStart", {value:function(allDirty=false) {
            this.container.innerHTML = "";
            this.inputEl = this.container.insertHTML(
                `<input
                    name="${this.#key}"
                    type="${inputType}"
                    value="${this.get()}"
                    data-prev-value="${allDirty?"":this.get()}"
                    required
                    ${patternStr}
                    ${minMaxStepStr}
                >`
            );
            this.inputEl.addKeyListener("Enter", e=>this.parent?.editSubmit());
            this.inputEl.addKeyListener("Escape", e=>this.parent?.editCancel());
            if (focusOnEdit) {
                this.inputEl.focus();
                this.inputEl.select();
            }
        }});

        // editCancel
        // clears the input, populates el with getStr
        extd(this, "editCancel", {value:function() {
            this.inputEl = null;
            this.updateUI();
        }});

        // editValidate
        // validate the current value in input, especially pattern
        const { unique } = config;
        extd(this, "editValidate", {value:function() {
            this.inputEl.setCustomValidity("");
            if (!this.isDirty) {
                return true;
            }
            if (this.inputEl.validity.patternMismatch) {
                this.inputEl.setCustomValidity(`Match the pattern ${pattern}`);
            }
            if (unique && !this.isUnique()) {
                this.inputEl.setCustomValidity("Must be unique");
            }
            return this.inputEl.reportValidity();
        }});

        // editSubmit
        //
        extd(this, "editSubmit", {value:function() {
            if (this.isDirty) {
                // this.set(new (this.#type)(this.inputEl.value));
                this.setFromStr(this.inputEl.value);
            }
            this.updateUI();
        }});

        if (config.unique) {
            extd(this, "isUnique", {value:function() {
                const itemAccr = this.parent;
                const itemAccrs = itemAccr?.parent?.children;
                if (!isArr(itemAccrs)) return true;
                const val = (isFn(fromStr)) ?
                    fromStr(this.inputEl.value) :
                    this.inputEl.value;
                const e = itemAccrs.length;
                let i = 0;
                while (i < e) {
                    if (i === itemAccr.#key) {
                        ++i; continue;
                    }
                    const keyAccr = itemAccrs[i].children.get(this.#key);
                    if (keyAccr.get() === val) return false;
                    ++i;
                }
                return true;
            }});
        }
    }

    // Accessor controls an array of accessors
    // child accessors are created with this.ChildType
    #setupAsArray(config) {
        // ARRAY : GENERAL -------------------------------------------------- //

        // arr
        // similar to "get" in scalar accessors, but read-only
        extd(this, "arr", {get:function() {
            return this.#obj[this.#key];
        }});

        if (config.container) {
            const { container } = config;
            extd(this, "container", {get:()=>container});
        }

        // ARRAY EDITABLE --------------------------------------------------- //
        if (config.editable) {

            // addChildStart
            extd(this, "addChildStart", {value:function() {

                // create accessor
                // use config object as temp object. instance added permenantly
                // in addChildSubmit.
                const config = {
                    parent: this,
                    config: this.ChildType,
                    container: this.container,
                    editOnInit: true,
                    temp: new this.ChildType(),
                };
                const tempAccr = new Accessor(config, "temp", config);

                this.setEnabledAll(false);
                if (this.reorderable) {
                    this.reorderable.enable(false);
                    const indexKey = this.reorderable.indexKey;
                    tempAccr.children?.get(indexKey)?.set(this.arr.length);
                }
            }});

            // addChildCancel
            extd(this, "addChildCancel", {value:function(childAccessor) {
                console.log("addChildCancel", childAccessor);
                this.reorderable?.enable(true);
                childAccessor.el.remove();
                this.setEnabledAll(true);
            }});

            // addChildSubmit
            extd(this, "addChildSubmit", {value:function(childAccessor) {
                // submit all the children of the temp accessor
                // this saves the inputs back to childAccessor.obj
                childAccessor.children.forEach(a=>a.editSubmit?.());

                // add the instance
                this.arr.push(childAccessor.obj);

                // remove the temp el
                childAccessor.el.remove();

                // remake the accessor with in-place obj/key
                const subConf = {
                    parent: this,
                    config: this.ChildType,
                    container: this.container,
                    editable: true,
                };
                // accessor creates new ui
                const accessor = new Accessor(this.arr, this.arr.length-1, subConf);
                this.children.push(accessor);

                // reset everything
                if (this.reorderable) {
                    this.reorderable.enable(true);
                    makeReorderableItem(accessor.el, this.reorderable);
                }
                this.setEnabledAll(true);

                // notify
                // this.parent?.onAdd?.(this.#key);
                // this.parent?.onChange?.(this.#key);
            }});

            // removeChild
            extd(this, "removeChild", {value:function(child, msg) {
                const index = this.arr.indexOf(child);
                if (index === -1) {
                    console.error("Child not found.");
                    return;
                }
                const accessor = this.children[index];
                msg = msg ?? `Remove index ${index}?`;
                confirmDialog(msg,
                    "Cancel", null,
                    "Remove", () => {
                        this.arr.splice(index, 1);
                        this.children.splice(index, 1);
                        accessor.el.remove();
                        this.reIndex(index);
                        // this.parent?.onRemoveChild?.(this.#key, index);
                        // this.parent?.onChange?.(this.#key);
                    }
                );
            }});

            // setEnabledAllExcept
            extd(this, "setEnabledAllExcept", {value:function(item, enabled) {
                let i = this.children.length;
                while (i--) {
                    if (this.arr[i] === item) continue;
                    this.children[i]?.setEnabled(enabled);
                }
                this.setEnabled?.(enabled);
            }});

            // setEnabledAll
            extd(this, "setEnabledAll", {value:function(enabled) {
                let i = this.children.length;
                while (i--) {
                    this.children[i]?.setEnabled(enabled);
                }
                this.setEnabled?.(enabled);
            }});

            // add click handler to addChild and other array-level controls
            if (config.control) {
                for (const key in config.control) {
                    const el = config.control[key];
                    if (!isEl(el)) {
                        continue;
                    }
                    if (!this.controls) {
                        this.#defControls(config);
                    }
                    this.controls.set(key, el);
                    el.addEventListener("click", e=>this[key]());
                }
            }
        }

        // ARRAY : CHILDREN ACCESSORS --------------------------------------- //

        // children accessors
        const children = [];
        extd(this, "children", {get:()=>children});

        // create children accessors
        this.arr.forEach((item,index)=>{
            const subConf = {
                config: this.ChildType,
                container: config.container,
                parent: this,
                editable: config.editable,
            };
            this.children.push(new Accessor(this.arr, index, subConf));
        });

        // ARRAY REORDERABLE ------------------------------------------------ //

        if (config.reorderable) {
            // config.reorderable cant be anything truthy, but we support a
            // options object passed into makeReorderable
            if (!isPOJO(config.reorderable)) {
                config.reorderable = {};
            }

            // onReorder
            extd(this, "onReorder", {value:function(oldIndex, newIndex) {
                const oldItem = this.arr.splice(oldIndex, 1)[0];
                const oldAccr = this.children.splice(oldIndex, 1)[0];
                this.arr.splice(newIndex, 0, oldItem);
                this.children.splice(newIndex, 0, oldAccr);
                this.reIndex();
                // this.parent?.onReorder?.(this.#key, oldIndex, newIndex);
                // this.parent?.onChange?.(this.#key);
            }});

            // reorderable
            config.reorderable.onReorder = this.onReorder.bind(this);
            const reorderable = makeReorderable(this.container, config.reorderable);
            extd(this, "reorderable", {get:()=>reorderable});

            // reIndex
            extd(this, "reIndex", {value:function(startIndex=0) {
                const indexKey = this.reorderable.indexKey;
                const e = this.children.length;
                let i = startIndex;
                while (i < e) {
                    const itemAccr = this.children[i];
                    itemAccr.#key = i;
                    const indxAccr = itemAccr.children.get(indexKey);
                    indxAccr?.set(i);
                    indxAccr?.updateUI();
                    ++i;
                }
                this.parent?.onReIndex?.(this.#key);
            }});
        }
    }

    // Accessor controls an object
    // Child accessors are set as keys that mirror instance keys.
    // See config.bind
    #setupAsObj(config) {
        // OBJ : GENERAL ---------------------------------------------------- //

        extd(this, "obj", {get:function(){ return this.#obj[this.#key]; }});

        // OBJ : UI --------------------------------------------------------- //

        if (config.html) {
            // objects should always have containers if they have html
            if (!config.container) {
                const tempDoc = new DocumentFragment();
                config.container = document.createElement("template");
                tempDoc.append(config.container);
                console.log("no container?", config);
            }
            extd(this, "container", {value:config.container, writable:true});

            // html
            const { html } = config;
            extd(this, "html", {get:()=>html});

            // created el, the base node in html
            extd(this, "el", {value:null, writable:true});

            // createUI
            extd(this, "createUI", {value:function() {
                this.el = this.container.insertHTML(this.html, {require:1});
            }});

            // resetUI
            extd(this, "resetUI", {value:function() {
                // nothing to do
                if (!this.el || !this.container) {
                    return this.createUI();
                }
                // if this is the only child of container, we can shortcut
                if (this.container.children.length === 1 &&
                    this.container.children[0] === this.el) {
                    this.container.innnerHTML = "";
                    return this.createUI();
                }
                const config = {require:1};
                const prevSib = this.el.previousElementSibling;
                this.el.remove();
                // append after previous sibling
                if (prevSib) {
                    config.position = "afterend";
                    this.el = prevSib.insertHTML(this.html, config);
                }
                // there was no previous sibling, insert as parent's first child
                else {
                    config.position = "afterbegin";
                    this.el = this.container.insertHTML(this.html, config);
                }
                return this.el;
            }});

            // create UI now
            this.createUI?.();
        }

        // OBJ : EDITABLE --------------------------------------------------- //

        if (config.editable) {
            // editStart
            extd(this, "editStart", {value:function(allDirty=false) {
                console.log("editStart", this);
                this.parent?.setEnabledAllExcept?.(this.obj, false);
                this.parent?.reorderable?.enable(false);
                this.showControls("editCancel", "editSubmit");
                this.children.forEach(acc=>acc.editStart?.(allDirty));
                // this.#callback("editStart");
            }});

            // editCancel
            const temp = !!config.temp;
            extd(this, "editCancel", {value:function() {
                if (temp) {
                    return this.parent?.addChildCancel?.(this);
                }

                this.showControls("editStart", "removeSelf");
                this.children.forEach(acc=>
                    (acc.editCancel) ? acc.editCancel() : acc.updateUI()
                );
                this.parent?.setEnabledAllExcept?.(this.obj, true);
                this.parent?.reorderable?.enable(true);
                // this.#callback("editCancel");
            }});

            // editSubmit
            extd(this, "editSubmit", {value:function() {
                if (!this.editValidate()) {
                    return;
                }

                if (temp) {
                    return this.parent?.addChildSubmit?.(this);
                }

                this.showControls("editStart", "removeSelf");
                const dirtyKids = this.getDirtyChildren();
                this.children.forEach(a=>a.editSubmit?.());

                this.parent?.setEnabledAllExcept?.(this.obj, true);
                this.parent?.reorderable?.enable(true);
                // dirtyKeys.forEach(key=>this.#callback("change", key));
                //     this.#callback("editSubmit");
            }});

            // editSubmit
            extd(this, "editValidate", {value:function() {
                return this.children.every(c=>c.editValidate?.() ?? true);
            }});

            // removeSelf
            extd(this, "removeSelf", {value:function() {
                this.parent?.removeChild?.(this.obj);
            }});

            // getDirtyChildren
            extd(this, "getDirtyChildren", {value:function() {
                let keys = [];
                this.children.forEach((acc,key)=>{
                    if (acc.isDirty) {
                        keys.push(key);
                    }
                });
                return keys;
            }});

            // controls
            const ctrlEls = this.el.querySelectorAll("*[data-control]");
            ctrlEls.forEach(ctrlEl=>{
                if (!this.controls) {
                    this.#defControls(config);
                }
                const ctrl = ctrlEl.getAttribute("data-control");
                this.controls.set(ctrl, ctrlEl);
                ctrlEl.addEventListener("click", e=>this[ctrl]());
                ctrlEl.removeAttribute("data-control");
            });
        }

        // OBJ : CHILDREN ACCESSORS ----------------------------------------- //

        // children
        const children = new Map();
        extd(this, "children", {get:()=>children});

        // for each bind key
        for (const key in config.bind) {
            const bindKey = {...config.bind[key]};
            bindKey.container = this.el.querySelector(`*[data-bind='${key}']`);
            bindKey.container.removeAttribute("data-bind");
            bindKey.parent = this;
            // find any controls for our keys, like addChild buttons for arrays
            const ctrlAttrib = `data-control-${key}`;
            const ctrlEls = this.el.querySelectorAll(`*[${ctrlAttrib}]`);
            ctrlEls.forEach(ctrlEl=>{
                if (!bindKey.control) {
                    bindKey.control = {};
                }
                const ctrl = ctrlEl.getAttribute(ctrlAttrib);
                bindKey.control[ctrl] = ctrlEl;
                ctrlEl.removeAttribute(ctrlAttrib);
            });

            // console.log("key/bindKey", key, bindKey);

            const accessor = new Accessor(this.obj, key, bindKey);
            accessor.updateUI?.();

            this.children.set(key, accessor);
        }
    }

    #defControls(config) {
        // controls
        const controls = new Map();
        extd(this, "controls", {get:()=>controls});

        // showControls
        extd(this, "showControls", {value:function(...ctrls){
            const fn = (ctrl,key)=>
                Accessor.setVisible(ctrl, ctrls.includes(key));
            this.controls.forEach(fn);
        }});

        // setEnabled
        extd(this, "setEnabled", {value:function(enabled){
            const fn = (enabled) ?
                c=>c.removeAttribute("disabled") :
                c=>c.setAttribute("disabled", true);
            this.controls.forEach(fn);
        }});
    }
}

// Make parentEl's children reorderable using HTML5's drag/drop API.
// see defaultOptions. override anything with options.
// Operates directly on html without underlying data array. Uses html classes to
// maintain state.
// Exportable as independent function.
export function makeReorderable(parentEl, options) {
    const defaultOptions = {
        // called on drop. override to handle data
        onReorder: (oldIndex,newIndex)=>{},
        // given this xy in the drop target size, should apply beforeClass?
        isBefore: (x,y,w,h)=>(y / h < .5),
        // index key on item types
        indexKey: "index",
        // these classes get applied. set css accordingly.
        hoverClass: "hover",
        draggingClass: "dragging",
        draggingHoverClass: "draggingHover",
        beforeClass: "before",
        afterClass: "after",
        noDragClass: "noDrag",
    }
    const opt = {...defaultOptions, ...options};

    // dragging element can be found quicker by just looking at known draggable children
    opt.getDraggingEl = ()=>{
        let i = parentEl.children.length;
        while (i--) {
            if (parentEl.children[i].classList.contains(opt.draggingClass)) {
                return parentEl.children[i];
            }
        }
        return null;
    };

    opt.enable = enabled=> {
        const fn = (enabled) ?
            childEl=>childEl.setAttribute("draggable", true) :
            childEl=>childEl.removeAttribute("draggable");
        parentEl.children.forEach(fn);
    }

    // for each child of parentEl
    parentEl.children.forEach(childEl => {
        makeReorderableItem(childEl, opt);
    });

    return opt;
}

export function makeReorderableItem(childEl, opt) {
    // set the draggable attribute on html element
    childEl.setAttribute("draggable", true);

    // add listeners to add and remove classes on the relevant children
    const hoverClasses = [
        opt.draggingHoverClass,
        opt.beforeClass,
        opt.afterClass,
        opt.hoverClass,
    ];
    childEl.addEventListener("mouseenter",
        e => childEl.classList.add(opt.hoverClass)
    );
    childEl.addEventListener("dragenter",
        e => childEl.classList.add(opt.draggingHoverClass)
    );
    childEl.addEventListener("mouseleave",
        e => childEl.classList.remove(...hoverClasses)
    );
    childEl.addEventListener("dragleave",
        e => childEl.classList.remove(...hoverClasses)
    );
    childEl.addEventListener("dragend",
        e => childEl.classList.remove(opt.draggingClass)
    );

    // start drag, but only if not over a noDrag child
    childEl.addEventListener("dragstart",  e => {
        // check all "noDrag" children for dead zones and cancel if found
        const noDragEls = e.target.querySelectorAll("."+opt.noDragClass);
        if (noDragEls) {
            const mez = e.target.getBoundingClientRect();
            const x = mez.x + e.offsetX;
            const y = mez.y + e.offsetY;
            const end = noDragEls.length;
            let i = 0;
            while (i < end) {
                const dz = noDragEls[i].getBoundingClientRect();
                // if withing deadzone bounds, cancel the drag
                if (dz.x < x && x < dz.x + dz.width &&
                    dz.y < y && y < dz.y + dz.height) {
                    e.preventDefault();
                    return;
                }
                ++i;
            }
        }
        // normal operation, just adding a class
        childEl.classList.add(opt.draggingClass);
    });

    // called while dragging element over target... decides the before/after classes
    childEl.addEventListener("dragover", e => {
        e.preventDefault();

        const dragBounds = childEl.getBoundingClientRect();
        const targBounds = e.target.getBoundingClientRect();
        const x = targBounds.x - dragBounds.x + e.offsetX;
        const y = targBounds.y - dragBounds.y + e.offsetY;
        const before = opt.isBefore(x, y, dragBounds.width, dragBounds.height);

        childEl.classList.add(opt.draggingHoverClass);
        childEl.classList.toggle(opt.beforeClass, before);
        childEl.classList.toggle(opt.afterClass, !before);
    });

    // moves the html element and calls onReorder callback
    // doesn't get called if user cancels drop
    childEl.addEventListener("drop", e => {
        // prevent drop default and remove all draggingHover classes
        e.preventDefault();
        const isBefore = childEl.classList.contains(opt.beforeClass);
        childEl.classList.remove(opt.draggingHover, opt.beforeClass, opt.afterClass);
        // dropping the dragged on itself, do nothing
        const draggingEl = opt.getDraggingEl();
        if (childEl === draggingEl) {
            return;
        }
        // move the draggingEl to its new location
        const oldIndex = draggingEl.elementIndex();
        if (isBefore) {
            childEl.before(draggingEl);
        }
        else {
            childEl.after(draggingEl);
        }
        const newIndex = draggingEl.elementIndex();
        // only dispatch if different
        if (oldIndex !== newIndex) {
            opt.onReorder(oldIndex, newIndex);
        }
    });
}
