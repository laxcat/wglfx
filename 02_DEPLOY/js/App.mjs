import WebGL2 from "./extend/WebGL2RenderingContext.mjs"

import Project from "./Project.mjs"
import ProjectList from "./ProjectList.mjs"
import Time from "./Time.mjs"
import WASMZ85 from "./WASMZ85.mjs";
import * as util from "./util.mjs"
import * as ui from "./util-ui.mjs"

/*
    Root class for the project. Singleton.
    Handles renderer, run-loop, saving/loading, keyboard shortcuts, project list
    and other global asset handling, anything that is not the graphics code,
    which is all in Project.
*/
export default class App {
    // Settings
    static NAME             = "gfxtoy"
    static KEY_PROJ_LIST    = `${App.NAME}_projlist`;
    static KEY_PROJ_PREFIX  = `${App.NAME}_proj_`;

    // All members are available for global access
    static gl           = WebGL2.create();
    static time         = new Time();
    static projectList  = new ProjectList();
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

        // we need the decoder to parse data in the loaded data
        if (loaded) {
            App.z85.addEventListener(WASMZ85.READY, () => {
                this.#onLoad(JSON.parse(loaded));
            });
        }
        // if nothing was loaded from localStorage, we don't need the z85 decoder right away
        else {
            this.#onLoad();
        }
    }

    #onLoad(loadedObj) {
        // setup project, from loaded or default
        this.project = new Project(loadedObj);

        // create the HTML UI
        this.createUI();

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
        this.project.draw();

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
        if (!parentEl) parentEl = document.getElementById("ui");
        this.project.createUI(parentEl);
        // adds systematic handlers, etc
        ui.parse(parentEl);
    }
}
