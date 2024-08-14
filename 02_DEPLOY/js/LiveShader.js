import App from "./App.js"
import * as util from "./util.js"
import * as ui from "./util-ui.js"

/*
    Shader, shader src, and UI.
    Handles compling, but should only be used through LiveProgram,
    which compiles each shader and links.
    Show compile errors directly in editor UI.

    TODO:
    • apply new "template" system of defaults
*/
export default class LiveShader {
    editor = null;          // instance of ace.editor
    errors = [];            // array of error objects, see parseErrors
    glObj = null;           // the webgl shader object
    glType = null;          // webgl shader type
    glTypeStr = null;       // string for shader type. frequently used as key.
    tempSrc = null;         // holds source code when editor isn't set yet. should be null if editor is non null.
    el = null;              // reference to the primary HTML element of the UI

    constructor(type) {
        this.glType = type;

        const gl = App.renderer.gl;
        this.glTypeStr = (type === gl.VERTEX_SHADER)    ? "vert" :
                         (type === gl.FRAGMENT_SHADER)  ? "frag" :
                         "unknown-type";
    }

    destroy() {
        if (this.glObj) {
            App.renderer.gl.deleteShader(this.glObj);
            this.glObj = null;
        }
    }

    get src() {
        return  (this.editor)  ? this.editor.getValue() :
                (this.tempSrc) ? this.tempSrc :
                "";
    }
    set src(val) {
        if (this.editor && val) {
            this.editor.setValue(val, -1);
            this.tempSrc = null;
        }
        else {
            this.tempSrc = val;
        }
    }

    get defaultSrcPath() { return `./glsl/${this.glTypeStr}.glsl`; }

    compile() {
        if (this.src === "") {
            console.log(`Will not attempt to compile, ${this.glTypeStr} source not set`);
            return null;
        }

        const gl = App.renderer.gl;

        this.glObj = gl.createShader(this.glType);
        gl.shaderSource(this.glObj, this.src);
        gl.compileShader(this.glObj);

        if (!gl.getShaderParameter(this.glObj, gl.COMPILE_STATUS)) {
            console.log(`Could not compile ${this.glTypeStr} this.glObj.`);
            this.parseErrors(this);
            this.destroy();
            return null;
        }
        return this.glObj;
    }

    parseErrors() {
        const Range = ace.require("ace/range").Range;

        // get the whole error string
        const info = App.renderer.gl.getShaderInfoLog(this.glObj);
        // split on lines
        const lines = info.split("\n");
        // for each line, construct an error object
        lines.forEach(line => {
            const parts = line.split(":");
            if (parts[0] === "ERROR") {
                const line = parseInt(parts[2]) - 1; // ace wants 0-index lines/cols
                const part = parts[3].trim().replaceAll("'", "");
                const partStart = this.editor.session.getLine(line).indexOf(part);
                const error = {
                    line: line,
                    partStart: partStart,
                    partEnd: partStart + part.length,
                    error: parts[4].trim(),
                    marker: null,
                };
                this.errors.push(error);
            }
        });
    }

    showErrors() {
        if (!this.editor) {
            return;
        }

        const Range = ace.require("ace/range").Range;

        let errorMsg = "";
        let annotations = [];
        this.errors.forEach(item => {
            const r = new Range(item.line, item.partStart, item.line, item.partEnd);
            item.marker = this.editor.session.addMarker(r, "ace-error", "text");
            annotations.push({
                column: item.partStart,
                row: item.line,
                text: item.error,
                type: "error",
            });
            errorMsg += `${item.line+1}:${item.partStart+1}: ${item.error}\n`;
        });
        this.editor.session.setAnnotations(annotations);

        if (errorMsg) {
            console.log(`Errors in ${this.glTypeStr} shader:\n%c${errorMsg}`, "color:red;");
        }
    }

    clearErrors() {
        if (!this.editor) {
            return;
        }
        this.errors.forEach(item => {
            this.editor.session.removeMarker(item.marker);
        });
        this.editor.session.setAnnotations();
        this.errors = [];
    }

    createUI(parentEl) {
        this.el = parentEl.appendHTML(
            `<li>
            <label class="collapsible">${this.glTypeStr.toStartCase()} Shader</label>
            <pre>${this.src}</pre>
            </li>`
        );
        this.editor = ui.aceit(this.el.querySelector("pre"));
        this.editor.session.setUseWrapMode(true);
        this.editor.session.setWrapLimit(100);
        this.editor.addEventListener("change", () => {
            this.clearErrors();
        });
        this.tempSrc = null;
    }
}


