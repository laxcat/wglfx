import Serializable from "./common/Serializable.mjs"
import SVG from "./common/SVG.mjs"
import Project from "./Project.mjs"
import { isNumber } from "./common/util.mjs"
import { makeRowForm } from "./common/util-ui.mjs"

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

    createUI(parentEl) {
        this.rowEl = parentEl.appendHTML(
            `
            <tr>
                <td>${this.index}</td>
                <td></td>
                <td></td>
                <td class="noDrag">
                    <button>${SVG.get("edit")}</button>
                    <button>✓</button>
                    <button>×</button>
                </td>
            </tr>
            `
        );
        makeRowForm(this.rowEl, [
            // key
            {
                slot: row=>row.children[1],
                prop: [this,"key"],
                pattern: "[a-z]{3,12}",
                unique: true,
            },
            // size
            {
                slot: row=>row.children[2],
                prop: [this,"size"],
                getStr: ()=>`${this.sizeStr} (${this.size * 4} bytes)`,
                limit: [1,4],
            },
        ], {
            rows: ()=>parentEl.children,
            onChanged: (row,changed)=>{
                row.dispatchEvent(Project.makeChangeEvent("passLayout"));
            },
            showFormEl: row=>row.children[3].children[0],
            submitFormEl: row=>row.children[3].children[1],
            cancelFormEl: row=>row.children[3].children[2],
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
