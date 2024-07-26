import LiveProgram from "./LiveProgram.js"
import Pass from "./Pass.js"
import * as util from "./util.js"

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

        const el = document.getElementById("ui");
        el.innerHTML = "";

        this.pass = new Pass(this.gl, el);
        this.prog = new LiveProgram(this.gl, el);

        if (this.prog.valid && this.gl.getError() === 0) {
            this.canDraw = true;
        }
    }

    compile() {
        this.prog.compile();
    }

    draw() {
        if (!this.canDraw) {
            return;
        }

        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.pass.draw();
    }
}

