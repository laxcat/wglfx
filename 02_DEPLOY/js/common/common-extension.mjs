/*
    String, Array, ArrayBuffer/typed-array built-in objects extension
*/

// simple shortcut
export const defProp = Object.defineProperty;

// Shortcut for Object.defineProperty, but with check
export function extd(builtIn, propName, options) {
    // do nothing if set already
    if (builtIn.hasOwnProperty(propName)) {
        console.error("WARNING COULD NOT SET!", builtIn, propName);
        return;
    }
    Object.defineProperty(builtIn, propName, options);
}

// replace:
// extd(Foo.prototype, "newKey", {value:0, writeable:true});
// w/ shortcut:
// extdProto(Foo, "newKey", 0, true);
export function extdProto(builtIn, propName, propValue, writeable=false) {
    extd(builtIn.prototype, propName, {
        value: propValue,
        writable: writeable,
    });
}

// String/TextEncoder ------------------------------------------------------- //

extdProto(String, "toStartCase", function() {
    let str = "";
    const len = this.length;
    // was previous character whitespace?
    let prevIsWS = true;
    // for each char in string...
    for (let i = 0; i < len; ++i) {
        // is this char whitespace?
        const isWS = (
            this[i] === " "  ||
            this[i] === "\n" ||
            this[i] === "\t" ||
            this[i] === "-"  ||
            this[i] === "_"
        );
        // this char mets requirements to be upper cased
        if (prevIsWS && !isWS) {
            str += this[i].toUpperCase();
            prevIsWS = false;
        }
        // all other characters are copied over
        else {
            str += this[i];
            prevIsWS = isWS;
        }
    }
    return str;
});

extd(TextEncoder, "encodeInto", {value: function(str, uint8Array) {
    const te = new TextEncoder();
    let obj = te.encodeInto(str, uint8Array);
    obj.ptr = uint8Array.byteOffset;
    obj.size = obj.written;
    return obj;
}});

// Don't need for now. Uses eval-adjacent code. Proabaly don't use or strictly
// limit input string to known variables and strip anything else.
// Was thinking about using for templated strings in JSON, specifically for an
// external SVG JSON database.
// https://stackoverflow.com/a/41015840
// String.prototype.interpolate = function(params) {
//   const names = Object.keys(params);
//   const vals = Object.values(params);
//   return new Function(...names, `return \`${this}\`;`)(...vals);
// };

// Array/Iterable ----------------------------------------------------------- //

extdProto(Array, "last", function() {
    return this.length ? this[this.length - 1] : null;
});

/*
    Find item in Array by key
    Designed to have maximum fallback, failing only if the array is empty.

    RULES:
    Prioritiezes finding item where item[keyProp] === key.
    key can be anything not nullish, including 0.
    If not found, returns item where item[defaultProp] is not falsy. (as in {default: true})
    If not found, returns item where item[keyProp] === defaultProp. (as in {key: "default"})
    If not found, returns first item in array.
    If array is empty returns null.

    Example:

    const a = [
        {key: "a", data: "stuff"},
        {key: "b", data: "junk"},
        {key: 0,   data: "things"},
        {key: 7,   data: "bobbles", default: true},
    ];
    console.log(a.findByKeyOrDefault()    );    // returns a[3]
    console.log(a.findByKeyOrDefault("b") );    // returns a[1]
    console.log(a.findByKeyOrDefault(0)   );    // returns a[2]
    console.log(a.findByKeyOrDefault("7") );    // no strict match, returns a[0]
    delete a[3].default;
    console.log(a.findByKeyOrDefault("7") );    // no strict match, no default,
                                                // returns first item a[0]
*/
extdProto(Array, "findByKeyOrDefault", function(key, keyProp="key", defaultProp="default") {
    // shortcut quickly if array is empty
    const e = this.length;
    if (e === 0) return null;

    // search according to rules
    let i = 0;
    let defaultByProp = null;
    let defaultByKey = null;
    const lookForKey = ((key ?? null) !== null);
    while (i < e) {
        const item = this[i];
        // favor finding key, if it was defined
        if (lookForKey && item[keyProp] === key) {
            // RETURN AS SOON AS FOUND!!
            return item;
        }
        // note this item has a non-falsy default prop
        if (!defaultByProp && item[defaultProp]) {
            defaultByProp = item;
        }
        // note this item's key is set to defaultProp
        if (!defaultByKey && lookForKey && item[keyProp] === defaultProp) {
            defaultByKey = item;
        }
        ++i;
    }
    // key not found. return default according to rules
    return defaultByProp || defaultByKey || this[0];
});

// Base64 Encoding/Decoding ------------------------------------------------- //

extdProto(ArrayBuffer, "toBase64", function() {
    let arr = new Uint8Array(this);
    let str = "";
    arr.forEach(byte => str += String.fromCodePoint(byte));
    return window.btoa(str);
});
// [   Int8Array,
//     Uint8Array,
//     Uint8ClampedArray,
//     Int16Array,
//     Uint16Array,
//     Int32Array,
//     Uint32Array,
//     Float32Array,
//     Float64Array,
//     BigInt64Array,
//     BigUint64Array
// ].forEach(builtIn=>extdProto(builtIn, "toBase64", function() {
//     return this.buffer.toBase64();
// }));

extdProto(String, "fromBase64", function() {
    const arr = window.atob(this)
                .split("")
                .map(byteStr => byteStr.codePointAt(0));
    return (new Uint8Array(arr)).buffer;
});

