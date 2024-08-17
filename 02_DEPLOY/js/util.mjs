/*
    Generic utility code
*/

// VAR "TYPE" DETECTION ///////////////////////////////////////////////////// //

// https://masteringjs.io/tutorials/fundamentals/pojo
export function isPOJO(arg) {
    if (arg == null || typeof arg !== 'object') {
        return false;
    }
    const proto = Object.getPrototypeOf(arg);
    if (proto == null) {
        return true; // `Object.create(null)`
    }
    return proto === Object.prototype;
}

export function isArray(arg) {
    return (arg instanceof Array);
}

export function isFn(arg) {
    return (typeof arg === "function");
}

export function isStr(arg) {
    return (typeof arg === "string");
}

// UTILITY ////////////////////////////////////////////////////////////////// //

export function loadFileSync(path) {
    console.log("loadFileSync", path);
    let request = new XMLHttpRequest();
    request.open("GET", path, false);
    request.send();
    if (request.status === 200) {
        return request.responseText;
    }
    return null;
}

// https://stackoverflow.com/a/14810722
export function objectMap(obj, fn) {
    return Object.fromEntries(
        Object.entries(obj).map(
            ([k, v], i) => [k, fn(v, k, i)]
        )
    );
}


// BUILT-IN CLASS PROTOTYPE ADDITIONS /////////////////////////////////////// //

// String ------------------------------------------------------------------- //

String.prototype.toStartCase = function() {
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
}

// Array/Iterable ----------------------------------------------------------- //

Array.prototype.last =
HTMLCollection.prototype.last = function() {
    return this.length ? this[this.length - 1] : null;
}

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
    console.log(a.findByKeyOrDefault("7") );  // no strict match, no default, returns null
*/
Array.prototype.findByKeyOrDefault = function(key, keyProp="key", defaultProp="default") {
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
}


// Base64 Encoding/Decoding ------------------------------------------------- //

ArrayBuffer.prototype.toBase64 = function() {
    let arr = new Uint8Array(this);
    let str = "";
    arr.forEach(byte => str += String.fromCodePoint(byte));
    return window.btoa(str);
}
Int8Array.prototype.toBase64 =
Uint8Array.prototype.toBase64 =
Uint8ClampedArray.prototype.toBase64 =
Int16Array.prototype.toBase64 =
Uint16Array.prototype.toBase64 =
Int32Array.prototype.toBase64 =
Uint32Array.prototype.toBase64 =
Float32Array.prototype.toBase64 =
Float64Array.prototype.toBase64 =
BigInt64Array.prototype.toBase64 =
BigUint64Array.prototype.toBase64 = function() {
    return this.buffer.toBase64();
}

String.prototype.fromBase64 = function() {
    const arr = window.atob(this)
                .split("")
                .map(byteStr => byteStr.codePointAt(0));
    return (new Uint8Array(arr)).buffer;
}


// 3RD PARTY //////////////////////////////////////////////////////////////// //

// https://stackoverflow.com/a/34749873 ------------------------------------- //
/**
 * Simple object check.
 * @param item
 * @returns {boolean}
 */
export function isObject(item) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

/**
 * Deep merge two objects.
 * @param target
 * @param ...sources
 */
export function mergeDeep(target, ...sources) {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return mergeDeep(target, ...sources);
}
// --------------------------------- end https://stackoverflow.com/a/34749873 //
