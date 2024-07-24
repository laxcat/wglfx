export class Shader {
    initPath = "";      // if set, loads from path
    initSource = "";    // if path not set, set source directly
    editor = null;      // instance of ace.editor
    errors = [];
    glObj = null;
    glType = null;
}

export class LiveProgram {
    gl = null;
    vert = new Shader();
    frag = new Shader();
    program = null;

    constructor(gl, vertSetup, fragSetup) {
        this.gl = gl;
        this.vert = {...this.vert, ...vertSetup, glType: gl.VERTEX_SHADER  };
        this.frag = {...this.frag, ...fragSetup, glType: gl.FRAGMENT_SHADER};

        this.initShader(this.vert);
        this.initShader(this.frag);
        this.compile();
    }

    get programValid() {
        return (program !== null);
    }

    initShader(shader) {
        if (shader.editor === null) {
            console.log(`Could not init shader, must be editor. shader: ${shader}`);
        }

        if (shader.initPath) {
            shader.editor.setValue(this.loadFileSync(shader.initPath), -1);
        }
        else if (shader.initSource) {
            shader.editor.setValue(shader.initSource, -1);
        }

        shader.editor.addEventListener("change", () => {
            this.clearErrors(shader);
        })
    }

    loadFileSync(path) {
        let request = new XMLHttpRequest();
        request.open("GET", path, false);
        request.send();
        if (request.status == 200) {
            return request.responseText;
        }
        return null;
    }

    compile() {
        this.gl.deleteProgram(this.program);
        this.program = null;
        this.clearErrors(this.vert);
        this.clearErrors(this.frag);

        this.createShader(this.vert);
        this.createShader(this.frag);
        this.createProgram();

        if (!this.program) {
            this.showErrors(this.vert);
            this.showErrors(this.frag);
            return false;
        }

        this.gl.useProgram(this.program);
        console.log(`Program compiled/linked successfully.`);
        return true;
    }

    createShader(shader) {
        if (shader.editor.getValue() === "") {
            console.log(`Will not attempt to compile, ${this.shaderTypeStr(shader.glType)} source not set`);
            return null;
        }

        shader.glObj = this.gl.createShader(shader.glType);
        this.gl.shaderSource(shader.glObj, shader.editor.getValue());
        this.gl.compileShader(shader.glObj);

        if (!this.gl.getShaderParameter(shader.glObj, this.gl.COMPILE_STATUS)) {
            console.log(`Could not compile ${this.shaderTypeStr(shader.glType)} shader.glObj.`);
            this.parseErrors(shader);
            return null;
        }
        return shader.glObj;
    }

    createProgram() {
        if (!this.vert.glObj || !this.frag.glObj) {
            console.log(`Will not attempt to link shader program. Missing shader.`);
            return null;
        }

        this.program = this.gl.createProgram();

        this.gl.attachShader(this.program, this.vert.glObj);
        this.gl.attachShader(this.program, this.frag.glObj);

        this.gl.linkProgram(this.program);

        this.gl.detachShader(this.program, this.vert.glObj);
        this.gl.detachShader(this.program, this.frag.glObj);

        this.gl.deleteShader(this.vert.glObj);
        this.gl.deleteShader(this.frag.glObj);

        if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            const info = this.gl.getProgramInfoLog(this.program);
            console.log(`Error linking shader program. \n\n${info}`);
            this.gl.deleteProgram(this.program);
            this.program = null;
        }
    }

    parseErrors(shader) {
        const Range = ace.require("ace/range").Range;

        // get the whole error string
        const info = this.gl.getShaderInfoLog(shader.glObj);
        // split on lines
        const errors = info.split("\n");
        // for each line, construct an error object
        errors.forEach((item) => {
            const parts = item.split(":");
            if (parts[0] === "ERROR") {
                const line = parseInt(parts[2]) - 1; // ace wants 0-index lines/cols
                const part = parts[3].trim().replaceAll("'", "");
                const partStart = shader.editor.session.getLine(line).indexOf(part);
                const error = {
                    line: line,
                    partStart: partStart,
                    partEnd: partStart + part.length,
                    error: parts[4].trim(),
                    marker: null,
                };
                shader.errors.push(error);
            }
        });
    }

    showErrors(shader) {
        const Range = ace.require("ace/range").Range;

        let annotations = [];
        shader.errors.forEach((item) => {
            const r = new Range(item.line, item.partStart, item.line, item.partEnd);
            item.marker = shader.editor.session.addMarker(r, "ace-error", "text");
            annotations.push({
                column: item.partStart,
                row: item.line,
                text: item.error,
                type: "error",
            })
        });
        shader.editor.session.setAnnotations(annotations);
    }

    clearErrors(shader) {
        // [this.vert, this.frag].forEach((shader) => {
            shader.errors.forEach((item) => {
                shader.editor.session.removeMarker(item.marker);
            });
            shader.editor.session.setAnnotations();
            shader.errors = [];
        // });
    }

    shaderTypeStr(type) {
        return  (type === this.gl.VERTEX_SHADER)    ? "vert" :
                (type === this.gl.FRAGMENT_SHADER)  ? "frag" :
                "unknown-type";
    }

}
