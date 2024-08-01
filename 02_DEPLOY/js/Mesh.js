import VertexLayout from "./VertexLayout.js"

export default class Mesh {
    gl = null;
    nVerts = 0;
    layout = null;
    el = null;
    editor = null;

    constructor(gl, obj=null) {
        this.gl = gl;
        if (obj) {
            this.fromObject(obj);
        }
    }

    fromObject(obj) {
        this.nVerts = obj.nVerts;
        let layout = obj.layout.map(attrib => {
            if (obj.data.hasOwnProperty(attrib.name)) {
                attrib.data = obj.data[attrib.name];
            }
            return attrib;
        });

        console.log("mesh layout", layout);

        this.layout = new VertexLayout(this.gl, layout);

        // this.nVerts = nVerts;
        // this.layout = new VertexLayout(this.gl, layout.attribs);
        // this.layout.attribs.forEach(attrib => {
        //     attrib.createBuffer(this.nVerts);
        // });
        // this.setDataFromList(dataList);

    }

    // setDataFromList(list) {
    //     if (!list) {
    //         return;
    //     }
    //     list.forEach(item => {
    //         this.layout.setDataByName(item.name, item.data);
    //     });
    // }

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
        this.gl.drawArrays(this.gl.TRIANGLES, 0, this.nVerts);
        // this.gl.throwError();
    }

    createUI(parentEl) {
        this.el = parentEl.appendHTML(
            `
            <li>
                <label class="collapsible">Mesh</label>
                <section>
                    <label for="pass_vertCount">Count</label>
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
            obj.data[attrib.name] = attrib.toObject().data;
        });
        return obj;
    }

    toString() {
        return JSON.stringify(this.toObject());
    }
}
