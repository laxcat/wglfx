import App from "./App.js"
import VertexLayout from "./VertexLayout.js"

export default class Mesh {
    nVerts = 0;
    layout = null;
    el = null;

    constructor(obj) {
        this.fromObject(obj);
    }

    fromObject(obj) {
        if (!obj) {
            obj = {};
        }

        this.nVerts = obj.nVerts;

        let layoutWithData = obj.layout.map(attrib => {
            if (obj.data.hasOwnProperty(attrib.name)) {
                attrib.data = obj.data[attrib.name];
            }
            return attrib;
        });
        this.layout = new VertexLayout(layoutWithData);
    }

    bind() {
        const gl = App.renderer.gl;
        for(let index = 0; index < this.layout.attribs.length; ++index) {
            const attrib = this.layout.attribs[index];
            gl.bindBuffer(gl.ARRAY_BUFFER, attrib.glBuffer);
            gl.vertexAttribPointer(index, attrib.size, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(index);
        }
    }

    unbind() {
        const gl = App.renderer.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, 0);
        for (let index = 0; index < this.layout.attribs.length; ++i) {
            gl.disableVertexAttribArray(index);
        }
    }

    updateDataFromUI() {
        const newNVerts = parseInt(this.el.querySelector("input").value);
        const nVertsChanged = (this.nVerts !== newNVerts);
        this.nVerts = newNVerts;

        this.layout.attribs.forEach(attrib => {
            if (nVertsChanged) {
                attrib.deleteBuffer();
                attrib.createBuffer(this.nVerts);
                attrib.uiDirty = true; // forces data to be pulled from ui
            }
            attrib.updateDataFromUI();
        });
    }

    draw() {
        const gl = App.renderer.gl;
        gl.drawArrays(gl.TRIANGLES, 0, this.nVerts);
    }

    createUI(parentEl) {
        this.el = parentEl.appendHTML(
            `
            <li>
                <label class="collapsible">Mesh</label>
                <section>
                    <label>Count</label>
                    <input type="number" value="${this.nVerts}">
                    <ul class="attribs"></ul>
                </section>
            </li>
            `
        );
        const attribsEl = this.el.querySelector("ul.attribs");
        this.layout.attribs.forEach(attrib => attrib.createDataUI(attribsEl));
    }

    toObject() {
        const obj = {
            nVerts: this.nVerts,
            data: {},
        };
        this.layout.attribs.forEach(attrib => {
            if (attrib.data) {
                obj.data[attrib.name] = attrib.toObject().data;
            }
        });
        return obj;
    }

    toString() {
        return JSON.stringify(this.toObject());
    }
}
