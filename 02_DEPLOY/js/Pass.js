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

        // this.layout.attribs.forEach(attrib => {
        //     attrib.createBuffer(this.nVerts);
        // });

        this.setClearColor();

        // this.createUI(el);

        // this.setAttribDataForName(
        //     "pos",
        //     new Float32Array([
        //          0.50,   1.00,   0.00,   1.00,
        //          1.00,  -1.00,   0.00,   1.00,
        //         -1.00,  -1.00,   0.00,   1.00,
        //         -0.50,   1.00,   0.00,   1.00,
        //          1.00,  -1.00,   0.00,   1.00,
        //         -1.00,  -1.00,   0.00,   1.00,
        //     ])
        // );

        // this.setAttribDataForName(
        //     "color",
        //     new Float32Array([
        //         0.5,  0.0,  0.0,  1.0,
        //         0.0,  0.0,  0.0,  1.0,
        //         0.0,  0.0,  0.0,  1.0,
        //         0.0,  0.5,  0.5,  1.0,
        //         0.0,  0.0,  0.0,  1.0,
        //         0.0,  0.0,  0.0,  1.0,
        //     ])
        // );
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

    // setAttribDataAtIndex(index, data, offset=0) {
    //     this.layout.attribs[index].setData(data, offset);
    // }

    // setAttribDataForName(name, data, offset=0) {
    //     this.layout.attribs.forEach(attrib => {
    //         if (attrib.name == name) {
    //             attrib.setData(data, offset);
    //             return;
    //         }
    //     })
    // }

    // bind() {
    //     this.setClearColor();
    //     let index = 0;
    //     this.layout.attribs.forEach(attrib => {
    //         this.gl.bindBuffer(this.gl.ARRAY_BUFFER, attrib.glBuffer);
    //         this.gl.vertexAttribPointer(index, attrib.size, this.gl.FLOAT, false, 0, 0);
    //         this.gl.enableVertexAttribArray(index);
    //         ++index;
    //     });
    // }

    // unbind() {
    //     this.gl.bindBuffer(this.gl.ARRAY_BUFFER, 0);
    //     for (let index = 0; index < this.layout.attribs.length; ++i) {
    //         this.gl.disableVertexAttribArray(index);
    //     }
    // }

    draw() {
        let i = 0;
        while(i < this.nMeshes) {
            this.meshes[i].draw();
            ++i;
        }
    }

    // deleteAttribBuffers() {
    //     this.layout.attribs.forEach(attrib => {
    //         attrib.deleteBuffer();
    //     });
    // }

    createUI(parentEl) {
        this.passEl = ui.appendHTML(parentEl,
            `
            <li class="pass">
                <label class="collapsible">Pass</label>
                <section>
                    <label class="collapsible">Layout</label>
                    <section>
                        <ul></ul>
                        <form>
                            <label>Size</label>
                            <input type="number" min="1" max="4">
                            <label>Name</label>
                            <input type="text" pattern="[a-z]{3,12}" placeholder="[a-z]{3,12}">
                            <input type="submit" value="Add Attribute">
                        </form>
                    </section>
                </section>
            </li>
            `
        );

        // create attributes list (layout)
        const layoutEl = this.passEl.querySelector("ul");
        this.layout.attribs.forEach(attrib => attrib.createUI(layoutEl));

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
        const newNVerts = parseInt(document.getElementById("pass_vertCount").value);
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
        attrib.createBuffer(this.nVerts);
        attrib.createUI(this.passEl.querySelector("ul"));
        return true;
    }
}
