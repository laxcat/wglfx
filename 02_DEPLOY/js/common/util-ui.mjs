/*
    Utility code for UI operations
*/

export function parse(uiEl) {
    // add collapsible handlers
    const collapsibles = uiEl.querySelectorAll(".collapsible");
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

// msg, button1Text, button1Action, button2Text, button2Action...etc
export function confirmDialog(msg, ...buttonArgs) {
    const nArgs = buttonArgs.length;
    if (nArgs % 2) { // odd number of buttonArgs args
        throw new SyntaxError(`Odd number of parameters expected. ${nArgs} found.`);
    }
    // convenience
    const isStr = str=>(typeof str === "string");
    const isFn = str=>(typeof str === "function");
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
    const dialog = document.body.insertHTML(`
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

// // returns a configuration object with:
// // all defaultOptions+options
// // submit, cancel, showForm, hideForm, dispatchToOtherRows functions
// // user can provide *FormEl options to add click handlers
// export function makeRowForm(row, items, options) {
//     const defaultOptions = {
//         // optional functions that return HTMLElements to which click handers
//         // are added
//         // returned element automatically hidden and shown on showForm/cancel
//         showFormEl: undefined,
//         removeEl: undefined,
//         submitEl: undefined,
//         cancelEl: undefined,

//         // optional function that returns array or HTMLCollection
//         // required for options.unique and items.unique
//         rows: undefined,

//         // if set to not falsy, will call cancel on other rows during showForm
//         // requires options.rows to be set
//         unique: undefined,

//         // function that takes one parameter: arrayOfItemIndicesChanged
//         // only called when an item value changed
//         onChange: undefined,

//         // call cancel on init, automatically setting values into slots
//         initCancel: true,
//         // sets this class to show and hide elements
//         hiddenClass: "hidden",
//         // event string
//         otherRowCancelEvent: "makeRowForm_otherRowCancel"
//     }
//     const itemDefaults = {
//         // REQUIRED

//         // function that returns HTMLElement when passed row
//         // returned element gets populated with text/input on cancel/showForm
//         slot: undefined,

//         // OPTIONS

//         // object with get/set function properties
//         // can optionally have a getStr function property
//         // convenient to set with getSet() utility function
//         prop: undefined,

//         // if set to not falsy, ensures this slot is a unique value, when
//         // same slot compared on other option.rows. requires option.rows.
//         unique: undefined,

//         // TODO: implement this
//         options: [],

//         // if set, sets pattern and placeholder
//         pattern: "",

//         // if set sets type to number and applies min/max/step
//         // n or [n], where n<=0, min of n, no max, no step
//         // n or [n], where n>0, min of 0 max of n, no step
//         // [n, m], where n < m, set min/max, no step
//         // [n, m, s], same as above, set step
//         limit: [0, 0, 0],

//         // CALCULATED, BUT OVERRIDEABLE BY USER

//         // boolean
//         // if set by user, forces input type="number", otherwise set by limits
//         number: undefined,

//         // the following is always set automatically
//         // reference to the input html element if showForm has been called
//         inputEl: undefined,
//     };

//     // global config, return object
//     const opt = {...defaultOptions, ...options, items, row};

//     // some shortcut functions
//     const isArr = arr=>(arr instanceof Array);
//     const isNum = num=>(typeof num === "number");
//     const isFn = fn=>(typeof fn === "function");
//     const isEl = el=>(el instanceof HTMLElement);
//     const isEls = el=>(el instanceof HTMLCollection || isArr(el));
//     const ifEl = (elfn,fn)=>{ let el; if (isFn(elfn) && isEl(el = elfn(row))) fn(el); }
//     const showEl = (elfn,showing)=>ifEl(elfn, el=>el.classList.toggle(opt.hiddenClass, !showing));
//     const addClick = (elfn,fn)=>ifEl(elfn, el=>el.addEventListener("click", e=>fn()));

//     // hard set
//     const rowsSet = (opt.rows !== undefined && isEls(opt.rows()));

//     // main actions
//     opt.dispatchToOtherRows = eventStr=>{
//         if (!rowsSet) {
//             return;
//         }
//         const rows = opt.rows();
//         let i = rows.length;
//         while (i--) {
//             if (rows[i] === row) {
//                 continue;
//             }
//             rows[i].dispatchEvent(new CustomEvent(eventStr));
//         }
//     };
//     opt.showForm = ()=>{
//         opt.items.forEach(item=>item.showForm());
//         showEl(opt.showFormEl, false);
//         showEl(opt.removeEl, false);
//         showEl(opt.submitEl, true);
//         showEl(opt.cancelEl, true);
//         if (opt.unique) {
//             opt.dispatchToOtherRows(opt.otherRowCancelEvent);
//         }
//     };
//     opt.hideForm = ()=>{
//         opt.items.forEach(item=>item.hideForm());
//         showEl(opt.showFormEl, true);
//         showEl(opt.removeEl, true);
//         showEl(opt.submitEl, false);
//         showEl(opt.cancelEl, false);
//     };
//     opt.cancel = ()=>{
//         opt.hideForm();
//         if (opt.onCancel) {
//             opt.onCancel(row);
//         }
//     };
//     opt.submit = ()=>{
//         let changed = [];
//         if (opt.items.every(item=>item.validate())) {
//             opt.items.forEach((item, index)=>{
//                 if (item.update()) {
//                     changed.push(index);
//                 }
//             });
//             opt.hideForm();
//         }
//         if (opt.onChange && changed.length > 0) {
//             opt.onChange(row, changed);
//         }
//     };
//     opt.remove = ()=>{

//     }

//     // add actions as button click handlers
//     addClick(opt.showFormEl, opt.showForm);
//     addClick(opt.removeEl, opt.remove);
//     addClick(opt.cancelEl, opt.cancel);
//     addClick(opt.submitEl, opt.submit);

//     // listen for cancel from other rows
//     if (opt.unique) {
//         if (rowsSet) {
//             row.addEventListener(opt.otherRowCancelEvent, e=>opt.cancel());
//         }
//         else {
//             console.error(`WARNING, cannot honor option unique; option rows not set`);
//         }
//     }

//     // configure each item
//     opt.items.forEach(item => {
//         // merge item defaults and item user settings
//         const itemDef = {...itemDefaults}; // copy defaults
//         Object.assign(itemDef, item); // user item settings take precedence
//         Object.assign(item, itemDef); // modify item in array

//         // syntax error if item.slot not set
//         if (item.slot === undefined || !isEl(item.slot(row))) {
//             throw new SyntaxError("slot must return HTMLElement");
//         }

//         // setup getters/setters
//         if (item.prop === undefined) {
//             item.prop = {};
//         }
//         if (item.prop.get === undefined) {
//             console.error(`WARNING, no getter set on item.`);
//             item.prop.get = ()=>{};
//         }
//         if (item.prop.set === undefined) {
//             console.error(`WARNING, no setter set on item.`);
//             item.prop.set = v=>{};
//         }
//         if (item.prop.getStr === undefined) {
//             item.prop.getStr = ()=>item.prop.get().toString()
//         }

//         // set item.number if not set by user
//         // will be true if limit is valid, see limit rules above
//         if (item.limit) {
//             if (isNum(item.limit)) item.limit = [item.limit];
//             if (isArr(item.limit) &&
//                 item.limit.length >= 1) {
//                 item.getMinMaxStepStr = ()=>{
//                     const lim = item.limit;
//                     if (lim.length === 1) {
//                         return (lim[0] <= 0) ?
//                             `min="${lim[0]}"` :
//                             `min="0" max="${lim[0]}"`;
//                     }
//                     // min >= max, invalid
//                     if (lim[0] >= lim[1]) {
//                         return "";
//                     }
//                     // 2-3 items
//                     return (lim.length === 2) ?
//                         `min="${lim[0]}" max="${lim[1]}"` :
//                         `min="${lim[0]}" max="${lim[1]}" step="${lim[2]}"`;
//                 };
//             }
//         }
//         if (item.getMinMaxStepStr === undefined) {
//             item.getMinMaxStepStr = ()=>"";
//         }
//         if (item.number === undefined) {
//             item.number = !!item.getMinMaxStepStr();
//         }

//         item.showForm = ()=>{
//             item.slot(row).innerHTML = "";
//             // if select
//             if (item.options && item.options.length > 0) {

//             }
//             // input
//             else {
//                 item.inputEl = item.slot(row).insertHTML(`
//                     <input
//                         type="${item.number?"number":"text"}"
//                         value="${item.prop.get()}"
//                         required
//                         ${item.pattern ?
//                             `placeholder="${item.pattern}" `+
//                             `pattern="${item.pattern}"` :
//                             ""
//                         }
//                         ${item.getMinMaxStepStr()}
//                     >
//                 `);

//                 item.capturedValue = item.prop.get();
//                 item.isDirty = ()=>(
//                     item.inputEl.value === "" ||
//                     item.inputEl.value != item.capturedValue
//                 );

//                 item.inputEl.addEventListener("keydown", e=>{
//                     if (e.key==="Enter") opt.submit();
//                 });
//                 item.inputEl.addEventListener("keydown", e=>{
//                     if (e.key==="Escape") opt.cancel();
//                 });
//             }
//         };

//         item.hideForm = ()=>{
//             item.slot(row).innerHTML = item.prop.getStr();
//             item.inputEl = undefined;
//             delete item.capturedValue;
//             item.isDirty = ()=>false;
//         };

//         const itemUniqueSet = (item.unique !== undefined && item.unique);
//         if (itemUniqueSet && !rowsSet) {
//             console.error("WARNING cannot check item unique; option rows not set");
//         }
//         const isNotUnique = (itemUniqueSet && rowsSet) ?
//             // check other slots
//             ()=>{
//                 const rows = opt.rows();
//                 let i = rows.length;
//                 while (i--) {
//                     if (rows[i] === row) continue;
//                     if (item.slot(rows[i]).innerHTML == item.inputEl.value) return true;
//                 }
//                 return false;
//             } :
//             // no unique array set, always passes check
//             ()=>false;

//         item.validate = ()=>{
//             item.inputEl.setCustomValidity("");
//             if (!item.isDirty()) {
//                 return true;
//             }
//             if (item.inputEl.validity.patternMismatch) {
//                 item.inputEl.setCustomValidity(`Match the pattern ${item.pattern}`);
//             }
//             if (isNotUnique()) {
//                 item.inputEl.setCustomValidity("Must be unique");
//             }
//             return item.inputEl.reportValidity();
//         };

//         item.update = ()=>{
//             const dirty = item.isDirty();
//             if (dirty) {
//                 if (item.number) {
//                     item.prop.set(parseFloat(item.inputEl.value));
//                 }
//                 else {
//                     item.prop.set(item.inputEl.value);
//                 }
//             }
//             return dirty;
//         };
//     });

//     // set initial values
//     if (opt.initCancel) {
//         opt.cancel();
//     }

//     return opt;
// }
