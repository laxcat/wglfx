import { defProp } from "./common-extension.mjs"
import { isEl, isArr, isNum, isStr, isFn } from "./util.mjs"

/*
    Setter/Getter object
    Sometimes called a binding, value link, pointer, reference, etc

    Additionally can optionally hold a reference to HTMLElement, adding ability
    to update to/from ui.

    Additionally can optionally be "editable", swapping contents of HTMLElement
    out with an input, validating, setting value back with setter on submit,
    etc.

    Takes a config parameter with the following optional keys supported:
    {
        // stored for live lookup later

        parent,     //  DataUI, to report back to larger data handler
        el,         //  HTMLElement, enables updateUI,setFromUI
        getStrKey,  //  String, if set, getStr uses obj[getStrKey]
        editable,   //  Boolean, enables isDirty,startEdit,cancelEdit,
                    //      validateEdit,submitEdit

        // "hardened" on init

        fromStr,    //  Fn that wraps input.value in submitEdit,
                    //      gets set to parseFloat if not set and limit set
        limit,      //  Number/Array that defines min/max/step,
                    //      see #getMinMaxStepStr below for value rules
        pattern,    //  String, set to input attribute, used in validation msg
    }
*/
export default class Accessor {
    // required
    #obj;           //  any Type where Type[String] permitted, parent object
    #key;           //  String, property key

    // optional, set by config
    #parent;        //  DataUI
    #el;            //  HTMLElement
    #getStrKey;     //  string, key used for getStr getter
    #editable;      //  creates ability to inject input into el, and update from
                    //  user changes

    // calculated
    #inputEl;       //  an input (or other) html form element

    // get isNumber() { return this.#type === Number; }
    get editable() { return this.#editable; }

    constructor(obj, key, config={}) {
        this.#obj = obj;
        this.#key = key;

        this.#parent    = config.parent     ?? null;
        this.#el        = config.el         ?? null;
        this.#getStrKey = config.getStrKey  ?? null;
        this.#editable  = config.editable   ?? false;

        this.#inputEl = null;

        this.#setup();

        // if el was provided, Accessor can handle syncing ui element too
        if (isEl(this.#el)) {
            this.#setupUI(config);
            // if editable there a bunch more setters to set
            if (this.#editable) {
                this.#setupEditable(config);
            }
        }
    }

    // setup basic getters/setters
    #setup() {
        defProp(this, "get", { value: function() {
            return this.#obj[this.#key];
        }});

        defProp(this, "set", { value: function(value) {
            this.#obj[this.#key] = value;
        }});

        defProp(this, "getStr", { value:
            (this.#getStrKey === null) ?
                function() { return this.get().toString(); } :
                function() { return this.#obj[this.#getStrKey];
        }});
    }

    // setup ui enabled functions
    #setupUI(config) {

        // update the ui with the this.getStr()
        defProp(this, "updateUI", { value: function() {
            this.#el.innerHTML = this.getStr();
        }});

        // couldn't think of a single use case for this.
        // how would innerHTML ever get modified if Accessor didn't set it?
        // maybe useful when dealing with other systems?
        // killing for now. -tm
        // // update the value FROM el.innerHTML. probably pretty rare
        // defProp(this, "setFromUI", { value: function() {
        //     // this.set(new (this.#type)(this.#el.innerHTML));
        //     this.setFromStr(this.#el.innerHTML);
        // }});
    }

    #setupEditable(config) {
        // setup minMaxStepStr, used in startEdit
        // setup patternStr, used in startEdit
        // setup fromStr, used to determine how setFromStr is configured
        const minMaxStepStr = this.#getMinMaxStepStr(config.limit);
        let fromStr = config.fromStr;
        let inputType = "text";
        // if limit was set and valid, treat as a number
        if (minMaxStepStr) {
            inputType = "number";
            if (!fromStr) {
                fromStr = parseFloat;
            }
        }
        // if pattern was set
        let patternStr = "";
        const pattern = config.pattern;
        if (isStr(pattern)) {
            patternStr = `placeholder="${pattern}" pattern="${pattern}"`;
        }

        // setting back from input.value means we need to convert from string
        defProp(this, "setFromStr", { value:
            (isFn(fromStr)) ?
            // use fromStr wrapper
            function(str) {
                this.set(fromStr(str));
            } :
            // use set fn directly
            this.set
        });

        // if input is present (editing state), true if value has changed
        defProp(this, "isDirty", { get: function() {
            const inp = this.#inputEl;
            if (!inp) return false;
            return (inp.value !== inp.dataset.prevValue);
        }});

        // creates the input in el
        defProp(this, "startEdit", { value: function() {
            this.#el.innerHTML = "";
            this.#inputEl = this.#el.appendHTML(
                `<input
                    type="${inputType}"
                    value="${this.get()}"
                    data-prev-value="${this.get()}"
                    required
                    ${patternStr}
                    ${minMaxStepStr}
                >`
            );
            this.#inputEl.addKeyListener("Enter", e=>this.#parent?.submitEdit());
            this.#inputEl.addKeyListener("Escape", e=>this.#parent?.cancelEdit());
        }});

        // clears the input, populates el with getStr
        defProp(this, "cancelEdit", { value: function() {
            this.#inputEl = null;
            this.updateUI();
        }});

        // validate the current value in input, especially pattern
        defProp(this, "validateEdit", {value: function() {
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
        }});

        //
        defProp(this, "submitEdit", { value: function() {
            if (!this.validateEdit()) return;
            if (this.isDirty) {
                // this.set(new (this.#type)(this.#inputEl.value));
                this.setFromStr(this.#inputEl.value);
                this.#parent?.onChange?.(this.#key);
            }
            this.updateUI();
        }});
    }

    // limit array/number -> min/max/step string
    // limit can be:
    // 0 or [0] ,              ->  min="0"
    // n or [n] , where n > 0  ->  min="0" max="n"
    // [n, x]   , where n < x  ->  min="n" max="x"
    // [n, x, s],              ->  min="n" max="x" step="s"
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
}
