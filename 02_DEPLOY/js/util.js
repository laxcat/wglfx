// UTILITY ////////////////////////////////////////////////////////////////// //

export function loadFileSync(path) {
    console.log("loadFileSync", path);
    let request = new XMLHttpRequest();
    request.open("GET", path, false);
    request.send();
    if (request.status == 200) {
        return request.responseText;
    }
    return null;
}


// BUILT-IN CLASS PROTOTYPE ADDITIONS /////////////////////////////////////// //

// WebGL -------------------------------------------------------------------- //

WebGLRenderingContext.prototype.throwErrors =
WebGL2RenderingContext.prototype.throwErrors = function() {
    const errs = this.getErrorsStrings();
    errs.forEach(err => { throw err; });
}

WebGLRenderingContext.prototype.logErrors =
WebGL2RenderingContext.prototype.logErrors = function(msg) {
    const errs = this.getErrorsStrings();
    if (errs.length) {
        console.log(`%c`+
            `${msg} errors found in ${this}:\n`+
            `\t${Error().stack.replaceAll("\n", "\n\t")}\n\n`+
            `\t${errs.join("\n\t")}`,
            "color:red;"
        );
    }
    return errs;
}

WebGLRenderingContext.prototype.getErrorsStrings =
WebGL2RenderingContext.prototype.getErrorsStrings = function() {
    let errs = [];
    let err;
    while ((err = this.getError())) {
        switch(err) {
        case this.INVALID_ENUM:                   errs.push("INVALID_ENUM");
        case this.INVALID_VALUE:                  errs.push("INVALID_VALUE");
        case this.INVALID_OPERATION:              errs.push("INVALID_OPERATION");
        case this.INVALID_FRAMEBUFFER_OPERATION:  errs.push("INVALID_FRAMEBUFFER_OPERATION");
        case this.OUT_OF_MEMORY:                  errs.push("OUT_OF_MEMORY");
        case this.CONTEXT_LOST_WEBGL:             errs.push("CONTEXT_LOST_WEBGL");
        default: {};
        }
    }
    return errs;
}

WebGLRenderingContext.prototype.framebufferStatusString =
WebGL2RenderingContext.prototype.framebufferStatusString = function() {
    const status = this.checkFramebufferStatus(this.FRAMEBUFFER);
    switch(status) {
    case this.FRAMEBUFFER_COMPLETE:                         return "FRAMEBUFFER_COMPLETE";
    case this.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:            return "FRAMEBUFFER_INCOMPLETE_ATTACHMENT";
    case this.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:    return "FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT";
    case this.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:            return "FRAMEBUFFER_INCOMPLETE_DIMENSIONS";
    case this.FRAMEBUFFER_UNSUPPORTED:                      return "FRAMEBUFFER_UNSUPPORTED";
    case this.FRAMEBUFFER_INCOMPLETE_MULTISAMPLE:           return "FRAMEBUFFER_INCOMPLETE_MULTISAMPLE";
    default:                                                return "FRAMEBUFFER_UNKNOWN_STATUS";
    }
    return status;
}

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
    return this[this.length - 1];
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
