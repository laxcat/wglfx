/*
    Generic utility code
*/

// VARIABLE  "TYPE" DETECTION ----------------------------------------------- //

// https://masteringjs.io/tutorials/fundamentals/pojo
// is "plain old javascript object"?
export function isPOJO(arg) {
    if (arg == null || typeof arg !== "object") {
        return false;
    }
    const proto = Object.getPrototypeOf(arg);
    if (proto == null) {
        return true; // `Object.create(null)`
    }
    return proto === Object.prototype;
}

export function isArr(arg) {
    return (arg instanceof Array);
}

export function isFn(arg) {
    return (typeof arg === "function");
}

export function isStr(arg) {
    return (typeof arg === "string");
}

export function isNum(arg) {
    return (typeof arg === "number");
}

export function is(arg, Type) {
    return (arg instanceof Type);
}

export function isEl(arg) {
    return is(arg, HTMLElement);
}

export function isEls(arg) {
    if (is(arg, HTMLCollection)) return true;
    if (isArr(arg) && arg.every(a=>isEl(a))) return true;
    return false;
}

// returns HTMLElement or null
export function ifElFn(arg, ...args) {
    let el;
    if (!isFn(arg) || !isEl(el = arg(...args))) return null;
    return el;
}

// UTILITY ------------------------------------------------------------------ //

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

export function loadJSONSync(url) {
    const str = loadFileSync(url);
    let obj = {};
    try {
        obj = JSON.parse(str);
    }
    catch (e) {
        console.log(`WARNING. Could not parse ${url}.`);
    }
    return obj;
}

// https://stackoverflow.com/a/14810722
export function objectMap(obj, fn) {
    return Object.fromEntries(
        Object.entries(obj).map(
            ([k, v], i) => [k, fn(v, k, i)]
        )
    );
}

// make getter/setter object (replaced by Accessor)
export function getSet(obj, prop, getStrProp) {
    return {
        obj,
        prop,
        getStrProp,
        get() { return this.obj[this.prop]; },
        getStr() { return (this.getStrProp === undefined) ?
                this.obj[this.prop].toString() :
                this.obj[this.getStrProp]; },
        set(v) { obj[prop] = v; },
    }
}

// 3RD PARTY ---------------------------------------------------------------- //

// https://stackoverflow.com/a/34749873 ------------------------------------- //
/**
 * Deep merge two objects.
 * @param target
 * @param ...sources
 */
export function mergeDeep(target, ...sources) {
  if (!sources.length) return target;
  const source = sources.shift();

  const isObject = item=>{
    return (item && typeof item === 'object' && !Array.isArray(item));
  }

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
