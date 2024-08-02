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

    static default = {
        layout: [
            {name: "pos",   size: 4},
            {name: "color", size: 4},
        ],
        meshes: [
            {
                nVerts: 6,
                data: {
                    pos: new Float32Array([
                         0.50,   1.00,   0.00,   1.00,
                         1.00,  -1.00,   0.00,   1.00,
                        -1.00,  -1.00,   0.00,   1.00,
                        -0.50,   1.00,   0.00,   1.00,
                         1.00,  -1.00,   0.00,   1.00,
                        -1.00,  -1.00,   0.00,   1.00,
                    ]),
                    color: new Float32Array([
                        0.5,  0.0,  0.0,  1.0,
                        0.0,  0.0,  0.0,  1.0,
                        0.0,  0.0,  0.0,  1.0,
                        0.0,  0.5,  0.5,  1.0,
                        0.0,  0.0,  0.0,  1.0,
                        0.0,  0.0,  0.0,  1.0,
                    ]),
                },
            },
        ],
    };

    constructor(gl, obj=null) {
        this.gl = gl;
        if (obj) {
            this.fromObject(obj);
        }
    }

    fromObject(obj) {
        // set new pass layout. never has buffers.
        if (this.layout) {
            this.layout.fromObject(obj.layout);
        }
        else {
            this.layout = new VertexLayout(this.gl, obj.layout);
        }
        // make sure mesh buffers are destroyed
        this.destroy();
        // create new meshes
        obj.meshes.forEach(mesh => {
            mesh.layout = obj.layout;
            this.addMesh(mesh);
        });

        this.setClearColor();
    }

    destroy() {
        this.meshes.forEach(mesh => mesh.layout.destroy());
        this.meshes = [];
        this.nMeshes = 0;
    }

    addMesh(meshObj) {
        const mesh = new Mesh(this.gl, meshObj);
        this.meshes.push(mesh);
        ++this.nMeshes;
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
        this.el = parentEl.appendHTML(`<li></li>`);
        this.#fillUI();
    }

    resetUI() {
        // clear contents and listeners
        this.el.innerHTML = "";
        this.#fillUI();
        ui.parse(this.el);
    }

    #fillUI() {
        this.el.appendHTML(
            `
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
                <button>Restore Default</button>
            </section>
            `
        );

        // create attributes list (layout)
        const layoutEl = this.el.querySelector("section.layout > ul");
        this.layout.attribs.forEach(attrib => attrib.createListUI(layoutEl));

        // create mesh list
        const meshesEl = this.el.querySelector("ul.meshes");
        this.meshes.forEach(mesh => mesh.createUI(meshesEl));

        // add form handler
        const form = this.el.querySelector("form");
        const size = form.querySelectorAll("input")[0];
        const name = form.querySelectorAll("input")[1];
        form.addEventListener("submit", e => {
            if (this.addAttrib(parseInt(size.value), name.value)) {
                form.reset();
            }
        });

        this.el.querySelector("button").addEventListener("click", e => {
            e.preventDefault();
            if (confirm("Really restore pass to default?")) {
                this.fromObject(Pass.default);
                this.resetUI();
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

        const attrib = this.layout.addAttrib({size:size, name:name});
        // create list ui for new attrib in layout ul
        attrib.createListUI(this.el.querySelector("section.layout > ul"));
        // create data ui for each mesh in mesh list
        this.meshes.forEach(mesh => {
            const meshAttrib = mesh.layout.addAttrib({
                size: size,
                name: name,
                data: new Float32Array(mesh.nVerts * size),
            });
            meshAttrib.createDataUI(mesh.el.querySelector("ul.attribs"));
        });
        return true;
    }

    toObject() {
        return {
            layout: this.layout.toObject(),
            meshes: this.meshes.map(mesh => mesh.toObject()),
        }
    }

    toString() {
        return JSON.stringify(this.toObject());
    }
}
