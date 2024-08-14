import App from "./App.js"
import VertexLayout from "./VertexLayout.js"
import VertexAttrib from "./VertexAttrib.js"
import Color from "./Color.js"
import Mesh from "./Mesh.js"
import * as ui from "./util-ui.js"

export default class Pass {
    clearColor = new Color();
    layout = null;
    meshes = [];
    nMeshes = 0;
    el = null;

    static templates = [
        {
            key: "basic2d",
            default: true,
            clear: "000000",
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
        },
    ];

    constructor(obj) {
        this.fromObject(obj);
    }

    fromObject(obj) {
        // create from default template
        if (!obj) {
            obj = Pass.prepareFromTemplate();
        }
        // create from specified template
        else if (typeof obj == "string") {
            obj = Pass.prepareFromTemplate(obj);
        }

        // set clear color
        this.setClearColor(obj.clear);

        // set new pass layout. never has buffers.
        if (this.layout) {
            this.layout.fromObject(obj.layout);
        }
        else {
            this.layout = new VertexLayout(obj.layout);
        }

        // create new meshes
        // make sure mesh buffers are destroyed
        this.destroy();
        obj.meshes.forEach(mesh => {
            mesh.layout = obj.layout;
            this.addMesh(mesh);
        });
    }

    destroy() {
        this.meshes.forEach(mesh => mesh.layout.destroy());
        this.meshes = [];
        this.nMeshes = 0;
    }

    addMesh(meshObj) {
        const mesh = new Mesh(meshObj);
        this.meshes.push(mesh);
        ++this.nMeshes;
    }

    setClearColor(newColor = null) {
        this.clearColor.set(newColor);
        App.renderer.gl.clearColor(...this.clearColor.data);
    }

    draw() {
        let i = 0;
        while(i < this.nMeshes) {
            this.meshes[i].draw();
            ++i;
        }
    }

    updateDataFromUI() {
        this.meshes.forEach(mesh => mesh.updateDataFromUI());
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
            <label class="collapsible">Main</label>
            <section>

                <label>Clear Color</label>
                <input type="text" class="color" value="#${this.clearColor.toRGBAStr()}">

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

                <button class="action">Restore Default</button>
            </section>
            `
        );

        // add clear color handler
        const colorEl = this.el.querySelector(`input.color`);
        colorEl.addEventListener("input", e => this.setClearColor(colorEl.value));
        Coloris({
            forceAlpha: true,
        });
        Coloris.wrap(colorEl);
        Coloris(colorEl);

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

        // add
        const defaultButtonEl = this.el.querySelector("button.action");
        defaultButtonEl.addEventListener("click", e => {
            e.preventDefault();
            if (confirm("Really DELETE ALL CHANGES and restore pass settings and data to default?")) {
                this.fromObject(Pass.default);
                this.resetUI();
            }
        });
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

    static prepareFromTemplate(key) {
        const obj = Pass.templates.findByKeyOrDefault(key);
        // if not set, set children to key (pass template key through to children)
        if (!obj.clear)     obj.clear = key;
        if (!obj.layout)    obj.layout = key;
        if (!obj.meshes)    obj.meshes = key;
        return obj;
    }

    toObject() {
        return {
            clear: this.clearColor.toRGBAStr(),
            layout: this.layout.toObject(),
            meshes: this.meshes.map(mesh => mesh.toObject()),
        }
    }

    toString() {
        return JSON.stringify(this.toObject());
    }
}
