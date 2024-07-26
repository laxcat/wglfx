import VertexLayout from "/js/VertexLayout.js"
import VertexAttrib from "/js/VertexAttrib.js"
import * as util from "/js/util.js"

export default class Pass {
    gl = null;
    layout = null;
    nVerts = 6;
    parentEl = null;
    clearColor = [0.0, 0.0, 0.0, 1.0];

    constructor(gl, el) {
        this.gl = gl;

        this.layout = new VertexLayout(gl, [
            {size: 4, type: gl.FLOAT, name: "pos"},
            {size: 4, type: gl.FLOAT, name: "color"},
        ]);

        this.setClearColor();

        let index = 0;
        this.layout.attribs.forEach(attrib => {
            attrib.createBuffer(this.nVerts);
            ++index;
        });

        this.createUI(el);

        this.setAttribDataForName(
            "pos",
            new Float32Array([
                 0.50,   1.00,   0.00,   1.00,
                 1.00,  -1.00,   0.00,   1.00,
                -1.00,  -1.00,   0.00,   1.00,
                -0.50,   1.00,   0.00,   1.00,
                 1.00,  -1.00,   0.00,   1.00,
                -1.00,  -1.00,   0.00,   1.00,
            ])
        );

        this.setAttribDataForName(
            "color",
            new Float32Array([
                0.5,  0.0,  0.0,  1.0,
                0.0,  0.0,  0.0,  1.0,
                0.0,  0.0,  0.0,  1.0,
                0.0,  0.5,  0.5,  1.0,
                0.0,  0.0,  0.0,  1.0,
                0.0,  0.0,  0.0,  1.0,
            ])
        );
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
        this.setClearColor();
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
        // util.checkError(this.gl);
    }

    deleteAttribBuffers() {
        this.layout.attribs.forEach(attrib => {
            attrib.deleteBuffer();
        });
    }

    createUI(el) {
        const last = util.last;

        el.insertAdjacentHTML("beforeend",
            `<section>
            <label id="vertData" for="vertDataContainer">Vert Data</label>
            <div id="vertDataContainer">
                <label for="pass_vertCount">Count</label>
                <input type="text" id="pass_vertCount" value="${this.nVerts}">
                <label for="attribs">Attribs</label>
                <div id="attribs"></div>
            </div>
            </section>`
        );
        const attribs = document.getElementById("attribs");
        this.layout.attribs.forEach(attrib => {
            attrib.createUI(attribs);
        });
        util.makeCollapsible(
            document.getElementById("vertData"),
            document.getElementById("vertDataContainer")
        );
    }

    updateDataFromUI() {
        const newNVerts = parseInt(document.getElementById("pass_vertCount").value);;
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
}
