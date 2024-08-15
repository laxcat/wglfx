import App from "./App.js"
import VertexAttribData from "./VertexAttribData.js"

/*
    Handles mesh data and UI.
    Vertex data (attribsData) is mapped to attribute name. Mesh data might not
    have the same attributes as pass.layout, which is by design, allowing
    arbitrary mesh data from varying sources to be used.

    TODO:
    • mesh name
    • apply the new "template" system for defaults
    • add/load meshes
    • add arbitrary data attributes
    • cache binding. would be nice to avoid enabling disabling attribs, but
      this level of performance is lower priority for a this kind of toy
      project
*/
export default class Mesh {
    nVerts = 0;                 // number of vertices in the mesh
    attribsData = new Map();    // map of VertexAttribData, keyed by attrib name
    el = null;                  // base HTML element of mesh UI

    constructor(obj) {
        this.fromObject(obj);
    }

    fromObject(obj) {
        if (!obj) {
            obj = {};
        }

        this.nVerts = obj.nVerts;

        this.destroy();
        for (const key in obj.data) {
            const attribObj = obj.data[key];
            attribObj.name = key;
            this.attribsData.set(key, new VertexAttribData(attribObj));
        }
    }

    destroy() {
        this.attribsData.forEach(a => a.destroy());
        this.attribsData.clear();
    }

    bind(layout) {
        const gl = App.gl;
        let i = layout.attribs.length;
        while (i--) {
            const attrib = layout.attribs[i];
            const data = this.attribsData.get(attrib.name);
            // no data found for this attribute
            if (!data) {
                gl.disableVertexAttribArray(i);
                continue;
            }
            if (attrib.size !== data.size) {
                console.log(`could not bind attrib ${attrib.name}; layout attrib size: ${attrib.size}, data attrib size: ${data.size}`);
                continue;
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, data.glBuffer);
            gl.vertexAttribPointer(i, attrib.size, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(i);
        }
    }

    updateDataFromUI() {
        const newNVerts = parseInt(this.el.querySelector("input").value);
        const nVertsChanged = (this.nVerts !== newNVerts);
        this.nVerts = newNVerts;

        this.attribsData.forEach(attrib => {
            if (nVertsChanged) {
                attrib.recreateBuffer(this.nVerts);
            }
            attrib.updateDataFromUI();
        });
    }

    draw() {
        App.gl.drawArrays(App.gl.TRIANGLES, 0, this.nVerts);
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
        this.attribsData.forEach(attrib => attrib.createUI(attribsEl));
    }

    toObject() {
        const obj = {
            nVerts: this.nVerts,
            data: {},
        };
        this.attribsData.forEach((attrib, key) => {
            obj.data[key] = attrib.toObject();
        });
        return obj;
    }

    toString() {
        return JSON.stringify(this.toObject());
    }
}
