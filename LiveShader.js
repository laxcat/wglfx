export default class LiveShader {
    gl = null;              // reference to webgl context
    editor = null;          // instance of ace.editor
    errors = [];            // array of error objects, see parseErrors
    glObj = null;           // the webgl shader object
    glType = null;          // the webgl shader type
    glTypeStr = null;       // friendly string for webgl type

    constructor(gl, type, editor) {
        this.gl = gl;
        this.glType = type;
        this.editor = editor;

        this.glTypeStr = (type === this.gl.VERTEX_SHADER)    ? "vert" :
                         (type === this.gl.FRAGMENT_SHADER)  ? "frag" :
                         "unknown-type";

        this.editor.addEventListener("change", () => {
            this.clearErrors();
        })
    }

    compile() {
        if (this.editor.getValue() === "") {
            console.log(`Will not attempt to compile, ${this.glTypeStr} source not set`);
            return null;
        }

        this.glObj = this.gl.createShader(this.glType);
        this.gl.shaderSource(this.glObj, this.editor.getValue());
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
        const errors = info.split("\n");
        // for each line, construct an error object
        errors.forEach((item) => {
            const parts = item.split(":");
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
        const Range = ace.require("ace/range").Range;

        let annotations = [];
        this.errors.forEach((item) => {
            const r = new Range(item.line, item.partStart, item.line, item.partEnd);
            item.marker = this.editor.session.addMarker(r, "ace-error", "text");
            annotations.push({
                column: item.partStart,
                row: item.line,
                text: item.error,
                type: "error",
            })
        });
        this.editor.session.setAnnotations(annotations);
    }

    clearErrors() {
        this.errors.forEach((item) => {
            this.editor.session.removeMarker(item.marker);
        });
        this.editor.session.setAnnotations();
        this.errors = [];
    }
}


