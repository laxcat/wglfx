import Serializable from "./Serializable.mjs"
import VertexAttrib from "./VertexAttrib.mjs"

// TODO consider killing this class alltogether. pass should hold this attribs array directly?

export default class VertexLayout extends Serializable {
    attribs = [];       // array of VertexAttrib

    static serialBones = {
        attribs: undefined,
    };

    constructor(serialObj) {
        super();
        this.deserialize(serialObj);
    }

    deserialize(serialObj) {
        serialObj = super.deserialize(serialObj);

        console.log("layout serialObj", serialObj);

        this.attribs = serialObj.attribs.map((serialAttrib, index) => {
            serialAttrib.index = index;
            return new VertexAttrib(serialAttrib);
        });
    }

    // addAttrib(obj) {
    //     if (obj.index !== undefined && obj.index !== this.attribs.length) {
    //         throw `Unexpected index. Expecting sequential indices. ${obj.index}, ${this.attribs.length}`;
    //     }
    //     obj.index = this.attribs.length;
    //     const attrib = new VertexAttrib(obj);
    //     this.attribs.push(attrib);
    //     return attrib;
    // }

    hasAttribName(name) {
        for (let i = 0; i < this.attribs.length; ++i) {
            if (this.attribs[i].name === name) {
                return true;
            }
        }
        return false;
    }

    toString() {
        return JSON.stringify(this.serialize());
    }
}
