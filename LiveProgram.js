import LiveShader from "/LiveShader.js"
import * as util from "/util.js"

export default class LiveProgram {
    gl = null;      // webgl context object
    vert = null;    // instance of LiveShader
    frag = null;    // instance of LiveShader
    glObj = null;   // the webgl program object

    constructor(gl, vertEditor, fragEditor) {
        this.gl = gl;
        this.vert = new LiveShader(gl, gl.VERTEX_SHADER,   vertEditor);
        this.frag = new LiveShader(gl, gl.FRAGMENT_SHADER, fragEditor);
        this.compile();
    }

    get valid() {
        return (this.glObj !== null);
    }

    compile() {
        this.gl.deleteProgram(this.glObj);
        this.glObj = null;
        this.vert.clearErrors();
        this.frag.clearErrors();

        this.vert.compile();
        this.frag.compile();
        this.link();

        if (!this.glObj) {
            this.vert.showErrors();
            this.frag.showErrors();
            return false;
        }

        this.gl.useProgram(this.glObj);
        console.log(`Shader glObj compiled/linked successfully.`);
        return true;
    }

    link() {
        if (!this.vert.glObj || !this.frag.glObj) {
            console.log(`Will not attempt to link shader program. Missing shader.`);
            return null;
        }

        this.glObj = this.gl.createProgram();

        this.gl.attachShader(this.glObj, this.vert.glObj);
        this.gl.attachShader(this.glObj, this.frag.glObj);

        this.gl.linkProgram(this.glObj);

        this.gl.detachShader(this.glObj, this.vert.glObj);
        this.gl.detachShader(this.glObj, this.frag.glObj);

        this.gl.deleteShader(this.vert.glObj);
        this.gl.deleteShader(this.frag.glObj);

        if (!this.gl.getProgramParameter(this.glObj, this.gl.LINK_STATUS)) {
            const info = this.gl.getProgramInfoLog(this.glObj);
            console.log(`Error linking shader program. \n\n${info}`);
            this.gl.deleteProgram(this.glObj);
            this.glObj = null;
        }
    }
}
