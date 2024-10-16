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
            root: true,
            spider: true,
            default: true,
        });
    }

    // create accessor from type and lazy value
    static type(type, initFn=null) {
        const root = Accessor.isMulti(type);
        return new Accessor({
            type,
            initFn,
            default: (initFn === null),
            root,
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

    // static val(val) {
    //     const v = (isFn(val)) ? val : ()=>val;
    //     if      (isStr(val)) return Accessor.type("str", v);
    //     else if (isNum(val)) return Accessor.type("flt", v);
    //     else if (isArr(val)) return Accessor.type("arr", v);
    //     else if (isObj(val)) return Accessor.type("obj", v);
    //     else                 return Accessor.type(typeof val, );
    // }

    // static int(val) {
    //     if (!isNum(val) || val !== Math.round(val)) {
    //         throw new Error("val must be int");
    //     }
    //     const accr = Accessor.type("int");
    //     accr.val = val;
    //     return accr;
    // }

    constructor(config) {
        config = this.#internal.sanitizeConfig({
            // CONFIG DEFAULTS

            // "str" | "int" | "flt" | "arr" | "obj" | TypeFn
            type: "str",

            // this accessor is the root of a tree
            root: false,

            // if set initialize as default (which might spider?)
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

        this.#internal.setupMain(config);
        this.#internal.setupDisplay(config);
        this.#internal.setupEditable(config);
        this.#internal.setupReordable(config);
        this.#internal.init(config);

        // console.log("-------------------------");
        // console.log("accr");
        // console.log(this === this.#internal.root);
        // console.log(config);
        // console.log(this);
    }

    // internal values and functions all in this one private object
    // only like 90% sure this is good structure
    #internal = {
    val: null,
    type: null,

    sanitizeConfig: (config)=>{
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
        if (config.default) {
            config.writable = true;
        }
        if (config.root) {
            config.root = this;
        }
        else {
            config.root = config.parent?.root ?? null;
        }
        // //
        // if (config.keys) {
        //     config.type = "obj";
        // }
        return config;
    },

    setupMain: (config)=>{
        this.#internal.type = config.type;

        extd(this, "parent", {value:config.parent});
        extd(this, "root", {value:config.root});

        // if scalar
        if (this.#internal.isScalar()) {
            this.#internal.setupMainScalar(config);
        }
        else if (this.#internal.type === "arr") {
            this.#internal.setupMainArr(config);
        }
        else if (this.#internal.type === "obj") {
            this.#internal.setupMainObj(config);
        }
    },

    setupMainScalar: (config)=>{
        // set/get val
        extd(this, "val", {
            get: function() {
                return this.#internal.val;
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
                this.#internal.val = v;
            },
        });
    },

    setupMainArr: (config)=>{
        // set/get val
        extd(this, "val", {
            get: function() {
                const v = this.#internal.val;
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
                const intl = this.#internal;

                if (intl.val === null) {
                    intl.val = [];
                }

                const oldLen = intl.val.length;
                const newLen = v.length;
                const minLen = Math.min(oldLen, newLen);

                // remove items if shorter
                if (newLen < oldLen) {
                    this.splice(newLen);
                }

                // update items
                let i = 0;
                while (i < minLen) {
                    intl.val[i].val = v[i];
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
            if (this.#internal.val === null) {
                this.#internal.val = [];
            }
            if (deleteCount === undefined && items.length === 0) {
                this.#internal.val.splice(start);
            }
            else {
                const fn = item=>Accessor.#child(this, {
                    type: config.itemType,
                    initFn: ()=>item,
                    writable: config.writable,
                });
                this.#internal.val.splice(
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
    },

    setupMainObj: (config)=>{
        extd(this, "val", {
            get: function() {
                const v = this.#internal.val;
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

                const intl = this.#internal;

                // set if not set.
                // if new value is already empty map, use it
                if (intl.val === null) {
                    intl.val = (v.size === 0) ? v : new Map();
                }

                // clear values not present in new value
                [...intl.val.keys()].forEach(key=>{
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
            this.#internal.val?.clear();
        }});

        extd(this, "delete", {value:function(key){
            this.#internal.val?.delete(key);
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

            const intl = this.#internal;
            if (!is(intl.val, Map)) {
                intl.val = new Map();
            }

            if (type === undefined) {
                if      (isNum(value))  type = "flt";
                else if (isStr(value))  type = "str";
                else if (isArr(value))  type = "arr";
                else if (isPOJO(value)) type = "obj";
                else if (isFn(value))   type = typeof value;
            }

            intl.val.set(key, Accessor.#child(this, {
                type,
                initFn: ()=>value,
                writable: config.writable,
            }));
        }});
    },

    setupDisplay: (config)=>{

    },

    setupEditable: (config)=>{

    },

    setupReordable: (config)=>{

    },

    init: (config)=>{
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
    },

    isNum:      ()=>Accessor.isNum(this.#internal.type),
    isScalar:   ()=>Accessor.isScalar(this.#internal.type),
    isMulti:    ()=>Accessor.isMulti(this.#internal.type),

    }; // END INTERAL

    static isNum = (t)=>{
        return (t === "flt" || t === "int");
    };
    static isScalar = (t)=>{
        return (t === "str" || Accessor.isNum(t));
    };
    static isMulti = (t)=>{
        return (
            (isArr(t) && t.length === 1) ||
            t === "arr" ||
            t === "obj" ||
            isFn(t)
        );
    }
};
