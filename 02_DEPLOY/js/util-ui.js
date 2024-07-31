export function parse(uiEl) {
    // add collapsible handlers
    const collapsibles = uiEl.querySelectorAll("*:has(> label.collapsible + *)");
    collapsibles.forEach(makeCollapsible);

    // add generic form handlers to always prevent default
    const forms = uiEl.querySelectorAll("form");
    forms.forEach(form => form.addEventListener("submit", e => e.preventDefault()));
}

export function makeCollapsible(parentEl) {
    if (parentEl.children.length !== 2) {
        console.log("Skipping makeCollapsible for children of ${parentEl}. Collapsible expects exactly 1 sibling.");
        return;
    }
    const head = parentEl.children[0];
    const body = parentEl.children[1];
    head.addEventListener("click", e => {
        body.classList.toggle("hidden");
    });
}

export function appendHTML(parentEl, html) {
    const oldLen = parentEl.children.length;
    parentEl.insertAdjacentHTML("beforeend", html);
    const newLen = parentEl.children.length;

    // exactly one node added, return one node
    if (newLen === oldLen + 1) {
        return parentEl.children[newLen - 1];
    }

    // otherwise, return an array, maybe an empty array if nothing added
    return parentEl.children.slice(oldLen, newLen);
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
