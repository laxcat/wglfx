import VertexLayout from "./VertexLayout.js"

export default class Mesh {
    gl = null;
    nVerts = 0;
    layout = null;

    constructor(gl, nVerts, layout, dataList=null) {
        this.gl = gl;
        this.nVerts = nVerts;
        this.layout = new VertexLayout(this.gl, layout.attribs);
        this.layout.attribs.forEach(attrib => {
            attrib.createBuffer(this.nVerts);
        });
        // this.setDataFromList(dataList);
    }

    setDataFromList(list) {
        if (!list) {
            return;
        }
        list.forEach(item => {
            this.layout.setDataByName(item.name, item.data);
        });
    }

    bind() {
        for(let index = 0; index < this.layout.attribs.length; ++index) {
            const attrib = this.layout.attribs[index];
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, attrib.glBuffer);
            this.gl.vertexAttribPointer(index, attrib.size, this.gl.FLOAT, false, 0, 0);
            this.gl.enableVertexAttribArray(index);
        }
    }

    unbind() {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, 0);
        for (let index = 0; index < this.layout.attribs.length; ++i) {
            this.gl.disableVertexAttribArray(index);
        }
    }

    draw() {
        this.gl.drawArrays(this.gl.TRIANGLES, 0, this.nVerts);
        // this.gl.throwError();
    }
}
