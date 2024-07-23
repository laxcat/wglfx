import Time from "/Time.js"
import {LiveProgramConfig, LiveProgram} from "/LiveProgram.js"
import * as util from "/util.js"

export default class GL {
    gl = null;
    time = new Time();
    canDraw = false;
    program = null;
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

        // // setup click event
        // canvas.addEventListener("click", this.toggleRun.bind(this));


        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);

        this.prog = new LiveProgram(
            this.gl,
            {
                initPath: "/vert.glsl",
                id: "vert",
            },
            {
                initPath: "/frag.glsl",
                id: "frag",
            }
        );

        window.addEventListener("keydown", (e) => {
            if (e.shiftKey || e.altKey) {
                return;
            }
            // cmd+s, save/recompile
            else if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
                this.canDraw = this.prog.compile();
                e.preventDefault();
            }
            // cmd+d, toggle ui
            else if (e.key === "d" && (e.metaKey || e.ctrlkey)) {
                this.toggleUI();
                e.preventDefault();
            }
        });

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

        if (this.prog.program && this.gl.getError() === 0) {
            this.canDraw = true;
        }

        // util.checkError(this.gl);

        // start
        this.loop(0);
    }

    toggleUI() {
        const ui = document.getElementById("ui");
        ui.style.display = (ui.style.display === "none") ? "block" : "none";
    }

    toggleRun() {
        this.time.isRunning = !this.time.isRunning;
        this.time.printStatus();
    }

    loop(eventTime) {
        // time
        this.time.update(eventTime);

        // advance sim
        this.tick();

        // draw
        this.draw();

        // next loop
        requestAnimationFrame(this.loop.bind(this));
    }

    tick() {
        if (!this.time.isRunning) {
            return;
        }
        // console.log("global", this.time.global, this.time.dt);
        // console.log("now", this.time.now);
    }

    draw() {
        if (!this.canDraw) {
            return;
        }

        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }
}
