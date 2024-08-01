import LiveProgram from "./LiveProgram.js"
import Pass from "./Pass.js"
import * as ui from "./util-ui.js"

export default class Renderer {
    gl = null;
    canDraw = false;
    pass = null;
    prog = null;

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

        this.pass = new Pass(this.gl, obj.pass);
        this.prog = new LiveProgram(this.gl, obj.prog);
    }


    compile() {
        this.prog.compile();
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
    }

    createUI(parentEl) {
        // add pass ui
        const listEl = parentEl.appendHTML(`<ul id="passes"></ul>`);
        // pass will be an array eventually, making this a loop
        this.pass.createUI(listEl);

        // add program ui
        this.prog.createUI(parentEl);
    }

    toObject() {
        return {
            pass: this.pass.toObject(),
            prog: this.prog.toObject()
        };
    }

    toString() {
        return JSON.stringify(this.toObject());
    }
}

