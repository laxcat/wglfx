import LiveShader from "./LiveShader.js"
import * as util from "./util.js"

export default class LiveProgram {
    gl = null;      // webgl context object
    vert = null;    // instance of LiveShader
    frag = null;    // instance of LiveShader
    glObj = null;   // the webgl program object
    el = null;

    static default = {
        vert: () => util.loadFileSync("./glsl/vert.glsl"),
        frag: () => util.loadFileSync("./glsl/frag.glsl"),
    };

    constructor(gl, obj=LiveProgram.default) {
        this.gl = gl;
        this.vert = new LiveShader(gl, gl.VERTEX_SHADER);
        this.frag = new LiveShader(gl, gl.FRAGMENT_SHADER);
        this.fromObject(obj);
    }

    fromObject(obj) {
        this.vert.src = (typeof obj.vert === "function") ? obj.vert() : obj.vert;
        this.frag.src = (typeof obj.frag === "function") ? obj.frag() : obj.frag;
    }

    destroy() {
        this.gl.deleteProgram(this.glObj);
        this.glObj = null;
        this.vert.destroy();
        this.frag.destroy();
        this.vert.clearErrors();
        this.frag.clearErrors();
    }

    get valid() {
        return (this.glObj !== null);
    }

    compile(uboBlockName=null) {
        console.log(`program compile, UBO Block Name:"${uboBlockName}"`);

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

        if (uboBlockName) {
            const uboBlockIndex = this.gl.getUniformBlockIndex(this.glObj, uboBlockName);
            // when index not found, returning 0xffffffff (or -1?),
            // but i couldn't find documentation for it
            if (uboBlockIndex !== 0xffffffff) {
                this.gl.uniformBlockBinding(this.glObj, uboBlockIndex, 0);
                console.log(`Attaching uniform block "${uboBlockName}" to UBO index 0.`);
            }
        }

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

        this.vert.destroy();
        this.frag.destroy();

        if (!this.gl.getProgramParameter(this.glObj, this.gl.LINK_STATUS)) {
            const info = this.gl.getProgramInfoLog(this.glObj);
            console.log(`Error linking shader program. \n${info}`);
            this.gl.deleteProgram(this.glObj);
            this.glObj = null;
        }
    }

    createUI(parentEl) {
        this.el = parentEl.appendHTML(`<ul id="program"></ul>`);
        this.vert.createUI(this.el);
        this.frag.createUI(this.el);
    }

    toObject() {
        return {
            vert: this.vert.src,
            frag: this.frag.src,
        };
    }

    toString() {
        return JSON.stringify(this.toObject());
    }
}
