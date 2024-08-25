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
            <tr>
                <td>${this.index}</td>
                <td>${this.key}</td>
                <td>${this.sizeStr} (${this.size * 4} bytes)</td>
                <td class="noDrag"><button>${SVG.get("edit")}</button></td>
            </tr>
            `
        );
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
