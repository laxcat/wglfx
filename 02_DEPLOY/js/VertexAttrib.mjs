import App from "./App.mjs"
import Serializable from "./Serializable.mjs"
import * as ui from "./util-ui.mjs"

/*
    Vertex attrib information for each attrib in VertexLayout.
    Does not hold attrib data (see VertexAttribData).
*/
export default class VertexAttrib  extends Serializable {
    static serialProps = {
        index: undefined,   // vertex attribute index
        size: undefined,    // number of compoenents
        key: undefined,     // key to indicate nature of data. pos, norm, color, etc.
                            // key should match key in mesh attrib data
    };

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
}
