class Attribute {
    index = 0;          // vertex attribute index
    size = 4;           // number of compoenents
    type = 0;           // webgl component type (usually GL_FLOAT)
    name = "";          // friendly name to indicate nature of data. pos, norm, color, etc.
    glBuffer = null;    // when VertexLayout assigned to a pass, buffers get stored here
}

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
        this.attribs = attribs;
    }

    clearAttribs() {
        // TODO
    }
}
