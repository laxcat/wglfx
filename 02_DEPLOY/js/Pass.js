import VertexLayout from "./VertexLayout.js"
import VertexAttrib from "./VertexAttrib.js"
import Mesh from "./Mesh.js"
import * as ui from "./util-ui.js"

export default class Pass {
    gl = null;
    layout = null;
    meshes = [];
    nMeshes = 0;
    clearColor = [0.0, 0.0, 0.0, 1.0];
    el = null;

    constructor(gl) {
        this.gl = gl;

        this.layout = new VertexLayout(gl, [
            {size: 4, name: "pos"},
            {size: 4, name: "color"},
        ]);

        const mesh = new Mesh(this.gl, 6, this.layout, [
            {
                name: "pos",
                data: new Float32Array([
                     0.50,   1.00,   0.00,   1.00,
                     1.00,  -1.00,   0.00,   1.00,
                    -1.00,  -1.00,   0.00,   1.00,
                    -0.50,   1.00,   0.00,   1.00,
                     1.00,  -1.00,   0.00,   1.00,
                    -1.00,  -1.00,   0.00,   1.00,
                ])
            },
            {
                name: "color",
                data: new Float32Array([
                    0.5,  0.0,  0.0,  1.0,
                    0.0,  0.0,  0.0,  1.0,
                    0.0,  0.0,  0.0,  1.0,
                    0.0,  0.5,  0.5,  1.0,
                    0.0,  0.0,  0.0,  1.0,
                    0.0,  0.0,  0.0,  1.0,
                ])
            },
        ]);
        this.meshes.push(mesh);
        ++this.nMeshes;

        this.setClearColor();
    }

    setClearColor(newColor = null) {
        if (newColor) {
            this.clearColor = newColor;
        }
        this.gl.clearColor(
            this.clearColor[0],
            this.clearColor[1],
            this.clearColor[2],
            this.clearColor[3]
        );
    }

    draw() {
        let i = 0;
        while(i < this.nMeshes) {
            this.meshes[i].draw();
            ++i;
        }
    }

    createUI(parentEl) {
        this.passEl = parentEl.appendHTML(
            `
            <li>
                <label class="collapsible">Pass</label>
                <section>
                    <label class="collapsible">Layout</label>
                    <section class="layout">
                        <ul></ul>
                        <form>
                            <label>Size</label>
                            <input type="number" min="1" max="4">
                            <label>Name</label>
                            <input type="text" pattern="[a-z]{3,12}" placeholder="[a-z]{3,12}">
                            <input type="submit" value="Add Attribute">
                        </form>
                    </section>
                    <label class="collapsible">Meshes</label>
                    <ul class="meshes"></ul>
                </section>
            </li>
            `
        );

        // create attributes list (layout)
        const layoutEl = this.passEl.querySelector("section.layout > ul");
        this.layout.attribs.forEach(attrib => attrib.createListUI(layoutEl));

        // create mesh list
        const meshesEl = this.passEl.querySelector("ul.meshes");
        this.meshes.forEach(mesh => mesh.createUI(meshesEl));

        // add form handler
        const form = this.passEl.querySelector("form");
        const size = form.querySelectorAll("input")[0];
        const name = form.querySelectorAll("input")[1];
        form.addEventListener("submit", e => {
            if (this.addAttrib(parseInt(size.value), name.value)) {
                form.reset();
            }
        });
    }

    updateDataFromUI() {
        this.meshes.forEach(mesh => mesh.updateDataFromUI());
    }

    addAttrib(size, name) {
        name = name.trim();

        // basic error checking
        if (!Number.isInteger(size) ||
            size < 1 ||
            size > 4 ||
            name.length < 3 ||
            this.layout.hasAttribName(name)
            ) {
            console.log("Did not create new attribute.", size, name);
            return false;
        }

        const attrib = this.layout.addAttrib(size, name);
        // create list ui for new attrib in layout ul
        attrib.createListUI(this.passEl.querySelector("section.layout > ul"));
        // create data ui for each mesh in mesh list
        this.meshes.forEach(mesh => {
            const meshAttrib = mesh.layout.addAttrib(size, name);
            // create webgl buffers
            meshAttrib.createBuffer(mesh.nVerts);
            meshAttrib.createDataUI(mesh.el.querySelector("ul.attribs"));
        });
        return true;
    }
}
