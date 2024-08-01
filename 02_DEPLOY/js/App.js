import Time from "./Time.js"
import Renderer from "./Renderer.js"
import * as util from "./util.js"
import * as ui from "./util-ui.js"

export default class App {
    renderer = new Renderer();
    time = new Time();

    constructor() {
        // create keyboard shortcuts and anything that opperates on whole App
        this.setupGlobalHandlers();

        // load settings/src from user's localStorage. will set defaults if none found.
        this.load();

        // create the HTML UI
        this.createUI(document.getElementById("ui"));

        // compile the shader program
        this.renderer.compile();

        // start the run loop
        this.loop(0);
    }

    get uiShowing() {
        return (document.getElementById("ui").classList.contains("hidden") === false);
    }

    toggleUI() {
        document.getElementById("ui").classList.toggle("hidden");
    }

    toggleRun() {
        this.time.isRunning = !this.time.isRunning;
        this.time.printStatus();
    }

    setupGlobalHandlers() {
        window.addEventListener("keydown", e => {
            if (e.shiftKey || e.altKey) {
                return;
            }
            // cmd+s, save/recompile
            else if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                this.save();
            }
            // cmd+e, toggle ui
            else if (e.key === "e" && (e.metaKey || e.ctrlkey)) {
                e.preventDefault();
                this.toggleUI();
            }
        });
    }

    loop(eventTime) {
        // time
        this.time.update(eventTime);

        // advance sim
        this.tick();

        // draw
        this.renderer.draw();

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

    load() {
        let obj = JSON.parse(localStorage.getItem("main"));
        // obj = null;
        if (obj) {
            console.log("loading", obj);
        }
        else {
            obj = {
                prog: {
                    vert: util.loadFileSync("./glsl/vert.glsl"),
                    frag: util.loadFileSync("./glsl/frag.glsl"),
                },
                pass: {
                    layout: [
                        {name: "pos",   size: 4},
                        {name: "color", size: 4},
                    ],
                    meshes: [
                        {
                            nVerts: 6,
                            data: {
                                pos: new Float32Array([
                                     0.50,   1.00,   0.00,   1.00,
                                     1.00,  -1.00,   0.00,   1.00,
                                    -1.00,  -1.00,   0.00,   1.00,
                                    -0.50,   1.00,   0.00,   1.00,
                                     1.00,  -1.00,   0.00,   1.00,
                                    -1.00,  -1.00,   0.00,   1.00,
                                ]),
                                color: new Float32Array([
                                    0.5,  0.0,  0.0,  1.0,
                                    0.0,  0.0,  0.0,  1.0,
                                    0.0,  0.0,  0.0,  1.0,
                                    0.0,  0.5,  0.5,  1.0,
                                    0.0,  0.0,  0.0,  1.0,
                                    0.0,  0.0,  0.0,  1.0,
                                ]),
                            },
                        },
                    ],
                },
            };
            console.log("no save found, loading default", obj);
        }
        this.renderer.fromObject(obj);
        // this.renderer.prog.vert.load();
        // this.renderer.prog.frag.load();
    }

    save() {
        console.log("SAVE START -----------------------------------------------------")
        // console.log("TEST SAVE ------------------------------------------------------")
        // this.renderer.save();
        // // compile shaders
        // this.renderer.compile();
        // // update vertex data from ui
        // this.renderer.pass.updateDataFromUI();
        // // save shader src to localStorage
        // this.renderer.prog.vert.save();
        // this.renderer.prog.frag.save();

        this.renderer.pass.updateDataFromUI();
        console.log("saving", this.renderer.toObject());
        localStorage.setItem("main", this.renderer.toString());
        console.log("------------------------------------------------------- SAVE END");
    }

    createUI(parentEl) {
        this.renderer.createUI(parentEl);
        // adds systematic handlers, etc
        ui.parse(parentEl);
    }
}
