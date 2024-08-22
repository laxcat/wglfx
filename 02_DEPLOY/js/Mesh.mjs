import Serializable from "./common/Serializable.mjs"
import App from "./App.mjs"
import Project from "./Project.mjs"
import VertexAttribData from "./VertexAttribData.mjs"

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
export default class Mesh extends Serializable {
    static initProps = {
        nVerts: undefined,                      // number of vertices in the mesh
        attribsData: {Map, VertexAttribData},   // new Map() of VertexAttribData, keyed by attrib name
    };
    el = null;                                  // base HTML element of mesh UI

    static templates = [
        {
            key: "debugTriangles",
            nVerts: 6,
            attribsData: {
                pos: {
                    data: new Float32Array([
                        0.50,   1.00,   0.00,   1.00,
                        1.00,  -1.00,   0.00,   1.00,
                       -1.00,  -1.00,   0.00,   1.00,
                       -0.50,   1.00,   0.00,   1.00,
                        1.00,  -1.00,   0.00,   1.00,
                       -1.00,  -1.00,   0.00,   1.00,
                    ]),
                    size: 4,
                },
                color: {
                    data: new Float32Array([
                        0.5,  0.0,  0.0,  1.0,
                        0.0,  0.0,  0.0,  1.0,
                        0.0,  0.0,  0.0,  1.0,
                        0.0,  0.5,  0.5,  1.0,
                        0.0,  0.0,  0.0,  1.0,
                        0.0,  0.0,  0.0,  1.0,
                    ]),
                    size: 4,
                },
            },
        },
    ];

    constructor(initObj) {
        super(initObj);
        // TODO: i would rather this happen in VertexAttribData...
        // but VertexAttribData needs nVerts and i'm not sure how to supply it
        this.attribsData.forEach(attrib => attrib.createBuffer(this.nVerts));
    }

    destroy() {
        this.attribsData.forEach(a => a.destroy());
        this.attribsData.clear();
    }

    bind(layout) {
        const gl = App.gl;
        let i = layout.length;
        // for each pass layout attrib, bind to data if key matches
        while (i--) {
            const attrib = layout[i];
            const data = this.attribsData.get(attrib.key);
            // no data found for this attribute
            if (!data) {
                gl.disableVertexAttribArray(i);
                continue;
            }
            if (attrib.size !== data.size) {
                console.log(`could not bind attrib ${attrib.key}; layout attrib size: ${attrib.size}, data attrib size: ${data.size}`);
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
        // console.log("mesh draw");
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
        const inputEl = this.el.querySelector("input[type='number']");
        inputEl.addEventListener("change", e => {
            this.el.dispatchEvent(Project.makeChangeEvent("meshVertCount"));
        });
    }
}
