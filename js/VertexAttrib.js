import * as util from "/js/util.js"

export default class VertexAttrib {
    gl = null;          // webgl contex object
    index = 0;          // vertex attribute index
    size = 4;           // number of compoenents
    type = 0;           // webgl component type (usually GL_FLOAT)
    name = "";          // friendly name to indicate nature of data. pos, norm, color, etc.
    glBuffer = null;    // when VertexLayout assigned to a pass, buffers get stored here
    data = null;        // when VertexLayout assigned to a pass, keep copy of buffer data here
    dataEl = null;      // when VertexLayout assigned to a pass, keep ref to data textarea here
    dirty = false;      // ui data has changed, has not been set to local/gpu yet

    static get seperator() { return "  "; }

    constructor(gl, index, size, type, name) {
        this.gl = gl;
        this.index = index;
        this.size = size;
        this.type = type;
        this.name = name;
    }

    createBuffer(nVerts) {
        this.glBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.glBuffer);
        this.data = new Float32Array(this.size * nVerts);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.data, this.gl.STATIC_DRAW);
        this.gl.vertexAttribPointer(this.index, this.size, this.type, false, 0, 0);
        this.gl.enableVertexAttribArray(this.index);
    }

    deleteBuffer() {
        this.gl.deleteBuffer(this.glBuffer);
        this.glBuffer = null;
        this.data = null;
    }

    setData(data, offset=0) {
        // update data in local copy
        const minN = (data.length < this.data.length) ? data.length : this.data.length;
        for (let i = offset; i < minN; ++i) {
            this.data[i] = data[i];
        }
        document.getElementById(`pass_${this.name}`).value = this.dataStr;
        // upload local copy to gpu
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
            str += `${item<0?"":hasNeg}${item.toFixed(maxLen)}${VertexAttrib.seperator}`;
            ++rowIndex;
            if (rowIndex === this.size) {
                str += "\n";
                rowIndex = 0;
            }
        });
        return str;
    }

    updateDataFromUI(nVerts) {
        // number of elements in TypedArray, different if nVerts changed
        const n = nVerts * this.size;

        // bail early if data has not changed
        if (!this.dirty && n === this.data.length) {
            return;
        }

        console.log(`Updating vertex attrib ${this.name} data from UI.`);

        let minN = n;
        const oldData = this.data;

        // ui requesting smaller vert count
        if (n < this.data.length) {
            this.data = oldData.slice(0, n);
            minN = n;
        }
        // ui request larger vert count
        else if (n > oldData.length) {
            this.data = new Float32Array(n);
            this.data.set(oldData);
            minN = oldData.length;
        }

        // make string array from ui data
        const newData = this.dataEl.value.split(VertexAttrib.seperator);

        // only update data if we have it
        if (minN > newData.length) {
            minN = newData.length;
        }
        // update local copy from ui data
        for (let i = 0; i < minN; ++i) {
            this.data[i] = parseFloat(newData[i]);
        }
        // upload local copy to gpu
        this.uploadData();
        // set the data string again, to fix formatting, etc
        this.dataEl.value = this.dataStr;
    }

    createUI(el) {
        el.insertAdjacentHTML("beforeend",
            `<div class="attrib">
            <div>${this.name}</div>
            <textarea id="pass_${this.name}">${this.dataStr}</textarea>
            </div>`
        );
        this.dataEl = util.last(util.last(el.children).children);
        this.dataEl.addEventListener("input", e => {
            this.dirty = true;
        });
    }
}
