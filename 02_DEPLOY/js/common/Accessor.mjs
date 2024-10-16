import { extd } from "./common-extension.mjs"
import "./html-extension.mjs"
import { is, isFn, isStr, isNum, isArr, isBool, isPOJO } from "./util.mjs"

export default class Accessor {

    static typeConfigKey = "define";

    // create accessor from tree of types
    static tree(type) {
        if (type[Accessor.typeConfigKey] == null) {
            throw new Error(`tree root type must have "${Accessor.typeConfigKey}" static config object`);
        }
        return new Accessor({
            type,
            init: true,
        });
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

            // "str" | "int" | "flt" | "arr" | "obj" | TypeFn
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

            // type must be obj or TypeFn, el must be set
            html: null,

            // user editable. el+html must be set.
            editable: false,

            // user can reorder elements. must be arr+editable.
            reorderable: false,

            // override with user settings
            ...config,

            // some settings can't be configured by calling constructor
            // parent only set in #child constructor
            parent: Accessor.#parent,

            ...(
                (config?.type?.[Accessor.typeConfigKey]) ?
                config.type[Accessor.typeConfigKey] :
                {}
            ),
        });


        this.#setupMain(config);
        this.#setupDisplay(config);
        this.#setupEditable(config);
        this.#setupReordable(config);

        // console.log(this.#type);
        // console.log(config);
        // console.log("------------------------");

        if (config.init) {
            this.init();
        }

        // console.log("-------------------------");
        // console.log("accr");
        // console.log(this === this.#root);
        // console.log(config);
        // console.log(this);
    }


    #val = null;
    #type = null;

    #sanitizeConfig(config) {

        // TYPE RELATED CODE PATHS:
        // 1) type set (becomes authority)
        //    a) val set
        //       gets coerced to type for scalars,
        //       errors if mismatched for arr/obj/typefn
        //    b) initFn set, gets coerced when resolved on init
        //    c) no value set, gets defaulted on init
        // 2) type not set
        //    a) val set, is used to guess type
        //    b) val not set, can't detect type. use default type.
        //
        // once above is resolved, if type is "arr", childType can be set to
        // force type of children. childType is never guessed, only set by
        // user. if not set, child accessors will guess for themselves.
        //
        // val and initFn can't both be set. will throw error.

        if (!config.type) {
            config.type = Accessor.guessType(config.val);
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

        if (config.val && config.initFn) {
            throw new Error("set val or initFn, not both");
        }

        // check initFn
        if (config.initFn && !isFn(config.initFn)) {
            throw new Error("initFn must be function");
        }

        // if val not set, safe to assume NOT read-only
        if (config.val == null) {
            config.writable = true;
        }

        return config;
    }

    #setupMain(config) {
        this.#type = config.type;

        extd(this, "parent", {get:()=>config.parent});

        // setup main access functions
        if (this.#isScalar()) {
            this.#setupMainScalar(config);
        }
        else if (this.#type === "arr") {
            this.#setupMainArr(config);
        }
        else if (this.#type === "obj") {
            this.#setupMainObj(config);
        }
        else if (this.#isTypeFn()) {
            this.#setupMainTypeFn(config);
        }

        // if writeable, set an init function for later
        if (config.writable) {
            extd(this, "init", {value:function(...args) {
                if (config.initFn) {
                    this.val = config.initFn(...args);
                }
                else {
                    switch(config.type) {
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
                                Array(config.length);
                            break;
                        case "obj":
                            this.val = new Map();
                            break;
                        default:
                            this.val = new config.type(...args);
                    }
                }
            }});
        }
    }

    #setupMainScalar(config) {
        // set/get val
        const type = config.type;
        const setter = v=>{
            switch(type) {
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

    #setupMainArr(config) {
        const splice = (start, deleteCount, ...items)=>{
            // TODO listeners?
            if (this.#val === null) {
                this.#val = [];
            }
            if (deleteCount === undefined && items.length === 0) {
                this.#val.splice(start);
            }
            else {
                const fn = val=>Accessor.#child(this, {val,writable});
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

        const writable = config.writable;
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

    #setupMainObj(config) {
        const writable = config.writable;

        const setItem = (key, val, type)=>{
            if (key === "types") {
                throw new Error("types key is reserved");
            }

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
                type = Accessor.guessType(val);
            }

            this.#val.set(key, Accessor.#child(this, {type,val,writable}));
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
            v.forEach((val,key)=>{
                if (key !== "types") {
                    setItem(key, val, v.get("types")?.[key]);
                }
            });
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
            extd(this, "clear", {value:function(){
                this.#val?.clear();
            }});

            extd(this, "delete", {value:function(key){
                this.#val?.delete(key);
            }});

            extd(this, "set", {value:setItem});
        }

        if (config.val) {
            setMap(config.val);
        }
    }

    #setupMainTypeFn(config) {
        if (config.val) {
            this.#val = config.val;
        }
    }

    #setupDisplay(config) {

    }

    #setupEditable(config) {

    }

    #setupReordable(config) {

    }

    #isNum      () { return Accessor.isNum(this.#type);    }
    #isScalar   () { return Accessor.isScalar(this.#type); }
    #isMulti    () { return Accessor.isMulti(this.#type);  }
    #isTypeFn   () { return Accessor.isTypeFn(this.#type);  }

    static isNum(t) {
        return (t === "flt" || t === "int");
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
        if      (isNum(val))  return "flt";
        else if (isStr(val))  return "str";
        else if (isArr(val))  return "arr";
        else if (isPOJO(val)) return "obj";
        return Object.getPrototypeOf(val).constructor;
    }
};
