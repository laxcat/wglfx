import VertexAttrib from "./VertexAttrib.mjs"

export default class VertexLayout {
    attribs = [];       // array of VertexAttrib

    constructor(attribs) {
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
        this.attribs = [];
    }

    addAttrib(obj) {
        if (obj.index !== undefined && obj.index !== this.attribs.length) {
            throw `Unexpected index. Expecting sequential indices. ${obj.index}, ${this.attribs.length}`;
        }
        obj.index = this.attribs.length;
        const attrib = new VertexAttrib(obj);
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

    toObject() {
        return this.attribs.map(attrib => attrib.toObject());
    }

    toString() {
        return JSON.stringify(this.toObject());
    }
}
