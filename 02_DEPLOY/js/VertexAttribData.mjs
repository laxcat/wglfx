import Serializable from "./common/Serializable.mjs"
import { isStr } from "./common/util.mjs"
import { aceIt } from "./common/util-ui.mjs"

import App from "./App.mjs"
import Project from "./Project.mjs"

/*
    Vertex attribute data, related operations and UI.
    Each vertex attrib gets its own buffer.
    Each VertexAttribData gets mapped by key to Mesh.attribsData, then is
    bound according to the current passes vertex layout.
    Data is always array of float32.
*/

export default class VertexAttribData extends Serializable {
    static initProps = {
        key: undefined,     // number of components
        size: undefined,    // must match VertexAttrib key (pos, norm, color, etc.)
        data: undefined,    // keep copy of buffer data here
    };
    glBuffer = null;        // buffers get stored here
    editor = null;          // ace editor, replaces dataEl
    #uiDirty = false;       // ui data has changed, has not been set to local/gpu yet

    constructor(initObj) {
        super(initObj)
        if (isStr(this.data)) {
            this.data = App.z85.decodeTo(Float32Array, this.data, true);
        }
    }

    serialize() {
        return {
            size: this.size,
            key: this.key,
            data: App.z85.encode(this.data),
        };
    }

    destroy() {
        this.deleteBuffer();
    }

    createBuffer(nVerts) {
        if (this.glBuffer) {
            throw new Error(
                `Unexpected call to createBuffer. Buffer already created.\n`+
                `${this.glBuffer}\n`+
                `${this.data}\n`
            );
        }
        const gl = App.gl;
        this.glBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffer);
        if (!this.data) {
            this.data = new Float32Array(this.size * nVerts); // TODO fix this
        }
        gl.bufferData(gl.ARRAY_BUFFER, this.data, gl.STATIC_DRAW);
        // gl.vertexAttribPointer(this.index, this.size, gl.FLOAT, false, 0, 0);
        // gl.enableVertexAttribArray(this.index);
    }

    deleteBuffer() {
        App.gl.deleteBuffer(this.glBuffer);
        this.glBuffer = null;
        this.data = null;
    }

    recreateBuffer(nVerts) {
        this.deleteBuffer();
        this.createBuffer(new Float32Array(nVerts));
        this.#uiDirty = true;
    }

    setData(data, offset=0) {
        // update this.data
        const n = Math.min(data.length, this.data.length);
        for (let i = offset; i < n; ++i) {
            this.data[i] = data[i];
        }
        // update ui from this.data
        this.updateUIFromData();
        // upload this.data to gpu
        this.uploadData();
    }

    uploadData() {
        console.log(`Uploading vertex attrib ${this.key} local data to GPU.`);
        const gl = App.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data);
    }

    get dataStr() {
        if (!this.data) return "";

        let str = "";
        let rowIndex = 0;
        let maxLen = 0;
        let hasNeg = "";
        this.data.forEach(item => {
            const len = item.toString().length;
            if (maxLen < len) {
                maxLen = len;
            }
            if (item < 0) hasNeg = " ";
        });
        maxLen = (maxLen === 1) ? 0 : maxLen - 2;
        if (maxLen > 3) maxLen = 3;
        // console.log("max len in ", this.key, maxLen, hasNeg.length);
        this.data.forEach(item => {
            str += `${item<0?"":hasNeg}${item.toFixed(maxLen)}  `;
            ++rowIndex;
            if (rowIndex === this.size) {
                str += "\n";
                rowIndex = 0;
            }
        });
        return str;
    }

    updateDataFromUI() {
        // BAIL IF NO CHANGES MADE!
        if (!this.#uiDirty) {
            return;
        }
        // strings, might have extra empty element at end, or other junk
        const uiDataStr = this.editor.getValue().split(/[\s]+/);
        // take only valid floats
        let uiData = [];
        uiDataStr.forEach(item => {
            const f = parseFloat(item);
            if (!isNaN(f)) {
                uiData.push(f);
            }
        })
        console.log(`Updating vertex attrib ${this.key} data from UI:\n` +
                    `UI has ${uiData.length} elements. (Data buffer has ${this.data.length})`
        );
        // don't go beyond bound of this.data or uiData. we don't care which is bigger.
        const n = Math.min(uiData.length, this.data.length);
        // copy whatever data we can from ui to this.data
        for (let i = 0; i < n; ++i) {
            this.data[i] = uiData[i];
        }
        // upload ALL of this.data to gpu (even parts not changed by uiData)
        this.uploadData();
        // set the data string again, to fix formatting, etc
        this.updateUIFromData();
        // this house is clean
        this.#uiDirty = false;
    }

    updateUIFromData() {
        if (!this.editor) {
            return;
        }
        const row = this.editor.session.selection.cursor.row;
        const col = this.editor.session.selection.cursor.column;
        this.editor.setValue(this.dataStr);
        this.editor.clearSelection();
        this.editor.moveCursorTo(row, col);
    }

    createUI(parentEl) {
        const dataEl = parentEl.insertHTML(
            `<li>
                <label>${this.key}</label>
                <pre>${this.dataStr}</pre>
            </li>`
        );
        this.editor = aceIt(dataEl.querySelector("pre"), "ace/mode/text");
        this.editor.addEventListener("change", e => {
            this.#uiDirty = true;
            dataEl.dispatchEvent(Project.makeChangeEvent(`${this.key}Data`));
        });
    }
}
