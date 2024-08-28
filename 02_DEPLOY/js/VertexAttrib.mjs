import Project from "./Project.mjs"
import Serializable from "./common/Serializable.mjs"
import SVG from "./common/SVG.mjs"
import { isNum, getSet } from "./common/util.mjs"
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
        if (!isNum(i)) {
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

    get sizeRowStr() { return `${this.sizeStr} (${this.size * 4} bytes)`; }

    createUI(parentEl) {
        this.rowEl = parentEl.appendHTML(
            `
            <tr>
                <td>${this.index}</td>
                <td></td>
                <td></td>
                <td class="noDrag">
                    <button>${SVG.get("edit")}</button>
                    <button>🚫</button>
                    <button>×</button>
                    <button>✓</button>
                </td>
            </tr>
            `
        );
        const button = (row,i)=>row.children[3].children[i];
        const formConfig = makeRowForm(this.rowEl, [
            // key
            {
                slot: row=>row.children[1],
                prop: getSet(this, "key"),
                pattern: "[a-z]{3,12}",
                unique: true,
            },
            // size
            {
                slot: row=>row.children[2],
                prop: getSet(this, "size", "sizeRowStr"),
                limit: [1,4],
            },
        ], {
            rows: ()=>parentEl.children,
            unique: true,
            onChanged: (row,changed)=>{
                row.dispatchEvent(Project.makeChangeEvent("passLayout"));
            },
            showFormEl: row=>button(row, 0),
            cancelFormEl: row=>button(row, 2),
            submitFormEl: row=>button(row, 3),
        });

        button(this.rowEl,1).addEventListener("click", e=>{
            if (formConfig.onDelete) formConfig.onDelete(this.rowEl);
            // console.log("delete me!!!!");
        });

        return formConfig;
    }
}
