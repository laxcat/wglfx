/*
    HTMLElement, HTMLCollection built-in objects extension

    Add html insertion helpers, and WebGL shortcut export.
*/
import { extdProto } from "./common-extension.mjs"

// wraps insertAdjacentHTML
// returns HTMLElement or Array of HTMLElement for inserted elements
// ignores all text-nodes both in the target and inserted elements (for example
// inserted text elements will be inserted, but not returned)
extdProto(HTMLElement, "insertHTML", function(html, config={}) {
    config = {
        position: "beforeend",      // insertAdjacentHTML position
        alwaysReturnArray: false,   // if true never returns single element
        require: undefined,         // if set, throws if return count doesn't match
        ...config,
    };
    const oldPrev = this.previousElementSibling;
    const oldNext = this.nextElementSibling;
    const oldFrst = this.firstElementChild;
    const oldLast = this.lastElementChild;
    this.insertAdjacentHTML(config.position, html);
    const newPrev = this.previousElementSibling;
    const newNext = this.nextElementSibling;
    const newFrst = this.firstElementChild;
    const newLast = this.lastElementChild;

    let walkS, walkE;
    // "beforebegin", probably
    if (oldPrev !== newPrev) {
        walkS = oldPrev?.nextElementSibling ?? this.parentElement.firstElementChild;
        walkE = this;
    }
    // "afterbegin", probably
    else if (oldFrst !== newFrst) {
        walkS = newFrst;
        walkE = oldFrst;
    }
    // "beforeend", probably
    else if (oldLast !== newLast) {
        walkS = oldLast.nextElementSibling;
        walkE = null;
    }
    // "afterend", probably
    else if (oldNext !== newNext) {
        walkS = newNext;
        walkE = oldNext;
    }

    let el = walkS;
    let ret = [];
    while (el !== walkE) {
        ret.push(el);
        el = el.nextElementSibling;
    }

    if (config.require !== undefined &&
        config.require !== ret.length) {
        throw new Error(
            `insertHTML set to require exactly ${config.require} inserted elements; `+
            `${ret.length} inserted`
        );
    }
    if (!config.alwaysReturnArray && ret.length === 1) {
        return ret[0];
    }
    return ret;
});

extdProto(Element, "elementIndex", function() {
    return this.parentElement.children.indexOf(this);
});

// scans from end first
extdProto(HTMLCollection, "indexOf", function(el) {
    let i = this.length;
    while (i--) {
        if (this[i] === el) return i;
    }
    return undefined;
});

extdProto(HTMLCollection, "slice", function(start, end) {
    let ret = [];
    let i = start;
    while (i < end) {
        ret.push(this[i]);
        ++i;
    }
    return ret;
});

extdProto(HTMLCollection, "last", function() {
    return this.length ? this[this.length - 1] : null;
});

extdProto(HTMLCollection, "forEach", function(fn) {
    const e = this.length;
    let i = 0;
    while (i < e) {
        fn(this[i], i);
        ++i;
    }
});

extdProto(HTMLCollection, "map", function(fn) {
    let ret = [];
    const e = this.length;
    let i = 0;
    while (i < e) {
        ret.push(fn(this[i], i, ret));
        ++i;
    }
    return ret;
});

extdProto(EventTarget, "addKeyListener", function(key, fn, options) {
    this.addEventListener("keydown", e=>{if (e.key===key) fn(e)}, options);
});
