import { extd } from "./common-extension.mjs"
import "./html-extension.mjs"
import DataUI from "./DataUI.mjs"
import { confirmDialog } from "./util-ui.mjs"
import { is, isEl, isArr, isNum, isStr, isFn, ifElFn, isPOJO } from "./util.mjs"

/*
    TODO: NOT UP TO DATE

    Accessor is a setter/getter object.
    Sometimes called a binding, value link...basically a pointer or reference.

    At its most basic, just takes a obj and a key, and creates set, get, and
    getStr functions to read/write to that value.

    Additionally can optionally hold a reference to HTMLElement, adding ability
    to update to/from ui.

    Additionally can be set as "editable", adding the ability to provide input
    elements to the user, basic validating, setting value back with setter on
    submit, etc.

    Accessors can be array-like. If so, they expect the bound property to be
    an array of an expected type. get() and set() become meaningless and the
    accessor only modifies the bound array directly. Only meaningful if editable
    and/or reorderable are set. To be clear, in this mode, this Accessor
    instance manages the ENTIRE ARRAY. Each item in the array must be a type
    with  look-up-able config (Type[configKey] is an accessor config object).
    Any  Accessor binds a property to an HTML node, and an array-like is no
    different; the entire array is bound to the one HTML element.

    Takes a config parameter with the following optional keys supported:
    {
        // stored for live lookup later

        parent,     //  DataUI, to report back to larger data handler
        el,         //  HTMLElement, enables updateUI,setFromUI
        getStrKey,  //  String, if set, getStr uses obj[getStrKey]

        // "hardened" on init

        editable,   //  Boolean,
                    //  if array-like, enables:
                    //      addChildStart,addChildCancel,addChildSubmit,removeChild
                    //  if normal string/number value, enables:
                    //      setFromStr,isDirty,editStart,editCancel,
                    //      editValidate,editSubmit

        type        //  suported:
                        • [TypeWithDataUI], array-like,
                                            editable and/or reorderable must be
                                            set for any fns to get enabled
                        • TODO: TypeWithDataUI (we'll need this for other systems)
                        • undefined, normal string/number value

        reorderable //  Expects options object to pass to makeReorderable (see
                    //      below). Can also be truthy if no options needed.
                        if array-like, enables:
                            onReorder,reorderableConfig,reIndex

        addControl  //  if set, automatically sets editable to be true
                            does nothing if not array-like

        fromStr,    //  Fn that wraps input.value in editSubmit,
                    //      gets set to parseFloat if not set and limit set
        limit,      //  Number/Array that defines min/max/step,
                    //      see #getMinMaxStepStr below for value rules
        pattern,    //  String, set to input attribute, used in validation msg
    }

    Note: array-like, (upcoming obj-like), scalar-like can be described as

    see #defProp for complete list of possibly added properties.
*/
export default class Accessor {

    static configKey  = "accessorConfig";
    static setVisible = (el,visible)=>el.classList.toggle("hidden", !visible);



    // required
    #obj;           //  any Type where Type[String] permitted, parent object
    #key;           //  String, property key

    // optional, set by config
    #parent;        //  Accessor

    #container;     //  HTMLElement. this is the CONTAINING el (parent).
                    //      this.createUI creates this.createdEls.
                    //      el might have other children than createdEls
    #getStrKey;     //  string, key used for getStr getter

    // calculated
    #inputEl;       //  an input (or other) html form element


    constructor(obj, key, config={}) {
        this.#obj = obj;
        this.#key = key;

        // config is a type with a static config obj, so
        // pull the static config and use it as our config, remembering type
        const type = config.config;
        if (type && type === type?.prototype?.constructor && type[Accessor.configKey]) {
            config = {...type[Accessor.configKey], ...config, type};
        }

        // console.log(obj, key, config);

        this.#parent    = config.parent     ?? null;
        this.#container = config.container  ?? null;
        this.#getStrKey = config.getStrKey  ?? null;

        this.#inputEl = null;

        // build all the functions onto this Accessor
        // array-like
        if (isArr(config.type)) {
            this.#setupAsArray(config);
        }
        // obj-like
        else if (config.type) {
            this.#setupAsObj(config);
        }
        // scalar
        else {
            this.#setupAsScalar(config);
        }
        Object.preventExtensions(this);

        // init
        if (config.editOnInit) {
            this.updateUI();
            this.editStart(true);
        }
        else if (this.editCancel) {
            this.editCancel();
        }
        else {
            this.updateUI?.();
        }

        console.log("accessor", this);
    }

