import VertexLayout from "/js/VertexLayout.js"
import VertexAttrib from "/js/VertexAttrib.js"
import * as util from "/js/util.js"

export default class Pass {
    gl = null;
    layout = null;
    nVerts = 6;
    parentEl = null;

    constructor(gl, el) {
        this.gl = gl;

        this.layout = new VertexLayout(gl, [
            {size: 4, type: gl.FLOAT, name: "pos"},
            {size: 4, type: gl.FLOAT, name: "color"},
        ]);

        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);

        let index = 0;
        this.layout.attribs.forEach(attrib => {
            attrib.glBuffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, attrib.glBuffer);
            attrib.data = new Float32Array(attrib.size * this.nVerts);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, attrib.data, this.gl.STATIC_DRAW);
            this.gl.vertexAttribPointer(index, attrib.size, attrib.type, false, 0, 0);
            this.gl.enableVertexAttribArray(index);
            ++index;
        });

        this.createUI(el);

        this.setAttribDataForName(
            "pos",
            new Float32Array([
                0.0, 0.0, 0.0, 1.0,
                0.0, 1.0, 0.0, 1.0,
                1.0, 1.0, 0.0, 1.0,
                0.0, 0.0, 0.0, 1.0,
                1.0, 1.0, 0.0, 1.0,
                1.0, 0.0, 0.0, 1.0,
            ])
        );

        this.setAttribDataForName(
            "color",
            new Float32Array([
                1.0, 0.0, 0.0, 1.0,
                0.0, 1.0, 0.0, 1.0,
                0.0, 0.0, 1.0, 1.0,
                1.0, 1.0, 0.0, 1.0,
                0.0, 1.0, 1.0, 1.0,
                1.0, 0.0, 1.0, 1.0,
            ])
        );
    }

    setAttribDataAtIndex(index, data, offset=0) {
        this.layout.attribs[index].setData(data, offset);
    }

    setAttribDataForName(name, data, offset=0) {
        this.layout.attribs.forEach(attrib => {
            if (attrib.name == name) {
                attrib.setData(data, offset);
                return;
            }
        })
    }

    bind() {
        let index = 0;
        this.layout.attribs.forEach(attrib => {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, attrib.glBuffer);
            this.gl.vertexAttribPointer(index, attrib.size, attrib.type, false, 0, 0);
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
            <label for="pass_vertCount">Count</label>
            <input type="text" id="pass_vertCount" value="${this.nVerts}">
            <div id="attribs"></div>`
        );
        const attribs = last(el.children);
        this.layout.attribs.forEach(attrib => {
            attrib.createUI(attribs);
        });
    }

    updateDataFromUI() {
        this.nVerts = parseInt(document.getElementById("pass_vertCount").value);
        this.layout.attribs.forEach(attrib => {
            attrib.updateDataFromUI(this.nVerts);
        })
    }
}
