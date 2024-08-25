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

// Make parentEl's children reorderable using HTML5's drag/drop API.
// see defaultOptions. override anything with options.
export function makeReorderable(parentEl, options) {
    const defaultOptions = {
        // called on drop. override to handle data
        onReorder: (oldIndex,newIndex)=>{},
        // given this xy in the drop target size, should apply beforeClass?
        isBefore: (x,y,w,h)=>(y / h < .5),
        // these classes get applied. set css accordingly.
        hoverClass: "hover",
        draggingClass: "dragging",
        draggingHoverClass: "draggingHover",
        beforeClass: "before",
        afterClass: "after",
    }
    const o = {...defaultOptions, ...options};

    // dragging element is found with a document query, now set
    const getDraggingEl = ()=>parentEl.querySelector("."+o.draggingClass);

    // for each child of parentEl
    parentEl.children.forEach(childEl => {

        // set the draggable attribute on html element
        childEl.setAttribute("draggable", true);

        // add listeners to add and remove classes on the relevant children
        childEl.addEventListener("mouseenter", e => childEl.classList.add(o.hoverClass));
        childEl.addEventListener("dragstart",  e => childEl.classList.add(o.draggingClass));
        childEl.addEventListener("dragenter",  e => childEl.classList.add(o.draggingHoverClass));
        childEl.addEventListener("mouseleave", e => childEl.classList.remove(o.draggingHoverClass, o.beforeClass, o.afterClass, o.hoverClass));
        childEl.addEventListener("dragleave",  e => childEl.classList.remove(o.draggingHoverClass, o.beforeClass, o.afterClass, o.hoverClass));
        childEl.addEventListener("dragend",    e => childEl.classList.remove(o.draggingClass));

        // called while dragging element over target... decides the before/after classes
        childEl.addEventListener("dragover", e => {
            e.preventDefault();
            if (childEl === getDraggingEl()) return;

            const dragBounds = childEl.getBoundingClientRect();
            const targBounds = e.target.getBoundingClientRect();
            const x = targBounds.x - dragBounds.x + e.offsetX;
            const y = targBounds.y - dragBounds.y + e.offsetY;
            const before = o.isBefore(x, y, dragBounds.width, dragBounds.height);

            childEl.classList.toggle(o.beforeClass, before);
            childEl.classList.toggle(o.afterClass, !before);
        });
        // moves the html element and calls onReorder callback
        // doesn't get called if user cancels drop
        childEl.addEventListener("drop", e => {
            e.preventDefault();
            const draggingEl = getDraggingEl();
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
