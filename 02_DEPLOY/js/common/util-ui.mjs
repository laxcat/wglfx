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
        noDragClass: "noDrag",
    }
    const o = {...defaultOptions, ...options};

    // dragging element is found with a document query
    // const getDraggingEl = ()=>parentEl.querySelector("."+o.draggingClass);

    // dragging element can be found quicker by just looking at known draggable children
    const getDraggingEl = ()=>{
        let i = parentEl.children.length;
        while (i--) {
            if (parentEl.children[i].classList.contains(o.draggingClass)) {
                return parentEl.children[i];
            }
        }
        return null;
    };

    // for each child of parentEl
    parentEl.children.forEach(childEl => {

        // set the draggable attribute on html element
        childEl.setAttribute("draggable", true);

        // add listeners to add and remove classes on the relevant children
        childEl.addEventListener("mouseenter", e => childEl.classList.add(o.hoverClass));
        childEl.addEventListener("dragenter",  e => childEl.classList.add(o.draggingHoverClass));
        childEl.addEventListener("mouseleave", e => childEl.classList.remove(o.draggingHoverClass, o.beforeClass, o.afterClass, o.hoverClass));
        childEl.addEventListener("dragleave",  e => childEl.classList.remove(o.draggingHoverClass, o.beforeClass, o.afterClass, o.hoverClass));
        childEl.addEventListener("dragend",    e => childEl.classList.remove(o.draggingClass));

        // start drag, but only if not over a noDrag child
        childEl.addEventListener("dragstart",  e => {
            // check all "noDrag" children for dead zones and cancel if found
            const noDragEls = e.target.querySelectorAll("."+o.noDragClass);
            if (noDragEls) {
                const mez = e.target.getBoundingClientRect();
                const x = mez.x + e.offsetX;
                const y = mez.y + e.offsetY;
                const end = noDragEls.length;
                let i = 0;
                while (i < end) {
                    const dz = noDragEls[i].getBoundingClientRect();
                    // if withing deadzone bounds, cancel the drag
                    if (dz.x < x && x < dz.x + dz.width &&
                        dz.y < y && y < dz.y + dz.height) {
                        e.preventDefault();
                        return;
                    }
                    ++i;
                }
            }
            // normal operation, just adding a class
            childEl.classList.add(o.draggingClass);
        });

        // called while dragging element over target... decides the before/after classes
        childEl.addEventListener("dragover", e => {
            e.preventDefault();

            const dragBounds = childEl.getBoundingClientRect();
            const targBounds = e.target.getBoundingClientRect();
            const x = targBounds.x - dragBounds.x + e.offsetX;
            const y = targBounds.y - dragBounds.y + e.offsetY;
            const before = o.isBefore(x, y, dragBounds.width, dragBounds.height);

            childEl.classList.add(o.draggingHoverClass);
            childEl.classList.toggle(o.beforeClass, before);
            childEl.classList.toggle(o.afterClass, !before);
        });

        // moves the html element and calls onReorder callback
        // doesn't get called if user cancels drop
        childEl.addEventListener("drop", e => {
            // prevent drop default and remove all draggingHover classes
            e.preventDefault();
            const isBefore = childEl.classList.contains(o.beforeClass);
            childEl.classList.remove(o.draggingHover, o.beforeClass, o.afterClass);
            // dropping the dragged on itself, do nothing
            const draggingEl = getDraggingEl();
            if (childEl === draggingEl) {
                return;
            }
            // move the draggingEl to its new location
            const oldIndex = draggingEl.getIndex();
            if (isBefore) {
                childEl.before(draggingEl);
            }
            else {
                childEl.after(draggingEl);
            }
            const newIndex = draggingEl.getIndex();
            // only dispatch if different
            if (oldIndex !== newIndex) {
                o.onReorder(oldIndex, newIndex);
            }
        });
    });
}

