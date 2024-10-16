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
            root: rootType,
            spider: true,
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
    static #parent = null;
    static #child(parent, config) {
        this.#parent = parent;
        const acc = new Accessor(config);
        this.#parent = null;
        return acc;
    }

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

            // set to Type where Type["typeKey"] is config object
            root: null,

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
            itemType: "str",

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
        });

        this.#internal.setupMain(config);
        this.#internal.setupChildren(config);
        this.#internal.setupDisplay(config);
        this.#internal.setupEditable(config);
        this.#internal.setupReordable(config);
        this.#internal.init(config);
    }

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
            if (isFn(config.itemType) ||
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
        // //
        // if (config.keys) {
        //     config.type = "obj";
        // }
        return config;
    },

    setupMain: (config)=>{
        this.#internal.type = config.type;

        // anything can have a parent
        if (Accessor.#parent) {
            extd(this.#internal, "parent", {value:Accessor.#parent});
        }

        // if scalar
        if (this.#internal.isScalar()) {
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
        }
        else if (this.#internal.type === "arr") {
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
        }
        else if (this.#internal.type === "obj") {
            // set/get val
            extd(this, "val", {
                get: function() {
                    const v = this.#internal.val;
                    if (!is(v, Map)) return v;
                    return Object.fromEntries(v);
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
                            intl.val.delete(key);
                        }
                    });

                    // set new keys
                    v.forEach((val,key)=>intl.val.set(key, val));
                },
            });
        }
    },

    setupChildren: (config)=>{
        // if (config.type === "obj") {
        //     this.val = new Map();
        //     config.keys.forEach(key=>this.val.set(key, null));
        // }
        // else if (config.type === "arr") {
        //     this.val = Array(config.length).fill(null);
        // }
        if (config.type === "arr") {
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
        }
        else if (config.type === "obj") {
            extd(this, "clear", {value:function(){
                this.#internal.val?.clear();
            }});

            extd(this, "delete", {value:function(key){
                this.#internal.val?.delete(key);
            }});

            extd(this, "set", {value:function(key, value){
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
                intl.val.set(key, value);
            }});
        }
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
            this.#internal.val = config.initFn();
        }
    },

    isNum: ()=>{
        const t = this.#internal.type;
        return (t === "flt" || t === "int");
    },
    isScalar: ()=>{
        const intl = this.#internal;
        return (intl.type === "str" || intl.isNum());
    },

    }; // END INTERAL
};
