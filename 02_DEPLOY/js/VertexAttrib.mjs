import App from "./App.mjs"
import Serializable from "./Serializable.mjs"
import * as ui from "./util-ui.mjs"

/*
    Vertex attrib information for each attrib in VertexLayout.
    Does not hold attrib data (see VertexAttribData).
*/
export default class VertexAttrib  extends Serializable {
    index = 0;          // vertex attribute index
    size = 4;           // number of compoenents
    key = "";           // key to indicate nature of data. pos, norm, color, etc.
                        // key should match key in mesh attrib data

    static serialBones = {
        index: undefined,
        size: undefined,
        key: undefined,
    };

    constructor(serialObj) {
        super();
        this.deserialize(serialObj);
    }

    deserialize(serialObj) {
        serialObj = super.deserialize(serialObj);

        Object.assign(this, serialObj);

        // enabling/disabling vertex attribs handled in mesh.bind() for now
        // would be nice to just set once here, but needs to be disabled if
        // a particular mesh doesn't have data for the enabled index.
        // App.gl.enableVertexAttribArray(this.index);
    }

    createUI(parentEl) {
        parentEl.appendHTML(
            // li set to white-space:pre, so string can't contain new lines
            `<li>`+
            `${this.index}: `+
            `${this.key}, `.padEnd(13)+
            `${this.size} float components, `+
            `${(this.size * 4).toString().padStart(2)} bytes`+
            `</li>`
        );
    }

    toString() {
        return JSON.stringify(this.toObject());
    }
}