    // Accessor only controls a single value like a string or number
    #setupAsScalar(config) {
        // basic getters/setters -------------------------------------------- //
        this.#defProp("get");
        this.#defProp("set");
        this.#defProp("getStr");

        // bail if simple accessor
        if (!isEl(this.#container)) return;

        // UI --------------------------------------------------------------- //

        // update the ui with the this.getStr()
        this.#defProp("updateUI");

        // bail if edible not set
        if (!config.editable) return;

        // Editable --------------------------------------------------------- //

        // we will try not to capture the whole config object, but only a the
        // specific values we need
        const capture = {};

        // setup minMaxStepStr, used in editStart
        // setup patternStr, used in editStart
        // setup fromStr, used to determine how setFromStr is configured
        capture.minMaxStepStr = this.#getMinMaxStepStr(config.limit);
        capture.fromStr = config.fromStr;
        capture.inputType = "text";
        // if limit was set and valid, treat as a number
        if (capture.minMaxStepStr) {
            capture.inputType = "number";
            if (!capture.fromStr) {
                capture.fromStr = parseFloat;
            }
        }
        // if pattern was set
        capture.patternStr = "";
        const pattern = config.pattern;
        if (isStr(pattern)) {
            capture.patternStr = `placeholder="${pattern}" pattern="${pattern}"`;
        }

        // setting back from input.value means we need to convert from string
        this.#defProp("setFromStr", capture);

        // if input is present (editing state), true if value has changed
        this.#defProp("isDirty");

        // creates the input in el
        this.#defProp("editStart_scalar", capture);

        // clears the input, populates el with getStr
        this.#defProp("editCancel_scalar");

        // validate the current value in input, especially pattern
        this.#defProp("editValidate_scalar", capture);

        //
        this.#defProp("editSubmit_scalar");
    }

    // limit array/number -> min/max/step string
    // limit can be:
    // 0 or [0] ,              ->  min="0"
    // n or [n] , where n > 0  ->  min="0" max="n"
    // [n, x]   , where n < x  ->  min="n" max="x"
    // [n, x, s], where n < x  ->  min="n" max="x" step="s"
    #getMinMaxStepStr(limit) {
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
    }

    #setupAsArray(config) {
        // set some defaults
        // if addControl present, automatically turn on editable
        const capture = {};

        capture.Type = config.type[0];

        // make a read-only getter to the array
        this.#defProp("arr");

        if (config.editable) {

            // create startAdd function, which presnts a new item form
            this.#defProp("addChildStart", capture);

            this.#defProp("addChildCancel");

            // create add function
            this.#defProp("addChildSubmit");

            // create remove function
            this.#defProp("removeChild");

            // create enable/disable functions
            this.#defProp("setEnabledAllExcept");
            this.#defProp("setEnabledAll");

            // add click handler to addChild and other array-level controls
            if (config.control) {
                for (const key in config.control) {
                    const el = config.control[key];
                    if (!isEl(el)) {
                        continue;
                    }
                    if (!this.controls) {
                        this.#defProp("controls");
                    }
                    this.controls.set(key, el);
                    el.addEventListener("click", e=>this[key]());
                }
            }
        }

        // configure reorderable
        if (config.reorderable) {
            // config.reorderable cant be anything truthy, but we support a
            // options object passed into makeReorderable
            if (!isPOJO(config.reorderable)) {
                config.reorderable = {};
            }

            // create onReorder function
            this.#defProp("onReorder");

            // set onReorder callback
            config.reorderable.onReorder = this.onReorder.bind(this);
            // create reorderableConfig getter, and make reorderable

            // TODO REENABLE
            // capture.reorderableConfig = makeReorderable(this.#el, config.reorderable);
            // this.#defProp("reorderableConfig", capture);

            // create reIndex function
            this.#defProp("reIndex");
        }


        this.#defProp("children_arr");

