import LiveProgram from "./LiveProgram.js"
import Pass from "./Pass.js"
import UniformBuffer from "./UniformBuffer.js"
import * as ui from "./util-ui.js"

export default class Renderer {
    gl = null;
    canDraw = false;
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

    draw(project) {
        if (!this.canDraw) {
            return;
        }
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        project.draw();
        this.checkGLErrors("DRAW");
    }

    checkGLErrors(msg) {
        if (!this.gl) {
            this.canDraw = false;
            return;
        }
        this.#glErrors = this.gl.logErrors(msg);
        this.canDraw = (this.#glErrors.length === 0);
    }

}

