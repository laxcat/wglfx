import { extd } from "./common-extension.mjs"
import "./html-extension.mjs"
import { is, isFn, isStr, isNum, isArr, isBool, isPOJO } from "./util.mjs"

export default class Accessor {

    static typeKey = "define";

    // create accessor from tree of types
    static tree(rootType) {
        if (rootType[Accessor.typeKey] == null) {
            throw new Error(`rootType must have "${Accessor.typeKey}" static config object`);
        }
        return new Accessor({
            ...rootType[Accessor.typeKey],
            type: rootType,
            default: true,
        });
    }

    // create accessor from type and lazy value
    static type(type, initFn=null) {
        return new Accessor({
            type,
            initFn,
            default: (initFn === null),
        });
    }

    // create child accessor
    static #child(parent, config) {
        this.#parent = parent;
        const acc = new Accessor(config);
        this.#parent = null;
        return acc;
    }
    static #parent = null;

    static val(val, type) {
        let itemType = null;
        if (type === undefined) {
            if (isArr(val) && val.length > 0) {
                type = "arr";
                itemType = Accessor.guessType(val[0]);
            }
            else {
                type = Accessor.guessType(val);
            }
        }
        return new Accessor({
            type,
            itemType,
            initFn:()=>val,
        });
    }

    constructor(config) {
        config = this.#sanitizeConfig({
            // CONFIG DEFAULTS

            // "str" | "int" | "flt" | "arr" | "obj" | TypeFn
            type: "str",

            // if set initialize as default
            default: false,

            // if set initialize with this value
            initFn: null,

            // OBJ
            keys: null,

            // ARR
            // length of default array
            length: null,
            // children of array type. CANNOT BE ARRAY.
            itemType: null,

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
        });

        this.#setupMain(config);
        this.#setupDisplay(config);
        this.#setupEditable(config);
        this.#setupReordable(config);
        this.#init(config);

        // console.log("-------------------------");
        // console.log("accr");
        // console.log(this === this.#root);
        // console.log(config);
        // console.log(this);
    }


    #val = null;
    #type = null;

    #sanitizeConfig(config) {
        // parse type shortcut for arrays
        // ["str"] array of strings
        // [Type]  array of Type
        // ["arr"] is invalid, no array of arrays
        if (isArr(config.type) && config.type.length === 1) {
            config.itemType = config.type[0];
            config.type = "arr";
        }
        // check type
        else if (isFn(config.type) ||
            config.type === "str" ||
            config.type === "int" ||
            config.type === "flt" ||
            config.type === "arr" ||
            config.type === "obj"
        ) {
            // ok type, move on
        }
        else {
            throw new Error("invalid type");
        }
        // check array things
        if (config.type === "arr") {
            // check itemType
            if (config.itemType === null) {
                config.itemType = "str";
            }
            else if (isFn(config.itemType) ||
                config.itemType === "str" ||
                config.itemType === "int" ||
                config.itemType === "flt" ||
                config.itemType === "arr" ||
                config.itemType === "obj"
            ) {
                // ok itemType, move on
            }
            else {
                throw new Error("invalid itemType");
            }
            // set array length if not set
            if (config.length === null) {
                config.length = 0;
            }
        }
        // check initFn
        if (config.initFn && !isFn(config.initFn)) {
            throw new Error("initFn must be function");
        }
        // TODO check type of initFn return? check type of val generally?
        // check default
        if (!isBool(config.default)) {
            throw new Error("default must be bool");
        }
        // default always sets writable to true. TODO: why?
        if (config.default || config.initFn) {
            config.writable = true;
        }
        // //
        // if (config.keys) {
        //     config.type = "obj";
        // }
        return config;
    }

    #setupMain(config) {
        this.#type = config.type;

        extd(this, "parent", {get:()=>config.parent});

        // if scalar
        if (this.#isScalar()) {
            this.#setupMainScalar(config);
        }
        else if (this.#type === "arr") {
            this.#setupMainArr(config);
        }
        else if (this.#type === "obj") {
            this.#setupMainObj(config);
        }
    }

    #setupMainScalar(config) {
        // set/get val
        extd(this, "val", {
            get: function() {
                return this.#val;
            },
            set: (!config.writable) ? undefined : function(v) {
                switch(config.type) {
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
            },
        });
    }

    #setupMainArr(config) {
        // set/get val
        extd(this, "val", {
            get: function() {
                const v = this.#val;
                return (isArr(v)) ? v.map(accr=>accr.val) : v;
            },
            set: (!config.writable) ? undefined : function(v) {
                if (v === null) {
                    this.splice(0);
                    this.val = null;
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
                    this.splice(newLen);
                }

                // update items
                let i = 0;
                while (i < minLen) {
                    this.#val[i].val = v[i];
                    ++i;
                }

                // add items if longer
                if (newLen > oldLen) {
                    this.splice(oldLen, 0, ...v.slice(oldLen));
                }
            },
        });

        extd(this, "splice", {value:function(start, deleteCount, ...items) {
            // TODO listeners?
            if (this.#val === null) {
                this.#val = [];
            }
            if (deleteCount === undefined && items.length === 0) {
                this.#val.splice(start);
            }
            else {
                const fn = item=>Accessor.#child(this, {
                    type: config.itemType,
                    initFn: ()=>item,
                    writable: config.writable,
                });
                this.#val.splice(
                    start,
                    deleteCount,
                    ...items.map(fn)
                );
            }
        }});

        extd(this, "push", {value:function(...args) {
            this.splice(0, 0, ...args);
        }});

        extd(this, "clear", {value:function() {
            this.splice(0);
        }})
    }

    #setupMainObj(config) {
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
            set: (!config.writable) ? undefined : function(v) {
                if (v === null) {
                    this.clear();
                    this.val = null;
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
                        this.delete(key);
                    }
                });

                // set new keys
                v.forEach((val,key)=>{
                    if (key !== "types") {
                        this.set(key, val, v.get("types")?.[key]);
                    }
                });
            },
        });

        extd(this, "clear", {value:function(){
            this.#val?.clear();
        }});

        extd(this, "delete", {value:function(key){
            this.#val?.delete(key);
        }});

        extd(this, "set", {value:function(key, value, type){
            if (key === "types") {
                throw new Error("types key is reserved");
            }

            // single argument?
            if (value === undefined) {
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
                type = Accessor.guessType(value);
            }

            this.#val.set(key, Accessor.#child(this, {
                type,
                initFn: ()=>value,
                writable: config.writable,
            }));
        }});
    }

    #setupDisplay(config) {

    }

    #setupEditable(config) {

    }

    #setupReordable(config) {

    }

    #init(config) {
        if (config.default) {
            switch(config.type) {
                case "int":
                case "flt": this.val = 0;                    break;
                case "str": this.val = "";                   break;
                case "arr": this.val = Array(config.length); break;
                case "obj": this.val = new Map();            break;
                default:    this.val = new config.type();
            }
        }
        else if (config.initFn) {
            this.val = config.initFn();
        }
    }

    #isNum      () { return Accessor.isNum(this.#type);    }
    #isScalar   () { return Accessor.isScalar(this.#type); }
    #isMulti    () { return Accessor.isMulti(this.#type);  }

    static isNum = t=>{
        return (t === "flt" || t === "int");
    }
    static isScalar = t=>{
        return (t === "str" || Accessor.isNum(t));
    }
    static isMulti = t=>{
        return (
            (isArr(t) && t.length === 1) ||
            t === "arr" ||
            t === "obj" ||
            isFn(t)
        );
    }
    static guessType = val=>{
        if      (isNum(val))  return "flt";
        else if (isStr(val))  return "str";
        else if (isArr(val))  return "arr";
        else if (isPOJO(val)) return "obj";
        return typeof val;
    }
};
