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

    constructor(gl, index, size, type, name) {
        this.gl = gl;
        this.index = index;
        this.size = size;
        this.type = type;
        this.name = name;
    }

    setData(data, offset=0) {
        // update data in local copy, create dataStr for ui
        let dataStr = "";
        let rowIndex = 0;
        for (let i = offset; i < this.data.length; ++i) {
            // update data
            this.data[i] = data[i];
            // update data string for ui
            dataStr += `${data[i]},`;
            ++rowIndex;
            if (rowIndex === this.size) {
                dataStr += "\n";
                rowIndex = 0;
            }
        }
        document.getElementById(`pass_${this.name}`).value = dataStr;
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
        this.data.forEach(dataItem => {
            str += `${dataItem},`;
            ++rowIndex;
            if (rowIndex === this.size) {
                str += "\n";
                rowIndex = 0;
            }
        });
        return str;
    }

    updateDataFromUI() {
        // bail early if data has not changed
        if (!this.dirty) {
            return;
        }

        console.log(`Updating vertex attrib ${this.name} data from UI.`);

        // make string array from ui data
        const newData = this.dataEl.value.split(',');
        // update local copy from ui data
        for (let i = 0; i < newData.length; ++i) {
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
