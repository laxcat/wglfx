import VertexAttrib from "./VertexAttrib.js"

// Can be generic, reuseable with different passes, etc
// When assigned to mesh, gets buffer objects assigned to attributes
export default class VertexLayout {
    gl = null;          // webgl context object
    attribs = [];       // list of attributes

    constructor(gl, attribs, ignoreData=false) {
        this.gl = gl;
        this.fromObject(attribs, ignoreData);
    }

    fromObject(attribs, ignoreData=false) {
        if (this.attribs.length) {
            this.clearAttribs();
        }
        if (!attribs) {
            return;
        }
        let index = 0;
        attribs.forEach(attrib => {
            if (attrib.index !== undefined && attrib.index !== index) {
                throw `Unexpected index. Expecting sequential indices. ${attrib.index}, ${index}`;
            }
            attrib.index = index;
            const va = new VertexAttrib(this.gl, attrib, ignoreData);
            this.attribs.push(va);
            ++index;
        });
    }


    addAttrib(size, name) {
        const attrib = new VertexAttrib(this.gl, this.attribs.length, size, name);
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

    clearAttribs() {
        this.attribs.forEach(attrib => {
            attrib.deleteBuffer();
        });
        this.attribs = [];
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
