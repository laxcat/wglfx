/*
    Generic utility code
*/

// VARIABLE  "TYPE" DETECTION ----------------------------------------------- //

// https://masteringjs.io/tutorials/fundamentals/pojo
// "plain old javascript object"
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

export function isNumber(arg) {
    return (typeof arg === "number");
}

export function is(arg, Type) {
    return (arg instanceof Type);
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

// make getter/setter object
export function getSet(obj, prop, getStrProp) {
    return {
        get: () => { return obj[prop]; },
        getStr: (getStrProp === undefined) ?
                () => { return obj[prop].toString(); } :
                () => { return obj[getStrProp]; },
        set: v => { obj[prop] = v; },
    }
}

// msg, button1Text, button1Action, button2Text, button2Action...etc
export function confirmDialog(msg, ...buttonArgs) {
    const nArgs = buttonArgs.length;
    if (nArgs % 2) { // odd number of buttonArgs args
        throw new SyntaxError(`Odd number of parameters expected. ${nArgs} found.`);
    }
    // create button html
    let buttonEls = "";
    let i = 0; // button index
    let n = nArgs / 2; // number of buttons
    while (i < n) {
        const buttonText = buttonArgs[i*2];
        if (!isStr(buttonText)) {
            throw new SyntaxError(`Paremeter ${i*2+1} (${buttonText}) must be a string.`);
        }
        buttonEls += `<button tabindex=${i+1} value=${i+1}>${buttonText}</button>\n`;
        ++i;
    }
    // add dialog to end of body
    const dialog = document.body.appendHTML(`
        <dialog>
            <p>${msg}</p>
            ${buttonEls}
        </dialog>
    `);
    // add click event listeners to buttons
    i = 0;
    while (i < n) {
        const fn = buttonArgs[i*2+1] ?? (()=>{});
        if (!isFn(fn)) {
            throw new SyntaxError(`Paremeter ${i*2+2} (${fn}) must be a function.`);
        }
        dialog.children[i+1].addEventListener("click", e => {
            fn(e);
            dialog.close();
        });
        ++i;
    }
    // remove dialog html on close
    dialog.addEventListener("close", e => dialog.remove());
    // show it!
    dialog.showModal();
}

// 3RD PARTY ---------------------------------------------------------------- //

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
