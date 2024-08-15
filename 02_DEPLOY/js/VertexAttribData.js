import App from "./App.js"
import * as ui from "./util-ui.js"

/*
    Vertex attribute data, related operations and UI.
    Each vertex attrib gets its own buffer.
    Each VertexAttribData gets mapped by name to Mesh.attribsData, then is
    bound according to the current passes vertex layout.
    Data is always array of float32.
*/

export default class VertexAttribData {
    size = 4;           // number of components
    name = "";          // key, must match VertexAttrib name (pos, norm, color, etc.)
    glBuffer = null;    // when VertexLayout assigned to a pass, buffers get stored here
    data = null;        // when VertexLayout assigned to a pass, keep copy of buffer data here
    editor = null;      // ace editor, replaces dataEl

    #uiDirty = false;    // ui data has changed, has not been set to local/gpu yet

    constructor(obj) {
        this.fromObject(obj);
    }

    fromObject(obj) {
        if (!obj) {
            obj = {};
        }

        this.size = obj.size;
        this.name = obj.name;

        this.deleteBuffer();
        this.data = null;
        if (typeof obj.data === "string") {
            // copy=true because otherwise the Float32Array remains attached
            // to underlying buffer based on wasm memory.
            const arr = App.z85.decodeTo(Float32Array, obj.data, true);
            this.createBuffer(arr);
        }
        else if (obj.data instanceof Float32Array) {
            this.createBuffer(obj.data);
        }
    }

    destroy() {
        this.deleteBuffer();
    }

    createBuffer(floatArray) {
        if (this.glBuffer || this.data) {
            throw `Unexpected call to createBuffer. Buffer already created.\n`+
                  `${this.glBuffer}\n`+
                  `${this.data}\n`;
        }
        const gl = App.gl;
        this.glBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffer);
        this.data = floatArray;
        gl.bufferData(gl.ARRAY_BUFFER, floatArray, gl.STATIC_DRAW);
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
        console.log(`Uploading vertex attrib ${this.name} local data to GPU.`);
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
        // console.log("max len in ", this.name, maxLen, hasNeg.length);
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
        console.log(`Updating vertex attrib ${this.name} data from UI:\n` +
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
        const dataEl = parentEl.appendHTML(
            `<li>
                <div>${this.name}</div>
                <pre>${this.dataStr}</pre>
            </li>`
        );
        this.editor = ui.aceit(dataEl.querySelector("pre"), "ace/mode/text");
        this.editor.addEventListener("change", e => {
            this.#uiDirty = true;
        })
    }

    toObject() {
        return {
            size: this.size,
            name: this.name,
            data: App.z85.encode(this.data),
        };
    }

    toString() {
        return JSON.stringify(this.toObject());
    }
}
