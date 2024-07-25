import LiveProgram from "/LiveProgram.js"
import Pass from "/Pass.js"
import * as util from "/util.js"

export default class Renderer {
    gl = null;
    canDraw = false;
    pass = null;
    vertPosBuffer = null;
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

        this.prog = new LiveProgram(this.gl);

        this.pass = new Pass(this.gl);
        this.pass.setAttribDataForName(
            "pos",
            new Float32Array([
                0.0, 0.0, 0.0,
                0.0, 1.0, 0.0,
                1.0, 1.0, 0.0,
                0.0, 0.0, 0.0,
                1.0, 1.0, 0.0,
                1.0, 0.0, 0.0,
            ])
        );

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

