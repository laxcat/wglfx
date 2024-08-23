import Serializable from "./common/Serializable.mjs"
import SVG from "./common/SVG.mjs"
import { isNumber } from "./common/util.mjs"

import App from "./App.mjs"

/*
    Vertex attrib information for each attrib in VertexLayout.
    Does not hold attrib data (see VertexAttribData).
*/
export default class VertexAttrib extends Serializable {
    static initProps = {
        index: undefined,   // vertex attribute index
        size: undefined,    // number of compoenents
        key: undefined,     // key to indicate nature of data. pos, norm, color, etc.
                            // key should match key in mesh attrib data
    };
    rowEl;
    parentEl;

    static REORDER_EVENT = "vertexattribreorder";
    static makeReorderEvent(oldIndex, newIndex) {
        return new CustomEvent(VertexAttrib.REORDER_EVENT, {
            detail: {oldIndex,newIndex},
            bubbles: true
        });
    }

    set index(value) {
        const i = parseInt(value);
        if (!isNumber(i)) {
            throw new TypeError(`${value} not a valid index (${i}).`);
        }
        // console.log(`index ${this._index} -> ${i}`);
        this._index = i;
        if (this.rowEl) {
            this.rowEl.dataset.index = i;
            this.rowEl.children[0].innerHTML = i;
        }
    }
    get index() { return this._index; }

    get sizeStr() { return (this.size === 1) ? "float" : `vec${this.size}` }

    get draggingEl() {
        return this.parentEl.querySelector(".dragging");
    }

    createUI(parentEl) {
        this.parentEl = parentEl;
        this.rowEl = parentEl.appendHTML(
            `
            <tr draggable="true">
                <td>${this.index}</td>
                <td>${this.key}</td>
                <td>${this.sizeStr} (${this.size * 4} bytes)</td>
                <td><button>${SVG.get("edit")}</button></td>
            </tr>
            `
        );

        this.rowEl.addEventListener("mouseenter", e => this.rowEl.classList.add("hover"));
        this.rowEl.addEventListener("dragstart",  e => this.rowEl.classList.add("dragging"));
        this.rowEl.addEventListener("dragenter",  e => this.rowEl.classList.add("draggingHover"));
        this.rowEl.addEventListener("mouseleave", e => this.rowEl.classList.remove("hover"));
        this.rowEl.addEventListener("dragleave",  e => this.rowEl.classList.remove("draggingHover", "before", "after", "hover"));
        this.rowEl.addEventListener("dragend",    e => this.rowEl.classList.remove("dragging"));

        this.rowEl.addEventListener("dragover", e => {
            e.preventDefault();
            if (this.rowEl === this.draggingEl) return;
            const yp = e.offsetY / this.rowEl.offsetHeight;
            const before = (yp < .5);
            this.rowEl.classList.toggle("before",  before);
            this.rowEl.classList.toggle("after",  !before);
        });
        this.rowEl.addEventListener("drop", e => {
            e.preventDefault();
            const draggingEl = this.draggingEl;
            const oldIndex = draggingEl.getIndex();
            if (this.rowEl.classList.contains("before")) {
                this.rowEl.before(draggingEl);
            }
            else {
                this.rowEl.after(draggingEl);
            }
            const newIndex = draggingEl.getIndex();
            this.rowEl.classList.remove("draggingHover", "before", "after");
            // console.log("drop", oldIndex, newIndex);
            this.rowEl.dispatchEvent(VertexAttrib.makeReorderEvent(oldIndex, newIndex));
        });
    }
}














        // rowEl.addEventListener("drop", e => {
        //     console.log("drop", this.index, rowEl.parentElement.dataset.dragging);
        // });



        // // add form handler
        // const form = this.el.querySelector("form");
        // const size = form.querySelectorAll("input")[0];
        // const key  = form.querySelectorAll("input")[1];
        // form.addEventListener("submit", e => {
        //     if (this.addAttrib(parseInt(size.value), key.value)) {
        //         form.reset();
        //     }
        // });




            // // li set to white-space:pre, so string can't contain new lines
            // `<li>`+
            // `${this.index}: `+
            // `${this.key}, `.padEnd(13)+
            // `${this.size} float components, `+
            // `${(this.size * 4).toString().padStart(2)} bytes`+
            // `</li>`

        // `
        // <form>
        //     <label>Size</label>
        //     <input type="number" min="1" max="4">
        //     <label>Name</label>
        //     <input type="text" pattern="[a-z]{3,12}" placeholder="[a-z]{3,12}">
        //     <input type="submit" value="Add Attribute">
        // </form>
        // `;
