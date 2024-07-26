import VertexAttrib from "/js/VertexAttrib.js"

// Can be generic, reuseable with different passes, etc
// When assigned to mesh, gets buffer objects assigned to attributes
export default class VertexLayout {
    gl = null;          // webgl context object
    attribs = [];       // list of attributes

    constructor(gl, attribs) {
        this.gl = gl;

        this.setAttribs(attribs);
    }

    setAttribs(attribs) {
        if (this.attribs.length) {
            this.clearAttribs();
        }
        let index = 0;
        attribs.forEach(attrib => {
            const va = new VertexAttrib(
                this.gl, index, attrib.size, attrib.name
            );
            this.attribs.push(va);
            ++index;
        });
    }

    addAttrib(size, name) {
        const attrib = new VertexAttrib(this.gl, this.attribs.length, size, name);
        this.attribs.push(attrib);
        return attrib;
    }

    clearAttribs() {
        this.attribs = [];
        // TODO
    }
}
