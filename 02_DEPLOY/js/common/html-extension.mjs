/*
    HTMLElement, HTMLCollection built-in objects extension

    Add html insertion helpers, and WebGL shortcut export.
*/
import { extdProto } from "./common-extension.mjs"

extdProto(Element, "appendHTML", function(html) {
    const oldLen = this.children.length;
    this.insertAdjacentHTML("beforeend", html);
    const newLen = this.children.length;

    // exactly one node added, return one node
    if (newLen === oldLen + 1) {
        return this.children.last();
    }

    // otherwise, return an array, maybe an empty array if nothing added
    return this.children.slice(oldLen, newLen);
});

extdProto(Element, "prependHTML", function(html) {
    const oldLen = this.children.length;
    this.insertAdjacentHTML("afterbegin", html);
    const newLen = this.children.length;

    // exactly one node added, return one node
    if (newLen === oldLen + 1) {
        return this.children[0];
    }

    // otherwise, return an array, maybe an empty array if nothing added
    return this.children.slice(0, newLen - oldLen);
});

extdProto(Element, "insertHTMLAfter", function(html) {
    const parent = this.parentElement;
    const thisIndex = parent.children.indexOf(this);
    const oldLen = parent.children.length;
    this.insertAdjacentHTML("afterend", html);
    const newLen = parent.children.length;
    const addedCount = newLen - oldLen;

    // something went wrong or nothing added, return empty array
    if (addedCount <= 0) return [];

    // added exactly one element, return added element
    if (addedCount === 1) return parent.children[thisIndex+1];

    // multiple added, return added elements
    return this.children.slice(thisIndex+1, thisIndex+1+addedCount);
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
