import Time from "./Time.js"
import Renderer from "./Renderer.js"
import Pass from "./Pass.js"
import UniformBuffer from "./UniformBuffer.js"
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

        // setup the simulations
        this.time.isRunning = true;

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

        this.renderer.unib.update();
    }

    load() {
        let obj = JSON.parse(localStorage.getItem("main"));
        if (!obj) {
            obj = {
                prog: {
                    vert: util.loadFileSync("./glsl/vert.glsl"),
                    frag: util.loadFileSync("./glsl/frag.glsl"),
                },
                pass: Pass.default,
                unib: UniformBuffer.default,
            };
        }
        this.renderer.fromObject(obj);
    }

    save() {
        console.log("SAVE START -----------------------------------------------------")
        Coloris.close();
        this.renderer.pass.updateDataFromUI();
        this.renderer.unib.updateDataFromUI();
        this.renderer.unib.update();
        this.renderer.compile();
        console.log(this.renderer.toObject());
        localStorage.setItem("main", this.renderer.toString());
        console.log("------------------------------------------------------- SAVE END");
    }

    createUI(parentEl) {
        this.renderer.createUI(parentEl);
        // adds systematic handlers, etc
        ui.parse(parentEl);
    }
}
