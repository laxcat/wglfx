import { extd } from "./common-extension.mjs"
import DataUI from "./DataUI.mjs"
import { confirmDialog } from "./util-ui.mjs"
import { isEl, isArr, isNum, isStr, isFn, ifElFn, isPOJO } from "./util.mjs"

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
    instance manages the ENTIRE ARRAY. Each item in the array can (and must,
    currently) have its own dataUI. Any Accessor binds a property to an HTML
    node, and an array-like is no different; the entire array is bound to the
    one HTML element.

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
                    //      validateEdit,editSubmit

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
    // required
    #obj;           //  any Type where Type[String] permitted, parent object
    #key;           //  String, property key

    // optional, set by config
    #parent;        //  DataUI
    #el;            //  HTMLElement
    #getStrKey;     //  string, key used for getStr getter

    // calculated
    #inputEl;       //  an input (or other) html form element

    constructor(obj, key, config={}) {
        this.#obj = obj;
        this.#key = key;

        this.#parent    = config.parent     ?? null;
        this.#el        = config.el         ?? null;
        this.#getStrKey = config.getStrKey  ?? null;

        this.#inputEl = null;

        // build all the functions onto this Accessor
        // array-like property
        if (isArr(config.type)) {
            this.#setupAsArray(config);
        }
        // normal string/number property
        else {
            this.#setupAsScalar(config);
        }
        Object.preventExtensions(this);
    }

    // Accessor only controls a single value like a string or number
    #setupAsScalar(config) {
        // basic getters/setters -------------------------------------------- //
        this.#defProp("get");
        this.#defProp("set");
        this.#defProp("getStr");

        // bail if simple accessor
        if (!isEl(this.#el)) return;

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
        this.#defProp("editStart", capture);

        // clears the input, populates el with getStr
        this.#defProp("editCancel");

        // validate the current value in input, especially pattern
        this.#defProp("validateEdit", capture);

        //
        this.#defProp("editSubmit");
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
        if (config.addControl) {
            config.editable = true;
        }

        const capture = {};

        // make a read-only getter to the array
        this.#defProp("arr");

        if (config.editable) {
            capture.Type = config.type[0];

            // create startAdd function, which presnts a new item form
            this.#defProp("addChildStart", capture);

            this.#defProp("addChildCancel");

            // create add function
            this.#defProp("addChildSubmit");

            // create remove function
            this.#defProp("removeChild");

            // create enable/disable functions
            this.#defProp("enableAllExcept");
            this.#defProp("enableAll");

            // add click handler to add control
            if (config.addControl) {
                const el = ifElFn(config.addControl, this.#parent.el);
                if (el === null) {
                    throw new SyntaxError(`Could not get el for control add in ${key}.`);
                }
                el.addEventListener("click", e=>this.addChildStart());
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
            capture.reorderableConfig = makeReorderable(this.#el, config.reorderable);
            this.#defProp("reorderableConfig", capture);

            // create reIndex function
            this.#defProp("reIndex");
        }
    }

    // ---------------------------------------------------------------------- //
    // ALL the optionally defined properties of the Accessor, all in one place
    // ---------------------------------------------------------------------- //
    #defProp(propName, capture) {
        const defValue = value=>extd(this, propName, {value});
        const defGet   = get=>  extd(this, propName, {get});

        switch(propName) {

        // SCALAR GENERAL --------------------------------------------------- //

        // get
        case "get": defValue(function() {
            // console.log("did get", this.#obj[this.#key], this.#obj, this.#key);
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
                function() { return this.get().toString(); } :
                function() { return this.#obj[this.#getStrKey]; }
        );
        break;

        // SCALAR UI -------------------------------------------------------- //

        // updateUI
        case "updateUI": defValue(function() {
            this.#el.innerHTML = this.getStr();
        });
        break;

        // SCALAR EDITABLE -------------------------------------------------- //

        // setFromStr
        case "setFromStr": defValue(
            (isFn(capture.fromStr)) ?
            // use fromStr wrapper
            function(str) {
                this.set(capture.fromStr(str));
            } :
            // use set fn directly
            this.set
        );
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
        case "editStart": defValue(function(allDirty=false) {
            this.#el.innerHTML = "";
            this.#inputEl = this.#el.appendHTML(
                `<input
                    type="${capture.inputType}"
                    value="${this.get()}"
                    data-prev-value="${allDirty?"":this.get()}"
                    required
                    ${capture.patternStr}
                    ${capture.minMaxStepStr}
                >`
            );
            this.#inputEl.addKeyListener("Enter", e=>this.#parent?.editSubmit());
            this.#inputEl.addKeyListener("Escape", e=>this.#parent?.editCancel());
        });
        break;

        // editCancel
        case "editCancel": defValue(function() {
            this.#inputEl = null;
            this.updateUI();
        });
        break;

        // validateEdit
        case "validateEdit": defValue(function() {
            this.#inputEl.setCustomValidity("");
            if (!this.isDirty) {
                return true;
            }
            if (this.#inputEl.validity.patternMismatch) {
                this.#inputEl.setCustomValidity(`Match the pattern ${capture.pattern}`);
            }
            // if (isNotUnique()) {
            //     this.#inputEl.setCustomValidity("Must be unique");
            // }
            return this.#inputEl.reportValidity();
        });
        break;

        // editSubmit
        case "editSubmit": defValue(function() {
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

        // ARRAY EDITABLE --------------------------------------------------- //

        // addChildStart
        case "addChildStart": defValue(function() {
            this.enableAll(false);
            const item = new capture.Type();
            const bindConfig = {
                editOnInit: true,
                parentData: this.#parent,
                parentKey: this.#key
            };
            if (this.reorderableConfig) {
                this.reorderableConfig.enable(false);
                const indexKey = this.reorderableConfig.indexKey;
                if (Object.getOwnPropertyDescriptor(capture.Type.prototype, indexKey)) {
                    item[indexKey] = this.#obj[this.#key].length;
                }

                bindConfig.tempCallback = {
                    onEditCancel: this.addChildCancel.bind(this),
                    onEditSubmit: this.addChildSubmit.bind(this),
                };
            }
            // create dataUI
            DataUI.create(item, this.#el, bindConfig);
        });
        break;

        // addChildCancel
        case "addChildCancel": defValue(function(dataUI) {
            this.reorderableConfig?.enable(true);
            dataUI.el.remove();
            // addButton.classList.remove("hidden");
            this.enableAll(true);
        });
        break;

        // addChildSubmit
        case "addChildSubmit": defValue(function(dataUI) {
            this.arr.push(dataUI.instance);
            dataUI.attach();
            if (this.reorderableConfig) {
                this.reorderableConfig.enable(true);
                makeReorderableItem(dataUI.el, this.reorderableConfig);
            }
            // addButton.classList.remove("hidden");
            this.enableAll(true);
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
                    const el = item.dataUI.el;
                    this.arr.splice(index, 1);
                    el.remove();
                    this.reIndex(index);
                    this.#parent?.onRemoveChild?.(this.#key, index);
                    this.#parent?.onChange?.(this.#key);
                }
            );
        });
        break;

        // enableAllExcept
        case "enableAllExcept": defValue(function(item, enabled) {
            let i = this.arr.length;
            while (i--) {
                if (this.arr[i] === item) continue;
                this.arr[i]?.dataUI?.setEnabled(enabled);
            }
        });
        break;

        // enableAll
        case "enableAll": defValue(function(enabled) {
            let i = this.arr.length;
            while (i--) {
                this.arr[i]?.dataUI?.setEnabled(enabled);
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
        case "reorderableConfig": defGet(()=>capture.reorderableConfig);
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
