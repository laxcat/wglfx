import Project from "./Project.js"
import Renderer from "./Renderer.js"
import Time from "./Time.js"
// import WASM from "./WASM.js";
import WASMZ85 from "./WASMZ85.js";
import * as util from "./util.js"
import * as ui from "./util-ui.js"

// App is a simple singleton
export default class App {
    // All members are available for global access
    static renderer     = new Renderer();
    static time         = new Time();
    static project      = null;
    static z85          = null;
    static instance     = null;

    constructor() {
        if (App.instance) {
            throw `App should be instantiated only once.`;
        }
        App.instance = this;

        // create keyboard shortcuts and anything that opperates on whole App
        this.setupGlobalHandlers();

        // load settings/src from user's localStorage. will set defaults if none found.
        this.load();
    }

    load() {
        const loaded = localStorage.getItem("main");

        // setup z85 encoder/decoder
        App.z85 = new WASMZ85();
        // test z85 encoder/decoder
        // App.z85.addEventListener(WASMZ85.READY, App.z85.test);

        // if nothing was loaded from localStorage, we don't need the z85 decoder right away
        if (loaded) {
            App.z85.addEventListener(WASMZ85.READY, () => {
                this.#onLoad(JSON.parse(loaded));
            });
        }
        else {
            this.#onLoad();
        }
    }

    #onLoad(loadedObj) {
        // setup project, from loaded or default
        this.project = new Project(App.renderer.gl, loadedObj);

        // create the HTML UI
        this.createUI(document.getElementById("ui"));

        // compile the shader program
        this.project.compile();

        // setup the simulations
        App.time.isRunning = true;

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
        App.time.isRunning = !App.time.isRunning;
        App.time.printStatus();
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
        App.time.update(eventTime);

        // advance sim
        this.tick();

        // draw
        App.renderer.draw(this.project);

        // next loop
        requestAnimationFrame(this.loop.bind(this));
    }

    tick() {
        if (!App.time.isRunning) {
            return;
        }

        this.project.unib.update();
    }

    save() {
        console.log("SAVE START -----------------------------------------------------")
        Coloris.close();
        this.project.pass.updateDataFromUI();
        this.project.unib.updateDataFromUI();
        this.project.unib.update();
        this.project.compile();
        let saveObj = this.project.toObject();
        console.log(saveObj);
        localStorage.setItem("main", JSON.stringify(saveObj));
        console.log("------------------------------------------------------- SAVE END");
    }

    createUI(parentEl) {
        this.project.createUI(parentEl);
        // adds systematic handlers, etc
        ui.parse(parentEl);
    }
}
