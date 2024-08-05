import LiveProgram from "./LiveProgram.js"
import Pass from "./Pass.js"
import UniformBuffer from "./UniformBuffer.js"
import * as ui from "./util-ui.js"

export default class Renderer {
    gl = null;
    canDraw = false;
    pass = null;
    prog = null;
    unib = null;

    #glErrors = []

    constructor() {
        // setup context
        const canvas = document.getElementsByTagName("canvas")[0];
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        this.gl = canvas.getContext("webgl2");
        if (this.gl === null) {
            console.log("Error creating WebGL context.");
            return;
        }
    }

    fromObject(obj) {
        if (this.pass) this.pass.destroy();
        if (this.prog) this.prog.destroy();
        if (this.unib) this.unib.destroy();

        this.pass = new Pass(this.gl, obj.pass);
        this.prog = new LiveProgram(this.gl, obj.prog);
        this.unib = new UniformBuffer(this.gl, obj.unib);
    }


    compile() {
        this.prog.compile();
        this.#glErrors = this.gl.logErrors("COMPILE");
        if (this.prog.valid && this.gl.getError() === 0) {
            this.canDraw = true;
        }
    }

    draw() {
        if (!this.canDraw) {
            return;
        }

        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.pass.draw();

        this.#glErrors = this.gl.logErrors("DRAW");
        if (this.#glErrors.length) {
            console.log("%c Renderer disabled.", "color:red;");
            this.canDraw = false;
        }
    }

    createUI(parentEl) {
        // add pass ui
        const listEl = parentEl.appendHTML(`<ul id="passes"></ul>`);
        // pass will be an array eventually, making this a loop
        this.pass.createUI(listEl);

        // add uniform buffer ui
        this.unib.createUI(parentEl);

        // add program ui
        this.prog.createUI(parentEl);
    }

    toObject() {
        return {
            pass: this.pass.toObject(),
            prog: this.prog.toObject(),
            unib: this.unib.toObject(),
        };
    }

    toString() {
        return JSON.stringify(this.toObject());
    }
}

