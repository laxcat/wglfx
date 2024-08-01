import * as util from "./util.js"
import * as ui from "./util-ui.js"

export default class LiveShader {
    gl = null;              // reference to webgl context
    editor = null;          // instance of ace.editor
    errors = [];            // array of error objects, see parseErrors
    glObj = null;           // the webgl shader object
    glType = null;          // webgl shader type
    glTypeStr = null;       // string for shader type. frequently used as key.
    el = null;              // reference to the primary HTML element of the UI

    constructor(gl, type) {
        this.gl = gl;
        this.glType = type;

        this.glTypeStr = (type === this.gl.VERTEX_SHADER)    ? "vert" :
                         (type === this.gl.FRAGMENT_SHADER)  ? "frag" :
                         "unknown-type";

        // this.createUI(el);

        // this.load();
    }


    get src() { return (this.editor) ? this.editor.getValue() : ""; }
    set src(val) { this.editor.setValue(val, -1); }

    get defaultSrcPath() { return `./glsl/${this.glTypeStr}.glsl`; }

    compile() {
        if (this.src === "") {
            console.log(`Will not attempt to compile, ${this.glTypeStr} source not set`);
            return null;
        }

        this.glObj = this.gl.createShader(this.glType);
        this.gl.shaderSource(this.glObj, this.src);
        this.gl.compileShader(this.glObj);

        if (!this.gl.getShaderParameter(this.glObj, this.gl.COMPILE_STATUS)) {
            console.log(`Could not compile ${this.glTypeStr} this.glObj.`);
            this.parseErrors(this);
            return null;
        }
        return this.glObj;
    }

    parseErrors() {
        const Range = ace.require("ace/range").Range;

        // get the whole error string
        const info = this.gl.getShaderInfoLog(this.glObj);
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

    load() {
        // try to load from localStorage, otherwise load from defaultSrcPath
        const localSrc = localStorage.getItem(this.glTypeStr);
        this.src = (localSrc) ? localSrc : util.loadFileSync(this.defaultSrcPath);
    }

    save() {
        console.log(`Saving ${this.glTypeStr} shader to localStorage.`);
        localStorage.setItem(this.glTypeStr, this.src);
    }

    createUI(parentEl) {
        this.el = parentEl.appendHTML(
            `<li>
            <label class="collapsible">${this.glTypeStr.toStartCase()} Shader</label>
            <pre></pre>
            </li>`
        );
        this.editor = ui.aceit(this.el.querySelector("pre"));
        this.editor.session.setUseWrapMode(true);
        this.editor.session.setWrapLimit(100);
        this.editor.addEventListener("change", () => {
            this.clearErrors();
        })
    }
}


