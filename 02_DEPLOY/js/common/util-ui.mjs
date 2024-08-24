/*
    Utility code for UI operations
*/

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

export function aceIt(idOrEl, mode="ace/mode/glsl") {
    const editor = ace.edit(idOrEl);
    editor.setTheme("ace/theme/solarized_dark");
    editor.setKeyboardHandler("ace/keyboard/sublime");
    editor.setOptions({
        maxLines:9999,
    });
    editor.session.setMode(mode);
    return editor;
}

export function makeReorderable(parentEl, options) {
    const defaultOptions = {
        isBefore: (x,y,w,h)=>(y / h < .5),
        draggingEl: ()=>parentEl.querySelector(".dragging"),
        hoverClass: "hover",
        draggingClass: "dragging",
        draggingHoverClass: "draggingHover",
        beforeClass: "before",
        afterClass: "after",
        onReorder: (oldIndex,newIndex)=>{},
    }
    const o = {...defaultOptions, ...options};

    parentEl.children.forEach(childEl => {

        childEl.setAttribute("draggable", true);

        childEl.addEventListener("mouseenter", e => childEl.classList.add(o.hoverClass));
        childEl.addEventListener("dragstart",  e => childEl.classList.add(o.draggingClass));
        childEl.addEventListener("dragenter",  e => childEl.classList.add(o.draggingHoverClass));
        childEl.addEventListener("mouseleave", e => childEl.classList.remove(o.draggingHoverClass, o.beforeClass, o.afterClass, o.hoverClass));
        childEl.addEventListener("dragleave",  e => childEl.classList.remove(o.draggingHoverClass, o.beforeClass, o.afterClass, o.hoverClass));
        childEl.addEventListener("dragend",    e => childEl.classList.remove(o.draggingClass));

        childEl.addEventListener("dragover", e => {
            e.preventDefault();
            if (childEl === o.draggingEl()) return;

            const dragBounds = childEl.getBoundingClientRect();
            const targBounds = e.target.getBoundingClientRect();
            const x = targBounds.x - dragBounds.x + e.offsetX;
            const y = targBounds.y - dragBounds.y + e.offsetY;
            const before = o.isBefore(x, y, dragBounds.width, dragBounds.height);

            childEl.classList.toggle(o.beforeClass, before);
            childEl.classList.toggle(o.afterClass, !before);
        });
        childEl.addEventListener("drop", e => {
            e.preventDefault();
            const draggingEl = o.draggingEl();
            const oldIndex = draggingEl.getIndex();
            if (childEl.classList.contains(o.beforeClass)) {
                childEl.before(draggingEl);
            }
            else {
                childEl.after(draggingEl);
            }
            const newIndex = draggingEl.getIndex();
            childEl.classList.remove(o.draggingHover, o.beforeClass, o.afterClass);
            o.onReorder(oldIndex, newIndex);
        });
    });
}