// returns a showForm function
// user can provide *FormEl options to add click handlers
export function makeRowForm(row, items, options) {
    const defaultOptions = {
        // optional functions that return HTMLElements to which click handers
        // are added
        // returned element automatically hidden and shown on showForm/cancel
        showFormEl: undefined,
        submitFormEl: undefined,
        cancelFormEl: undefined,

        // optional function that returns array or HTMLCollection
        // required for options.unique and items.unique
        rows: undefined,

        // if set to not falsy, will call cancel on other rows during showForm
        // requires options.rows to be set
        unique: undefined,

        // function that takes one parameter: arrayOfItemIndicesChanged
        // only called when an item value changed
        onChanged: undefined,

        // call cancel on init, automatically setting values into slots
        initCancel: true,
        // sets this class to show and hide elements
        hiddenClass: "hidden",
        // event string
        otherRowCancelEvent: "makeRowForm_otherRowCancel"
    }
    const itemDefaults = {
        // REQUIRED

        // function that returns HTMLElement when passed row
        // returned element gets populated with text/input on cancel/showForm
        slot: undefined,

        // OPTIONS

        // object with get/set function properties
        // can optionally have a getStr function property
        // convenient to set with getSet() utility function
        prop: undefined,

        // if set to not falsy, ensures this slot is a unique value, when
        // same slot compared on other option.rows. requires option.rows.
        unique: undefined,

        // TODO: implement this
        options: [],

        // if set, sets pattern and placeholder
        pattern: "",

        // if set sets type to number and applies min/max/step
        // n or [n], where n<=0, min of n, no max, no step
        // n or [n], where n>0, min of 0 max of n, no step
        // [n, m], where n < m, set min/max, no step
        // [n, m, s], same as above, set step
        limit: [0, 0, 0],

        // CALCULATED, BUT OVERRIDEABLE BY USER

        // boolean
        // if set by user, forces input type="number", otherwise set by limits
        number: undefined,

        // the following is always set automatically
        // reference to the input html element if showForm has been called
        inputEl: undefined,
    };

    // global options
    const opt = {...defaultOptions, ...options};

    // some shortcut functions
    const isArr = arr=>(arr instanceof Array);
    const isNum = num=>(typeof num === "number");
    const isFn = fn=>(typeof fn === "function");
    const isEl = el=>(el instanceof HTMLElement);
    const isEls = el=>(el instanceof HTMLCollection || isArr(el));
    const ifEl = (elfn,fn)=>{ let el; if (isFn(elfn) && isEl(el = elfn(row))) fn(el); }
    const showEl = (elfn,showing)=>ifEl(elfn, el=>el.classList.toggle(opt.hiddenClass, !showing));
    const addClick = (elfn,fn)=>ifEl(elfn, el=>el.addEventListener("click", e=>fn()));

    // if rows are set, we can dispatch to other rows
    const rowsSet = (opt.rows !== undefined && isEls(opt.rows()));
    const dispatchToOtherRows = eventStr=>{
        if (!rowsSet) {
            return;
        }
        const rows = opt.rows();
        let i = rows.length;
        while (i--) {
            if (rows[i] === row) {
                continue;
            }
            rows[i].dispatchEvent(new CustomEvent(eventStr));
        }
    };

    // main actions
    const showForm = ()=>{
        items.forEach(item=>item.showForm());
        showEl(opt.showFormEl, false);
        showEl(opt.submitFormEl, true);
        showEl(opt.cancelFormEl, true);
        if (opt.unique) {
            dispatchToOtherRows(opt.otherRowCancelEvent);
        }
    };
    const cancel = ()=>{
        items.forEach(item=>item.hideForm());
        showEl(opt.showFormEl, true);
        showEl(opt.submitFormEl, false);
        showEl(opt.cancelFormEl, false);
    };
    const submit = ()=>{
        let changed = [];
        if (items.every(item=>item.validate())) {
            items.forEach((item, index)=>{
                if (item.update()) {
                    changed.push(index);
                }
            });
            cancel();
        }
        if (opt.onChanged && changed.length > 0) {
            opt.onChanged(row, changed);
        }
    };

    // add actions as button click handlers
    addClick(opt.showFormEl, showForm);
    addClick(opt.cancelFormEl, cancel);
    addClick(opt.submitFormEl, submit);

    // listen for cancel from other rows
    if (opt.unique) {
        if (rowsSet) {
            row.addEventListener(opt.otherRowCancelEvent, e=>cancel());
        }
        else {
            console.error(`WARNING, cannot honor option unique; option rows not set`);
        }
    }

    // configure each item
    items.forEach(item => {
        // merge item defaults and item user settings
        const itemDef = {...itemDefaults}; // copy defaults
        Object.assign(itemDef, item); // user item settings take precedence
        Object.assign(item, itemDef); // modify item in array

        // syntax error if item.slot not set
        if (item.slot === undefined || !isEl(item.slot(row))) {
            throw new SyntaxError("slot must return HTMLElement");
        }

        // setup getters/setters
        if (item.prop === undefined) {
            item.prop = {};
        }
        if (item.prop.get === undefined) {
            console.error(`WARNING, no getter set on item.`);
            item.prop.get = ()=>{};
        }
        if (item.prop.set === undefined) {
            console.error(`WARNING, no setter set on item.`);
            item.prop.set = v=>{};
        }
        if (item.prop.getStr === undefined) {
            item.prop.getStr = ()=>item.prop.get().toString()
        }

        // set item.number if not set by user
        // will be true if limit is valid, see limit rules above
        if (item.limit) {
            if (isNum(item.limit)) item.limit = [item.limit];
            if (isArr(item.limit) &&
                item.limit.length >= 1) {
                item.getMinMaxStepStr = ()=>{
                    const lim = item.limit;
                    if (lim.length === 1) {
                        return (lim[0] <= 0) ?
                            `min="${lim[0]}"` :
                            `min="0" max="${lim[0]}"`;
                    }
                    // min >= max, invalid
                    if (lim[0] >= lim[1]) {
                        return "";
                    }
                    // 2-3 items
                    return (lim.length === 2) ?
                        `min="${lim[0]}" max="${lim[1]}"` :
                        `min="${lim[0]}" max="${lim[1]}" step="${lim[2]}"`;
                };
            }
        }
        if (item.getMinMaxStepStr === undefined) {
            item.getMinMaxStepStr = ()=>"";
        }
        if (item.number === undefined) {
            item.number = !!item.getMinMaxStepStr();
        }

        item.showForm = ()=>{
            item.slot(row).innerHTML = "";
            // if select
            if (item.options && item.options.length > 0) {

            }
            // input
            else {
                item.inputEl = item.slot(row).appendHTML(`
                    <input
                        type="${item.number?"number":"text"}"
                        value="${item.prop.get()}"
                        required
                        ${item.pattern ?
                            `placeholder="${item.pattern}" `+
                            `pattern="${item.pattern}"` :
                            ""
                        }
                        ${item.getMinMaxStepStr()}
                    >
                `);

                item.capturedValue = item.prop.get();
                item.isDirty = ()=>(item.inputEl.value != item.capturedValue);

                item.inputEl.addEventListener("keydown", e=>{
                    if (e.key==="Enter") submit();
                });
                item.inputEl.addEventListener("keydown", e=>{
                    if (e.key==="Escape") cancel();
                });
            }
        };

        item.hideForm = ()=>{
            item.slot(row).innerHTML = item.prop.getStr();
            item.inputEl = undefined;
            delete item.capturedValue;
            item.isDirty = ()=>false;
        };

        const itemUniqueSet = (item.unique !== undefined && item.unique);
        if (itemUniqueSet && !rowsSet) {
            console.error("WARNING cannot check item unique; option rows not set");
        }
        const isNotUnique = (itemUniqueSet && rowsSet) ?
            // check other slots
            ()=>{
                const rows = opt.rows();
                let i = rows.length;
                while (i--) {
                    if (rows[i] === row) continue;
                    if (item.slot(rows[i]).innerHTML == item.inputEl.value) return true;
                }
                return false;
            } :
            // no unique array set, always passes check
            ()=>false;

        item.validate = ()=>{
            item.inputEl.setCustomValidity("");
            if (!item.isDirty()) {
                return true;
            }
            if (item.inputEl.validity.patternMismatch) {
                item.inputEl.setCustomValidity(`Match the pattern ${item.pattern}`);
            }
            if (isNotUnique()) {
                item.inputEl.setCustomValidity("Must be unique");
            }
            return item.inputEl.reportValidity();
        }

        item.update = ()=>{
            const dirty = item.isDirty();
            if (dirty) {
                if (item.number) {
                    item.prop.set(parseFloat(item.inputEl.value));
                }
                else {
                    item.prop.set(item.inputEl.value);
                }
            }
            return dirty;
        };
    });

    // set initial values
    if (opt.initCancel) {
        cancel();
    }

    return showForm;
}
