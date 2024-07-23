export class LiveProgramConfig {
    initPath = "";      // if set, loads from path
    initSource = "";    // if path not set, set source directly
    id = null;          // if set, sets el with getElementById
    el = null;          // can be set directly by user. set from id if null.
    lastValid = "";     // last source that was successfully compiled
}

export class LiveProgram {
    gl = null;
    vert = new LiveProgramConfig();
    frag = new LiveProgramConfig();
    program = null;

    constructor(gl, vertConfig, fragConfig) {
        this.gl = gl;
        this.vert = {...this.vert, ...vertConfig};
        this.frag = {...this.frag, ...fragConfig};

        this.initShader(this.vert);
        this.initShader(this.frag);
        this.compile();

        console.log(this);
    }

    get dirty() {

    }

    get programValid() {
        return (program !== null);
    }

    initShader(config) {
        if (config.el === null && config.id) {
            config.el = document.getElementById(config.id);
        }

        if (config.el === null) {
            console.log(`Could not init shader, element or id must be set. config: ${config}`);
        }

        if (config.initPath) {
            config.el.value = this.loadFileSync(config.initPath);
        }
        else if (config.initSource) {
            config.el.value = config.initSource;
        }
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
        this.program = null;

        const vertShader = this.createShader(this.vert.el.value, this.gl.VERTEX_SHADER);
        const fragShader = this.createShader(this.frag.el.value, this.gl.FRAGMENT_SHADER);
        this.program = this.createProgram(this.gl, vertShader, fragShader);
        this.gl.useProgram(this.program);

        if (this.program) {
            console.log("compile successful");
            return true;
        }
        return false;
    }

    createShader(sourceCode, type) {
        if (this.vert.el.value === "") {
            console.log(`Could not compile, ${this.shaderTypeStr(type)} source not set`);
        }

        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, sourceCode);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            const info = this.gl.getShaderInfoLog(shader);
            console.log(`Could not compile ${this.shaderTypeStr(type)} shader. \n\n${info}`);
            return null;
        }
        return shader;
    }

    createProgram(gl, vertShader, fragShader) {
        if (!vertShader || !fragShader) {
            console.log(`Could not compile WebGL program.`);
            return null;
        }

        const program = gl.createProgram();

        gl.attachShader(program, vertShader);
        gl.attachShader(program, fragShader);

        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const info = gl.getProgramInfoLog(program);
            console.log(`Could not compile WebGL program. \n\n${info}`);
            return null;
        }

        return program;
    }

    shaderTypeStr(type) {
        return  (type === this.gl.VERTEX_SHADER)    ? "vert" :
                (type === this.gl.FRAGMENT_SHADER)  ? "frag" :
                "unknown-type";
    }

}
