import VertexLayout from "/js/VertexLayout.js"
import * as util from "/js/util.js"

export default class Pass {
    gl = null;
    layout = null;
    nVerts = 6;
    parentEl = null;

    constructor(gl, el) {
        this.gl = gl;

        this.layout = new VertexLayout(gl, [
            {size: 3, type: gl.FLOAT, name: "pos"},
        ]);

        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);

        let index = 0;
        this.layout.attribs.forEach(attrib => {
            attrib.glBuffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, attrib.glBuffer);
            attrib.data = new Float32Array(attrib.size * this.nVerts);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, attrib.data, this.gl.STATIC_DRAW);
            this.gl.vertexAttribPointer(0, attrib.size, attrib.type, false, 0, 0);
            this.gl.enableVertexAttribArray(index);
            ++index;
        });

        this.createUI(el);
    }

    setAttribDataAtIndex(index, data, offset=0) {
        this.setAttribData(this.layout.attribs[index], data, offset);
    }

    setAttribDataForName(name, data, offset=0) {
        this.layout.attribs.forEach(attrib => {
            if (attrib.name == name) {
                this.setAttribData(attrib, data, offset);
                return;
            }
        })
    }

    setAttribData(attrib, data, offset=0) {
        // update data in local copy, create dataStr for ui
        let dataStr = "";
        let rowIndex = 0;
        for (let i = offset; i < attrib.data.length; ++i) {
            // update data
            attrib.data[i] = data[i];
            // update data string for ui
            dataStr += `${data[i]},`;
            ++rowIndex;
            if (rowIndex === attrib.size) {
                dataStr += "\n";
                rowIndex = 0;
            }
        }
        document.getElementById(`pass_${attrib.name}`).value = dataStr;
        // upload to gpu
        this.uploadData(attrib);
    }

    uploadData(attrib) {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, attrib.glBuffer);
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, attrib.data);
    }

    bind() {
        let index = 0;
        this.layout.attribs.forEach(attrib => {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, attrib.glBuffer);
            this.gl.vertexAttribPointer(0, attrib.size, attrib.type, false, 0, 0);
            this.gl.enableVertexAttribArray(index);
            ++index;
        });
    }

    unbind() {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, 0);
        for (let index = 0; index < this.layout.attribs.length; ++i) {
            this.gl.disableVertexAttribArray(index);
        }
    }

    draw() {
        this.gl.drawArrays(this.gl.TRIANGLES, 0, this.nVerts);
    }

    deleteAttribBuffers() {
        this.layout.attribs.forEach(attrib => {
            this.gl.deleteBuffer(attrib.glBuffer);
            attrib.glBuffer = null;
            attrib.data = null;
        });
    }

    createUI(el) {
        const last = util.last;

        el.insertAdjacentHTML("beforeend",
            `<label>Vertex Data</label>
            <div id="attribs"></div>`
        );
        const attribs = last(el.children);
        this.layout.attribs.forEach(attrib => {
            attribs.insertAdjacentHTML("beforeend",
                `<div class="attrib">
                <div>${attrib.name}</div>
                <textarea id="pass_${attrib.name}">${this.dataStr(attrib)}</textarea>
                </div>`
            );
            attrib.dataEl = last(last(attribs.children).children);
            attrib.dataEl.addEventListener("input", e => {
                this.updateAttribData(attrib);
            });
        });
    }

    dataStr(attrib) {
        let str = "";
        let rowIndex = 0;
        attrib.data.forEach(dataItem => {
            str += `${dataItem},`;
            ++rowIndex;
            if (rowIndex === attrib.size) {
                str += "\n";
                rowIndex = 0;
            }
        });
        return str;
    }

    updateAttribData(attrib) {
        const el = attrib.dataEl;
        const newData = el.value.split(',');
        const count = (attrib.data.length < newData.length)
            ? attrib.data.length
            : newData.length;
        for (let i = 0; i < count; ++i) {
            attrib.data[i] = parseFloat(newData[i]);
        }
        this.uploadData(attrib);
        // el.value = this.dataStr(attrib);
    }
}
