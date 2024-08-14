import App from "./App.js"
import * as ui from "./util-ui.js"

/*
    Vertex attrib information for each attrib in VertexLayout.
    Does not hold attrib data (see VertexAttribData).
*/

export default class VertexAttrib {
    index = 0;          // vertex attribute index
    size = 4;           // number of compoenents
    name = "";          // friendly name to indicate nature of data. pos, norm, color, etc.

    constructor(obj) {
        this.fromObject(obj);
    }

    fromObject(obj) {
        if (!obj) {
            obj = {};
        }

        this.index = obj.index;
        this.size = obj.size;
        this.name = obj.name;

        App.renderer.gl.enableVertexAttribArray(this.index);
    }

    createUI(parentEl) {
        parentEl.appendHTML(
            // li set to white-space:pre, so string can't contain new lines
            `<li>`+
            `${this.index}: `+
            `${this.name}, `.padEnd(13)+
            `${this.size} float components, `+
            `${(this.size * 4).toString().padStart(2)} bytes`+
            `</li>`
        );
    }

    toObject() {
        return {
            index: this.index,
            size: this.size,
            name: this.name
        };
    }

    toString() {
        return JSON.stringify(this.toObject());
    }
}
