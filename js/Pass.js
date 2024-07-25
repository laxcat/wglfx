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
            const data = new Float32Array(attrib.size * this.nVerts);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl.STATIC_DRAW);
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
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, attrib.glBuffer);
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, offset, data);
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
        });
    }

    createUI(el) {
        el.insertAdjacentHTML('beforeend', '<label>VertexData</label>');
        this.layout.attribs.forEach(attrib => {
            el.insertAdjacentHTML('beforeend', `<div>${attrib.name}</div>`);
        });
    }
}
