/*
    Utility code for UI operations
*/

import "./util.mjs"

export function parse(uiEl) {
    // add collapsible handlers
    const collapsibles = uiEl.querySelectorAll("label.collapsible");
    collapsibles.forEach(makeCollapsible);

    // add generic form handlers to always prevent default
    const forms = uiEl.querySelectorAll("form");
    forms.forEach(form => form.addEventListener("submit", e => e.preventDefault()));
}

export function makeCollapsible(el) {
    const next = el.nextElementSibling;
    if (next) {
        el.addEventListener("click", e => next.classList.toggle("hidden"));
    }
}

HTMLElement.prototype.appendHTML = function(html) {
    const oldLen = this.children.length;
    this.insertAdjacentHTML("beforeend", html);
    const newLen = this.children.length;

    // exactly one node added, return one node
    if (newLen === oldLen + 1) {
        return this.children.last();
    }

    // otherwise, return an array, maybe an empty array if nothing added
    return this.children.slice(oldLen, newLen);
}

HTMLElement.prototype.insertHTMLAfter = function(html) {
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
}

// scans from end first
HTMLCollection.prototype.indexOf = function(el) {
    let i = this.length;
    while (i--) {
        if (this[i] === el) return i;
    }
    return undefined;
}

HTMLCollection.prototype.slice = function(start, end) {
    let ret = [];
    let i = start;
    while (i < end) {
        ret.push(this[i]);
        ++i;
    }
    return ret;
}

export function aceit(idOrEl, mode="ace/mode/glsl") {
    const editor = ace.edit(idOrEl);
    editor.setTheme("ace/theme/solarized_dark");
    editor.setKeyboardHandler("ace/keyboard/sublime");
    editor.setOptions({
        maxLines:9999,
    });
    editor.session.setMode(mode);
    return editor;
}
