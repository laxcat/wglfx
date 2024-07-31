import LiveProgram from "./LiveProgram.js"
import Pass from "./Pass.js"
import * as ui from "./util-ui.js"

export default class Renderer {
    gl = null;
    canDraw = false;
    pass = null;
    vertPosBuffer = null;
    prog = null;

    static initCounter;

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

        this.pass = new Pass(this.gl);
        this.prog = new LiveProgram(this.gl);
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
}

