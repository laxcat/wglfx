import VertexAttrib from "./VertexAttrib.js"

// Can be generic, reuseable with different passes, etc
// When assigned to mesh, gets buffer objects assigned to attributes
export default class VertexLayout {
    gl = null;          // webgl context object
    attribs = [];       // list of attributes

    constructor(gl, attribs) {
        this.gl = gl;
        this.fromObject(attribs);
    }

    fromObject(attribs) {
        if (this.attribs.length) {
            this.destroy();
        }
        if (!attribs) {
            return;
        }
        let index = 0;
        attribs.forEach(attrib => {
            this.addAttrib(attrib);
            ++index;
        });
    }

    destroy() {
        this.attribs.forEach(attrib => attrib.destroy());
        this.attribs = [];
    }

    addAttrib(obj) {
        if (obj.index !== undefined && obj.index !== this.attribs.length) {
            throw `Unexpected index. Expecting sequential indices. ${obj.index}, ${this.attribs.length}`;
        }
        obj.index = this.attribs.length;
        const attrib = new VertexAttrib(this.gl, obj);
        this.attribs.push(attrib);
        return attrib;
    }

    hasAttribName(name) {
        for (let i = 0; i < this.attribs.length; ++i) {
            if (this.attribs[i].name === name) {
                return true;
            }
        }
        return false;
    }

    setDataByName(name, data, offset=0) {
        for (let i = 0; i < this.attribs.length; ++i) {
            if (this.attribs[i].name === name) {
                this.attribs[i].setData(data, offset);
                return;
            }
        }
    }

    toObject() {
        return this.attribs.map(attrib => attrib.toObject());
    }

    toString() {
        return JSON.stringify(this.toObject());
    }
}
