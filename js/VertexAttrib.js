import * as util from "/js/util.js"

/*
NOTES:
 • component type is always float32
*/

export default class VertexAttrib {
    gl = null;          // webgl contex object
    index = 0;          // vertex attribute index
    size = 4;           // number of compoenents
    name = "";          // friendly name to indicate nature of data. pos, norm, color, etc.
    glBuffer = null;    // when VertexLayout assigned to a pass, buffers get stored here
    data = null;        // when VertexLayout assigned to a pass, keep copy of buffer data here
    uiDirty = false;      // ui data has changed, has not been set to local/gpu yet
    editor = null;      // ace editor, replaces dataEl

    constructor(gl, index, size, name) {
        this.gl = gl;
        this.index = index;
        this.size = size;
        this.name = name;
    }

    get editorId() { return `pass_${this.name}`; }

    createBuffer(nVerts) {
        this.glBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.glBuffer);
        this.data = new Float32Array(this.size * nVerts);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.data, this.gl.STATIC_DRAW);
        this.gl.vertexAttribPointer(this.index, this.size, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.index);
    }

    deleteBuffer() {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        this.gl.deleteBuffer(this.glBuffer);
        this.glBuffer = null;
        this.data = null;
    }

    setData(data, offset=0) {
        // update this.data
        const n = Math.min(data.length, this.data.length);
        for (let i = offset; i < n; ++i) {
            this.data[i] = data[i];
        }
        // update ui from this.data
        this.editor.setValue(this.dataStr);
        // upload this.data to gpu
        this.uploadData();
    }

    uploadData() {
        console.log(`Uploading vertex attrib ${this.name} local data to GPU.`);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.glBuffer);
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.data);
    }

    get dataStr() {
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
        if (!this.uiDirty) {
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
        this.editor.setValue(this.dataStr);
        // this house is clean
        this.uiDirty = false;
    }

    createUI(el) {
        el.insertAdjacentHTML("beforeend",
            `<div class="attrib">
            <div>${this.name}</div>
            <pre id="${this.editorId}">${this.dataStr}</pre>
            </div>`
        );
        this.editor = util.aceit(this.editorId, "ace/mode/text");
        this.editor.addEventListener("change", e => {
            this.uiDirty = true;
        })
    }
}
