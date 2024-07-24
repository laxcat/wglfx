import LiveProgram from "/LiveProgram.js"
import * as util from "/util.js"

export default class Renderer {
    gl = null;
    canDraw = false;
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

        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);

        const quadData = new Float32Array([
            0.0, 0.0, 0.0,
            0.0, 1.0, 0.0,
            1.0, 1.0, 0.0,
            0.0, 0.0, 0.0,
            1.0, 1.0, 0.0,
            1.0, 0.0, 0.0,
        ]);
        this.vertPosBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertPosBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, quadData, this.gl.STATIC_DRAW);
        this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(0);

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
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }
}

