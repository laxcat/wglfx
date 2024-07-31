export function parse(uiEl) {
    // add collapsible handlers
    const collapsibles = uiEl.querySelectorAll("*:has(> label.collapsible + section)");
    collapsibles.forEach(makeCollapsible);

    // add form handlers
    const forms = uiEl.querySelectorAll("form");
    forms.forEach(form => {
        // console.log("listener??", form.getAttribute("listener"));
        form.addEventListener("submit", e => {
            e.preventDefault();
            console.log("form submitted");
        });
    });
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

    // otherwise, return a list, maybe an empty list if nothing added
    return parentEl.children.slice(oldLen, newLen);
}