        this.arr.forEach((item,index)=>{
            const subConf = {
                config: capture.Type,
                container: this.#container,
                parent: this,
                editable: config.editable,
            };
            this.children.push(new Accessor(this.arr, index, subConf));
        });
    }

    #setupAsObj(config) {
        const capture = {};

        // make a read-only getter to the array
        this.#defProp("obj");

        if (config.html) {
            // set the html as a read-only getter
            capture.html = config.html;
            this.#defProp("html", capture);

            this.#defProp("el");

            this.#defProp("createUI_obj");

            this.#defProp("resetUI");
        }

        if (isEl(this.#container)) {
            this.createUI?.();
        }

        if (config.editable) {

            this.#defProp("editStart_obj");
            this.#defProp("editCancel_obj");
            this.#defProp("editSubmit_obj");
            this.#defProp("editValidate_obj");
            this.#defProp("removeSelf");

            const ctrlEls = this.el.querySelectorAll("*[data-control]");
            console.log("ctrlEls", ctrlEls);
            ctrlEls.forEach(ctrlEl=>{
                if (!this.controls) {
                    this.#defProp("controls");
                }
                const ctrl = ctrlEl.getAttribute("data-control");
                this.controls.set(ctrl, ctrlEl);
                ctrlEl.addEventListener("click", e=>this[ctrl]());
            });
        }

        this.#defProp("children_obj");

        // for each bind key
        for (const key in config.bind) {
            const bindKey = {...config.bind[key]};
            bindKey.container = this.el.querySelector(`*[data-bind='${key}']`);
            bindKey.parent = this;
            // find any controls for our keys, like addChild buttons for arrays
            const ctrlEls = this.el.querySelectorAll(`*[data-control-${key}]`);
            ctrlEls.forEach(ctrlEl=>{
                if (!bindKey.control) {
                    bindKey.control = {};
                }
                const ctrl = ctrlEl.getAttribute(`data-control-${key}`);
                bindKey.control[ctrl] = ctrlEl;
            });

            // console.log("key/bindKey", key, bindKey);

            const accessor = new Accessor(this.obj, key, bindKey);
            accessor.updateUI?.();

            this.children.set(key, accessor);
        }


        // createUI will spider down, so, only start if el is already resolved,
        // implying a top level object
    }

    // ---------------------------------------------------------------------- //
    // ALL the optionally defined properties of the Accessor, all in one place
    // ---------------------------------------------------------------------- //
    #defProp(definitionKey, capture) {
        // definitionKey might be propName_extra
        const propName = definitionKey.split("_", 1)[0];

        const defValue = value=>extd(this, propName, {value});
        const defGet   = get=>  extd(this, propName, {get});

        switch(definitionKey) {

        // EDITABLE GENERAL ------------------------------------------------- //

        case "controls":
            const _controls = new Map();
            defGet(()=>_controls);

            // gonna sneak an extra def in here...think about the pattern later
            extd(this, "showControls", { value: function(...ctrls){
                this.controls.forEach((ctrl,key)=>{
                    Accessor.setVisible(ctrl, ctrls.includes(key));
                });
            }});

            extd(this, "setEnabled", { value: function(enabled){
                if (enabled) {
                    this.controls?.forEach(c=>c.removeAttribute("disabled"));
                }
                else {
                    this.controls?.forEach(c=>c.setAttribute("disabled", true));
                }
            }});
        break;

        // SCALAR GENERAL --------------------------------------------------- //

        // get
        case "get": defValue(function() {
            return this.#obj[this.#key];
        });
        break;

        // set
        case "set": defValue(function(value) {
            this.#obj[this.#key] = value;
        });
        break;

        // getStr
        case "getStr": defValue(
            (this.#getStrKey === null) ?
                function() { return this.get()?.toString(); } :
                function() { return this.#obj[this.#getStrKey]; }
        );
        break;

        // SCALAR UI -------------------------------------------------------- //

        // updateUI
        case "updateUI": defValue(function() {
            this.#container.innerHTML = this.getStr();
        });
        break;

        // SCALAR EDITABLE -------------------------------------------------- //

        // setFromStr
        case "setFromStr":
            // use fromStr wrapper
            if (isFn(capture.fromStr)) {
                const { fromStr } = capture;
                defValue(function(str) {
                    this.set(fromStr(str));
                });
            }
            // use set fn directly
            else {
                defValue(this.set);
            }
        break;

        // isDirty
        case "isDirty": defGet(function() {
            const inp = this.#inputEl;
            if (!inp) return false;
            if (inp.dataset.prevValue === "") return true;
            return (inp.value !== inp.dataset.prevValue);
        });
        break;

        // editStart
        case "editStart_scalar":
            const { inputType, patternStr, minMaxStepStr } = capture;
            defValue(function(allDirty=false) {
                this.#container.innerHTML = "";
                this.#inputEl = this.#container.insertHTML(
                    `<input
                        type="${inputType}"
                        value="${this.get()}"
                        data-prev-value="${allDirty?"":this.get()}"
                        required
                        ${patternStr}
                        ${minMaxStepStr}
                    >`
                );
                this.#inputEl.addKeyListener("Enter", e=>this.#parent?.editSubmit());
                this.#inputEl.addKeyListener("Escape", e=>this.#parent?.editCancel());
            });
        break;

        // editCancel
        case "editCancel_scalar": defValue(function() {
            this.#inputEl = null;
            this.updateUI();
        });
        break;

        // editValidate
        case "editValidate_scalar":
            const { pattern } = capture;
            defValue(function() {
                this.#inputEl.setCustomValidity("");
                if (!this.isDirty) {
                    return true;
                }
                if (this.#inputEl.validity.patternMismatch) {
                    this.#inputEl.setCustomValidity(`Match the pattern ${pattern}`);
                }
                // if (isNotUnique()) {
                //     this.#inputEl.setCustomValidity("Must be unique");
                // }
                return this.#inputEl.reportValidity();
            });
        break;

        // editSubmit
        case "editSubmit_scalar": defValue(function() {
            if (this.isDirty) {
                // this.set(new (this.#type)(this.#inputEl.value));
                this.setFromStr(this.#inputEl.value);
            }
            this.updateUI();
        });
        break;

        // ARRAY GENERAL ---------------------------------------------------- //

        // arr
        // read-only
        case "arr": defGet(function() {
            return this.#obj[this.#key];
        });
        break;

        // children
        case "children_arr":
            const _childrenArr = [];
            defGet(()=>_childrenArr);
        break;

        // ARRAY EDITABLE --------------------------------------------------- //

        // addChildStart
        case "addChildStart":
            const { Type } = capture;
            defValue(function() {
                this.setEnabledAll(false);
                const config = {
                    temp: new Type(),
                    editOnInit: true,
                    parent: this,
                    container: this.#container,
                    config: Type,
                };
                if (this.reorderableConfig) {
                    this.reorderableConfig.enable(false);
                    const indexKey = this.reorderableConfig.indexKey;
                    if (Object.getOwnPropertyDescriptor(Type.prototype, indexKey)) {
                        item[indexKey] = this.#obj[this.#key].length;
                    }

                    // config.tempCallback = {
                    //     onEditCancel: this.addChildCancel.bind(this),
                    //     onEditSubmit: this.addChildSubmit.bind(this),
                    // };
                }
                // create accessor
                const accessor = new Accessor(config, "temp", config);
                this.children.push(accessor);
            });
        break;

        // addChildCancel
        case "addChildCancel": defValue(function(/*dataUI*/) {
            this.reorderableConfig?.enable(true);
            // dataUI.el.remove();
            // addButton.classList.remove("hidden");
            this.setEnabledAll(true);
        });
        break;

        // addChildSubmit
        case "addChildSubmit": defValue(function(/*dataUI*/) {
            // this.arr.push(dataUI.instance);
            // dataUI.attach();
            if (this.reorderableConfig) {
                this.reorderableConfig.enable(true);
                // makeReorderableItem(dataUI.el, this.reorderableConfig);
            }
            // addButton.classList.remove("hidden");
            this.setEnabledAll(true);
            this.#parent?.onAdd?.(this.#key);
            this.#parent?.onChange?.(this.#key);
        });
        break;

        // removeChild
        case "removeChild": defValue(function(item, msg) {
            const index = this.arr.indexOf(item);
            if (index === -1) {
                console.error("Child not found.");
                return;
            }
            confirmDialog(msg ?? `Remove index ${index}?`,
                "Cancel", null,
                "Remove", () => {
                    // const el = item.dataUI.el;
                    // this.arr.splice(index, 1);
                    // el.remove();
                    // this.reIndex(index);
                    // this.#parent?.onRemoveChild?.(this.#key, index);
                    // this.#parent?.onChange?.(this.#key);
                }
            );
        });
        break;

        // setEnabledAllExcept
        case "setEnabledAllExcept": defValue(function(item, enabled) {
            let i = this.children.length;
            while (i--) {
                if (this.arr[i] === item) continue;
                this.children[i]?.setEnabled(enabled);
            }
        });
        break;

        // setEnabledAll
        case "setEnabledAll": defValue(function(enabled) {
            let i = this.children.length;
            while (i--) {
                this.children[i]?.setEnabled(enabled);
            }
        });
        break;

        // ARRAY REORDERABLE ------------------------------------------------ //

        // onReorder
        case "onReorder": defValue(function(oldIndex, newIndex) {
            const arr = this.#obj[this.#key];
            const oldItem = arr.splice(oldIndex, 1)[0];
            arr.splice(newIndex, 0, oldItem);
            this.reIndex();
            this.#parent?.onReorder?.(this.#key, oldIndex, newIndex);
            this.#parent?.onChange?.(this.#key);
        });
        break;

        // reorderableConfig
        case "reorderableConfig":
            const { reorderableConfig } = capture;
            defGet(()=>reorderableConfig);
        break;

        // reIndex
        case "reIndex": defValue(function(startIndex=0) {
            const indexKey = this.reorderableConfig.indexKey;
            const e = this.arr.length;
            let i = startIndex;
            while (i < e) {
                this.arr[i][indexKey] = i;
                ++i;
            }
            this.#parent?.onReIndex?.(this.#key);
        });
        break;

        // OBJ GENERAL ------------------------------------------------------ //

        case "obj": defGet(function(){ return this.#obj[this.#key]; });
        break;

        // children
        case "children_obj":
            const _childrenObj = new Map();
            defGet(()=>_childrenObj);
        break;

        // OBJ UI ----------------------------------------------------------- //

        // html
        case "html":
            const { html } = capture;
            defGet(()=>html);
        break;

        // createdEls
        case "el": extd(this, propName, {value:null, writable:true});
        break;

        // createUI
        case "createUI_obj": defValue(function() {
            // const pEls = this.#parent?.createdEls ?? [this.#parent?.#el];
            // this.#el = ifElFn(this.#el, pEls);
            if (!this.#container) {
                this.#container = DocumentFragment();
            }
            this.el = this.#container.insertHTML(this.html, {require:1});
        });
        break;

        // resetUI
        case "resetUI": defValue(function() {
            // nothing to do
            if (!this.el || !this.#container) {
                return this.createUI();
            }
            // if this is the only child of container, we can shortcut
            if (this.#container.children.length === 1 &&
                this.#container.children[0] === this.el) {
                this.#container.innnerHTML = "";
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
                this.el = this.#container.insertHTML(this.html, config);
            }
            return this.el;
        });
        break;

        // editStart
        case "editStart_obj": defValue(function(allDirty=false) {
            console.log("editStart_obj", this.children);
            this.#parent?.setEnabledAllExcept?.(this.obj, false);
            // this.parentAccessor?.reorderableConfig?.enable(false);
            this.showControls("editCancel", "editSubmit");
            this.children.forEach(acc=>acc.editStart?.(allDirty));
            // this.#callback("editStart");
        });
        break;


        // editCancel
        case "editCancel_obj": defValue(function() {
            console.log("editCancel_obj");
            this.showControls("editStart", "removeSelf");
            this.children.forEach(acc=>
                (acc.editCancel) ? acc.editCancel() : acc.updateUI()
            );
            this.#parent?.setEnabledAllExcept?.(this.obj, true);
            // this.parentAccessor?.reorderableConfig?.enable(true);
            // this.#callback("editCancel");
        });
        break;

        // editSubmit
        case "editSubmit_obj": defValue(function() {
            console.log("editSubmit_obj");
            if (!this.editValidate()) {
                return;
            }
            this.showControls("editStart", "removeSelf");
            const dirtyKids = this.getDirtyChildren();


            // if (this.#allValid()) {
            //     this.#showControl("editStart", true);
            //     this.#showControl("editCancel", false);
            //     this.#showControl("editSubmit", false);
            //     this.#showControl("removeSelf", true);

            //     const dirtyKeys = this.#getDirtyKeys();

            //     this.#keys.forEach(acc=>acc.editSubmit?.());

            //     this.parentAccessor?.setEnabledAllExcept(this.#t, true);
            //     this.parentAccessor?.reorderableConfig?.enable(true);
            //     this.#callback("editSubmit");
            //     dirtyKeys.forEach(key=>this.#callback("change", key));
            // }
        });
        break;

        // editSubmit
        case "editValidate_obj": defValue(function() {
            return this.children.every(c=>c.editValidate?.() ?? true);
        });
        break;

        // removeSelf
        case "removeSelf": defValue(function() {
            console.log("removeSelf");
            // this.parentAccessor?.removeChild?.(this.#t);
        });
        break;

        case "getDirtyChildren": defValue(function() {
            let keys = [];
            this.children.forEach((acc,key)=>{
                if (acc.isDirty) {
                    keys.push(key);
                }
            });
            return keys;
        });
        break;

        }
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
        if (enabled) {
            parentEl.children.forEach(childEl=>{
                childEl.setAttribute("draggable", true);
            });
        }
        else {
            parentEl.children.forEach(childEl=>{
                childEl.removeAttribute("draggable");
            });
        }
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
