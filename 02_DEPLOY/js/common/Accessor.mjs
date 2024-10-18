import { extd } from "./common-extension.mjs"
import "./html-extension.mjs"
import { is, isFn, isStr, isNum, isArr, isBool, isPOJO, isEl } from "./util.mjs"

export default class Accessor {

    /*
    ADDED PROGRAMATICALLY

    read-only values/getters
    ----------------------------------------------------------------------------
    type
    parent

    writable values
    ----------------------------------------------------------------------------
    val                         // only writable if accessor is writable

    functions
    ----------------------------------------------------------------------------
    init()                      // if writable
    display()                   // if has el
    clear()                     // if TypeFn or "obj" and writable
    delete()
    set()
    push()                      // if "arr" and writable
    splice()
    editStart()                 // if user editable and writable

    */

    // name of static config object defined on TypeFn class
    static typeConfigKey = "define";

    // create accessor from tree of types
    static tree(type, el) {
        if (type[Accessor.typeConfigKey] == null) {
            throw new Error(`tree root type must have "${Accessor.typeConfigKey}" static config object`);
        }
        return new Accessor({ type, el, init:true });
    }

    // create accessor from type and lazy value
    static type(type, initFn=null) {
        return new Accessor({type,initFn});
    }

    // create child accessor
    static #child(parent, config) {
        this.#parent = parent;
        const acc = new Accessor(config);
        this.#parent = null;
        return acc;
    }
    static #parent = null;

    // create accessor from already initialized value
    static val(val, type=null) {
        return new Accessor({val,type});
    }

    constructor(config) {
        config = this.#sanitizeConfig({
            // CONFIG DEFAULTS

            // "bln" | "str" | "int" | "flt" | "arr" | "obj" | TypeFn
            type: null,

            // value already set and passed in.
            // if type not set will guess from this.
            val: null,

            // lazy val, return value assigned to val on "init"
            initFn: null,

            // OBJ
            keys: null,

            // ARR
            // length of default array
            length: null,
            childType: null,
            // // children of array type. CANNOT BE ARRAY.
            // itemType: null,

            // enables set val, edit*, state
            writable: false,

            // enables display
            el: null,
            // type must be TypeFn, el must be set
            html: null,

            // user editable. el+html must be set.
            editable: false,
            // user can reorder elements. must be arr+editable.
            reorderable: false,

            // override with user settings
            ...config,

            // some settings can't be configured by calling constructor:

            // parent only set in #child constructor
            parent: Accessor.#parent,

            // TypeFn pulls static config object from class
            ...(
                (config?.type?.[Accessor.typeConfigKey]) ?
                config.type[Accessor.typeConfigKey] :
                {}
            ),
        });


        // setup type, parent
        this.#setupMain(config);

        // setup init
        this.#setupInit(config);

        // setup display
        // returns refs to els to be used for children
        config.childEls = this.#setupDisplay(config);

        // setup access (val, splice, set, etc), children
        if      (this.#isScalar())      this.#setupAccessScalar(config);
        else if (this.type === "arr")   this.#setupAccessArr(config);
        else if (this.type === "obj")   this.#setupAccessObj(config);
        else if (this.#isTypeFn())      this.#setupAccessTypeFn(config);

        // setup user editable functions
        this.#setupEditable(config);
        this.#setupReordable(config);

        // init/display on configure
        if (config.init) {
            this.init();
            this.display?.();
        }

        // console.log("-------------------------");
        // console.log("accr");
        // console.log(this === this.#root);
        // console.log(config);
        // console.log(this);
    }


    #val = null;

    #sanitizeConfig(config) {

        // TYPE RELATED CODE PATHS:
        // 1) config.type IS set (becomes authority)
        //    a) config.val is set:
        //       gets coerced to type for scalars,
        //       errors if mismatched for arr/obj/typefn
        //    b) initFn set, gets coerced when resolved on init
        //    c) no value set, gets defaulted on init
        // 2) config.type NOT set (guess or use default type)
        //    a) config.val IS  set, used to guess type
        //    b) config.val NOT set, can't detect type. use default type.
        //
        // once config.type is resolved, if type is "arr", childType can be set
        // to force type of children. childType is never guessed, only set by
        // user. if not set, child accessors will guess for themselves.
        //
        // val and initFn can't both be set. will throw error.

        // no type set. let's guess!
        if (!config.type) {
            // take a guess. will default to "str" if config.val is not set
            config.type = Accessor.guessType(config.val);

            // if keys were set, type should be "obj" or TypeFn...
            // so if it's not TypeFn already, set it to "obj"
            if (config.keys && !isFn(config.type)) {
                config.type = "obj";
            }
        }

        // parse type shortcut for arrays
        // ["str"] array of strings
        // [Type]  array of Type
        if (isArr(config.type) && config.type.length === 1) {
            config.childType = config.type[0];
            config.type = "arr";
        }

        // type should be valid at this point
        Accessor.checkType(config.type);

        // check array things
        if (config.type === "arr") {
            if (config.childType) {
                Accessor.checkType(config.childType);
            }
            // set array length if not set
            if (config.length === null) {
                config.length = 0;
            }
        }

        // check "obj"/TypeFn things
        if (isPOJO(config.keys)) {
            // convert keys from POJO to map for easier handling
            config.keys = new Map(Object.entries(config.keys));
        }

        // el/html checks
        if (config.el && !is(config.el, HTMLElement)) {
            throw new Error("el must be HTMLElement");
        }
        if (config.html && !isFn(config.type)) {
            throw new Error("type must be TypeFn if html is set");
        }
        if (config.html && !isStr(config.html)) {
            throw new Error("html must be string");
        }
        if (config.html && !config.el) {
            throw new Error("el is required if html is set");
        }

        // val/initFn checks
        if (config.val && config.initFn) {
            throw new Error("set val or initFn, not both");
        }
        if (config.initFn && !isFn(config.initFn)) {
            throw new Error("initFn must be function");
        }

        // if val not set, safe to assume NOT read-only
        // (otherwise how would it ever get set?)
        if (config.val == null) {
            config.writable = true;
        }

        return config;
    }

    #setupMain(config) {
        // type is read-only value
        extd(this, "type", {value:config.type});

        // parent is read-only getter
        // (TODO: think about this. lazy lookup for big object seemed to make
        // more sense, but if parent is just captured by closure, maybe should
        // just be read-only value?)
        const {parent} = config;
        extd(this, "parent", {get:()=>parent});
    }

    #setupInit(config) {
        // if writeable, set an init function for later
        if (!config.writable) {
            return;
        }
        const {initFn,type,length,keys} = config;
        extd(this, "init", {value:function(...args) {
            if (initFn) {
                this.val = initFn(...args);
            }
            else {
                switch(type) {
                case "bln":
                    this.val = args?.[0] ?? false;
                    break;
                case "int":
                case "flt":
                    this.val = args?.[0] ?? 0;
                    break;
                case "str":
                    this.val = args?.[0] ?? "";
                    break;
                case "arr":
                    this.val = (args.length) ?
                        Array(...args) :
                        Array(length);
                    this.#val.forEach(i=>i.init());
                    break;
                case "obj":
                    this.val = new Map();
                    break;
                default:
                    this.val = new type(...args);
                    break;
                }
                // handle children (keys) for "obj"/TypeFn
                keys?.forEach((val,key)=>{
                    const accr = this.set(key, val?.val, val?.type);
                    if (val?.val == null) {
                        accr.init();
                    }
                });
            }
        }});
    }

    #setupDisplay(config) {
        if (!config.el) {
            return;
        }

        // TypeFn and potentially "obj"
        let display;
        let childEls;
        if (config.html) {
            const {el,html,keys} = config;

            // create temporary element in a template to create els for children
            const temp = document.createElement("template");
            const tempRoot = temp.content;
            childEls = {};
            tempRoot.insertHTML(html);
            keys.forEach((val,key)=>{
                const childEl = tempRoot.querySelector(`*[data-key="${key}"]`);
                if (!isEl(childEl)) {
                    throw new Error(`could not find HTMLElement for key: ${key}`);
                }
                childEls[key] = childEl;
            });

            display = ()=>{
                // move template content to real parent in dom
                el.appendChild(tempRoot);

                // dipslay children
                keys.forEach((val,key)=>this.#val[key].display());
            }
        }
        // array. simply call down to children
        else if (config.type === "arr") {
            display = ()=>this.#val?.forEach(i=>i.display());
        }
        // children of array. insert, don't replace, as they share a parent el
        else if (this.parent?.type === "arr") {
            console.log("children display");
            const {el} = config;
            display = ()=>el.insertHTML(this.val);
        }
        // assuming scalar value, or otherwise undhanled
        else {
            const {el} = config;
            display = ()=>{ el.innerHTML = this.val; }
        }

        extd(this, "display", {value:display});
        return childEls;
    }

    #setupAccessScalar(config) {
        // set/get val
        const type = config.type;
        const setter = v=>{
            switch(type) {
            case "bln":
                if (isStr(v)) {
                    v = v.trim().toLowerCase();
                    v = (v === "true");
                }
                else {
                    v = Number(v);
                    v = (v !== 0);
                }
                break;
            case "int":
                if (isStr(v))       v = parseInt(v);
                else if (isNum(v))  v = Math.floor(v);
                else                v = Number(v);
                break;
            case "flt":
                if (isStr(v))       v = parseFloat(v);
                else                v = Number(v);
                break;
            case "str":
                if (!isStr(v))      v = String(v);
                break;
            }
            this.#val = v;
        };

        extd(this, "val", {
            get: function() {
                return this.#val;
            },
            set: (!config.writable) ?
                function(v) {
                    throw new Error("scalar accessor is read-only");
                } :
                setter,
        });

        if (config.val) {
            setter(config.val);
        }
    }

    #setupAccessArr(config) {
        const {writable,childType,el,init} = config;

        const splice = (start, deleteCount, ...items)=>{
            // TODO listeners?
            if (this.#val === null) {
                this.#val = [];
            }
            if (deleteCount === undefined && items.length === 0) {
                this.#val.splice(start);
            }
            else {
                const fn = val=>Accessor.#child(
                    // arrays have no html (could change)
                    // so we pass the array's containing htmlelement (el) to
                    // the children
                    this,
                    {
                        el,
                        val,
                        writable,
                        init,
                        type:childType,
                    }
                );
                this.#val.splice(
                    start,
                    deleteCount,
                    ...items.map(fn)
                );
            }
        }
        const setter = v=>{
            if (v === null) {
                splice(0);
                this.#val = null;
                return;
            }

            if (!isArr(v)) {
                throw new Error("value must be array");
            }

            if (this.#val === null) {
                this.#val = [];
            }

            const oldLen = this.#val.length;
            const newLen = v.length;
            const minLen = Math.min(oldLen, newLen);

            // remove items if shorter
            if (newLen < oldLen) {
                splice(newLen);
            }

            // update items
            let i = 0;
            while (i < minLen) {
                this.#val[i].val = v[i];
                ++i;
            }

            // add items if longer
            if (newLen > oldLen) {
                splice(oldLen, 0, ...v.slice(oldLen));
            }
        };

        extd(this, "val", {
            get: function() {
                const v = this.#val;
                return (isArr(v)) ? v.map(accr=>accr.val) : v;
            },
            set: (config.writable) ?
                setter :
                ()=>{ throw new Error("array accessor is read-only") },
        });

        if (writable) {
            extd(this, "splice", {value: splice});

            extd(this, "push", {value:function(...args) {
                this.splice(0, 0, ...args);
            }});

            extd(this, "clear", {value:function() {
                this.splice(0);
            }})
        }

        if (config.val) {
            setter(config.val);
        }
    }

    #setupAccessObj(config) {
        const {writable,keys} = config;

        const keyTypes = {};
        keys.forEach((val,key)=> {
            if (val.type) {
                keyTypes[key] = val.type;
            }
        });

        const setItem = (key, val, type)=>{
            // single argument?
            if (val === undefined) {
                if (isPOJO(key)) {
                    key = new Map(Object.entries(key));
                }
                // single argument was map, set all keys individually
                if (is(key, Map)) {
                    key.forEach((val,key)=>this.set(key, val));
                    return;
                }
            }

            if (!is(this.#val, Map)) {
                this.#val = new Map();
            }

            if (type === undefined) {
                type = keyTypes[key] ?? Accessor.guessType(val);
            }

            const accr = Accessor.#child(
                this,
                {type, val, writable, ...keys.get(key)}
            );
            this.#val.set(key, accr);
            return accr;
        };

        const setMap = v=>{
            if (v === null) {
                this.#val.clear();
                return;
            }

            // POJO valid, but converted to map for processing
            if (isPOJO(v)) {
                v = new Map(Object.entries(v));
            }

            if (!is(v, Map)) {
                throw new Error("value must be POJO or Map");
            }

            // set if not set.
            // if new value is already empty map, use it
            if (this.#val === null) {
                this.#val = (v.size === 0) ? v : new Map();
            }

            // clear values not present in new value
            [...this.#val.keys()].forEach(key=>{
                if (!v.has(key)) {
                    this.#val.delete(key);
                }
            });

            // set new keys
            v.forEach((val,key)=>setItem(key, val));
        };

        extd(this, "val", {
            get: function() {
                const v = this.#val;
                if (!is(v, Map)) return v;
                const ret = Object.fromEntries(v);
                for (const key in ret) {
                    ret[key] = ret[key].val;
                }
                return ret;
            },
            set: (config.writable) ?
                setMap :
                ()=>{ throw new Error("obj accessor is read-only"); },
        });

        if (writable) {
            extd(this, "clear", {value:function() {
                this.#val?.clear();
            }});

            extd(this, "delete", {value:function(key) {
                this.#val?.delete(key);
            }});

            extd(this, "set", {value:setItem});
        }

        if (config.val) {
            setMap(config.val);
        }
    }

    #setupAccessTypeFn(config) {
        const {type,keys,writable,childEls} = config;
        const keyTypes = {};
        keys.forEach((val,key)=>{
            if (val.type) {
                keyTypes[key] = val.type;
            }
        });

        const setKey = (key, val, keyType)=>{
            if (!is(this.#val, type)) {
                this.val = new type();
            }

            if (keyType === undefined) {
                keyType = keyTypes[key] ?? Accessor.guessType(val);
            }

            this.#val[key] = Accessor.#child(
                this,
                {type:keyType, val, writable, ...keys.get(key), el:childEls[key]}
            );
            return this.#val[key];
        };

        extd(this, "val", {
            get: ()=>this.#val,
            set: (writable) ?
                v=>{ this.#val = v; } :
                v=>{ throw new Error(`${type} accessor is read-only`); },
        });

        if (writable) {
            extd(this, "set", {value:setKey});
        }

        if (config.val) {
            this.#val = config.val;
        }
    }

    #setupEditable(config) {
        if (config.type === "arr") {
            // extd(this, "editStart", {value:function(allDirty=false) {
            //     this.container.innerHTML = "";
            //     this.inputEl = this.container.insertHTML(
            //         `<input
            //             name="${this.#_.key}"
            //             type="${inputType}"
            //             value="${this.val}"
            //             data-prev-value="${allDirty?"":this.val}"
            //             required
            //             ${patternStr}
            //             ${minMaxStepStr}
            //         >`
            //     );
            //     this.inputEl.addKeyListener("Enter", e=>this.parent?.editSubmit());
            //     this.inputEl.addKeyListener("Escape", e=>this.parent?.editCancel());
            //     if (focusOnEdit) {
            //         this.inputEl.focus();
            //         this.inputEl.select();
            //     }
            // }});
        }

    }

    #setupReordable(config) {

    }

    #isNum      () { return Accessor.isNum(this.type);    }
    #isScalar   () { return Accessor.isScalar(this.type); }
    #isMulti    () { return Accessor.isMulti(this.type);  }
    #isTypeFn   () { return Accessor.isTypeFn(this.type);  }

    static isNum(t) {
        return (t === "bln" || t === "flt" || t === "int");
    }
    static isScalar(t) {
        return (t === "str" || Accessor.isNum(t));
    }
    static isMulti(t) {
        return (
            (isArr(t) && t.length === 1) ||
            t === "arr" ||
            t === "obj" ||
            isFn(t)
        );
    }

    static isTypeFn(t) {
        return (t?.prototype?.constructor === t);
    }

    static checkType(t) {
        if (isFn(t) ||
            t === "bln" ||
            t === "str" ||
            t === "int" ||
            t === "flt" ||
            t === "arr" ||
            t === "obj"
        ) {
            return;
        }
        throw new Error("invalid type");
    }

    static guessType(val) {
        if (val == null) {
            return "str"; // default type when unknown
        }
        if      (val === true || val === false) return "bln";
        else if (isNum(val))                    return "flt";
        else if (isStr(val))                    return "str";
        else if (isArr(val))                    return "arr";
        else if (isPOJO(val))                   return "obj";
        return Object.getPrototypeOf(val).constructor;
    }
};
