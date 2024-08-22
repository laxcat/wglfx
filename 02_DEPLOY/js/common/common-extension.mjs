/*
    String, Array, ArrayBuffer/typed-array built-in objects extension
*/

// Add a property to prototype of builtIn (or anything really)
export function extend(builtIn, propName, propValue) {
    if (builtIn.prototype.hasOwnProperty(propName) === false) {
        builtIn.prototype[propName] = propValue;
    }
}

// Add a property to class/object itself on builtIn (or anything really)
export function extendStatic(builtIn, propName, propValue) {
    if (builtIn.hasOwnProperty(propName) === false) {
        builtIn[propName] = propValue;
    }
}

// String ------------------------------------------------------------------- //

extend(String, "toStartCase", function() {
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


// Array/Iterable ----------------------------------------------------------- //

extend(Array, "last", function() {
    return this.length ? this[this.length - 1] : null;
});

/*
    Find item in Array where item[keyProp] === key.
    key can be anything not nullish, including 0.
    If not found, returns item where item[defaultProp] is not falsy. (as in {default: true})
    If not found, returns item where item[keyProp] === defaultProp. (as in {key: "default"})
    If not found, returns first item in array.
    If array is empty returns null.

    Example:

    const a = [
        {key: "a", data: "stuff", default: true},
        {key: "b", data: "junk"},
        {key: 0,   data: "things"},
        {key: 7,   data: "garbage"},
    ];
    console.log(a.findByKeyOrDefault()    );  // returns a[0]
    console.log(a.findByKeyOrDefault("b") );  // returns a[1]
    console.log(a.findByKeyOrDefault(0)   );  // returns a[2]
    console.log(a.findByKeyOrDefault("7") );  // no strict match, returns default a[0]
    delete a[0].default;
    console.log(a.findByKeyOrDefault("7") );  // no strict match, no default, returns first item a[0]
*/
extend(Array, "findByKeyOrDefault", function(key, keyProp="key", defaultProp="default") {
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

extend(ArrayBuffer, "toBase64", function() {
    let arr = new Uint8Array(this);
    let str = "";
    arr.forEach(byte => str += String.fromCodePoint(byte));
    return window.btoa(str);
});
[   Int8Array,
    Uint8Array,
    Uint8ClampedArray,
    Int16Array,
    Uint16Array,
    Int32Array,
    Uint32Array,
    Float32Array,
    Float64Array,
    BigInt64Array,
    BigUint64Array
].forEach(builtIn=>extend(builtIn, "toBase64", function() {
    return this.buffer.toBase64();
}));

extend(String, "fromBase64", function() {
    const arr = window.atob(this)
                .split("")
                .map(byteStr => byteStr.codePointAt(0));
    return (new Uint8Array(arr)).buffer;
});

