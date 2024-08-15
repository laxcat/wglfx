/*
    Generic utility code
*/

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
    If not found, returns item where item[defaultProp] is not falsy.
    If not found, return null.

    Example:

    const a = [
        {key: "a", data: "stuff", default: true},
        {key: "b", data: "junk"},
        {key: 0,   data: "things"},
        {key: 7,   data: "garbage"},
    ];
    a.findByKeyOrDefault();      // returns a[0]
    a.findByKeyOrDefault("b");   // returns a[1]
    a.findByKeyOrDefault(0);     // returns a[2]
    a.findByKeyOrDefault();      // returns a[0]

*/
Array.prototype.findByKeyOrDefault = function(key, keyProp="key", defaultProp="default") {
    // don't search for key if nullish, just try to find default
    if ((key ?? null) === null) {
        return this.find(item => item[defaultProp]);
    }

    // key passed, so we'll favor it, otherwise default if found
    const e = this.length;
    let i = 0;
    let defaultItem = null;
    while (i < e) {
        const item = this[i];
        // favor finding key
        if (item[keyProp] === key) {
            return item;
        }
        // note the default if we encounter it (uses first found)
        if (!defaultItem && item[defaultProp]) {
            defaultItem = item;
        }
        ++i;
    }
    return defaultItem;
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
