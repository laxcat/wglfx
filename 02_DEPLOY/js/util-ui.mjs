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
    return [...this.children].slice(oldLen, newLen);
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
