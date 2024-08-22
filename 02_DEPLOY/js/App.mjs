import "./common/common-extension.mjs"
import "./common/html-extension.mjs"
import WebGL2 from "./common/webgl-extension.mjs"

import { confirmDialog } from "./common/util.mjs"
import { parse as uiParse } from "./common/util-ui.mjs"

import Project from "./Project.mjs"
import ProjectList from "./ProjectList.mjs"
import Time from "./Time.mjs"
import WASMZ85 from "./WASMZ85.mjs";

/*
    Root class for the project. Singleton.
    Handles renderer, run-loop, saving/loading, keyboard shortcuts, project list
    and other global asset handling, anything that is not the graphics code,
    which is all in Project.
*/
export default class App {
    // Settings
    static get NAME()               { return this.info?.repository.name.toLowerCase() ?? "wglfx"; }
    static get KEY_PROJ_LIST()      { return `${App.NAME}_projlist`; }
    static get KEY_PROJ_PREFIX()    { return `${App.NAME}_proj_`; }

    // All members are available for global access
    static gl           = WebGL2.create();
    static time         = new Time();
    static projectList  = new ProjectList();
    static project      = null;
    static z85          = null;
    static info         = null;
    static instance     = null;

    uiEl = null;
    projectEl = null;

    constructor(info) {
        if (App.instance) {
            throw new Error(`App should be instantiated only once.`);
        }
        App.instance = this;

        if (info) App.info = info;

        console.log("App.gl.hasErrors", App.gl.hasErrors);

        this.uiEl = document.getElementById("ui");

        // create keyboard shortcuts, window resize, etc
        this.setupGlobalHandlers();

        // load settings/src from user's localStorage. will set defaults if none found.
        this.load();
    }

    load() {
        // loads the list of projects, but no projects yet
        App.projectList.load();

        // setup z85 encoder/decoder
        App.z85 = new WASMZ85();
        // test z85 encoder/decoder
        // App.z85.addEventListener(WASMZ85.READY, App.z85.test);

        // We need the decoder to parse the project load
        // does the project list have a selected project to load?
        if (App.projectList.selected) {
            App.z85.addEventListener(WASMZ85.READY, () => {
                this.#onLoad();
            });
        }
        // no projects found, we don't need the z85 decoder right away
        else {
            this.#onLoad();
        }
    }

    #onLoad(loadedObj) {
        // setup project, load last selected project or create default
        App.project = App.projectList.createProject();

        console.log("projectList", App.projectList);
        console.log("project", App.project);

        // create the HTML UI
        this.createUI();

        // compile the shader program
        App.project.compile();

        // setup the simulations
        App.time.isRunning = true;

        // start the run loop
        if (App.project.valid) {
            this.loop(0);
        }
    }

    // destroys App.project, then sets the project returned by createProjFn
    static setProject(createProjFn, userConfirmed=false) {
        // guard if user has not confirmed
        if (App.project.hasChanged() && !userConfirmed) {
            confirmDialog(
                `Project "${App.project.name}" has unsaved changes.<br>`+
                "Discard changes and continue?",

                "Cancel",
                () => App.projectList.resetProjListUI(),

                "Discard Changes",
                () => App.setProject(createProjFn, true)
            );
            return;
        }

        // Project has never been changed, and if not saved, user has confirmed
        if (!App.project.hasSaved()) {
            App.projectList.removeItem(App.project.id);
        }

        // destroy old project and
        App.instance.projectEl.remove();
        App.project.destroy();
        App.project = null;
        App.project = createProjFn();
        App.instance.createProjectUI();
        App.projectList.setSelected(App.project);
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

        window.addEventListener("resize", e => {
            App.gl.canvas.width = window.innerWidth;
            App.gl.canvas.height = window.innerHeight;
            App.gl.viewport(0, 0, window.innerWidth, window.innerHeight);
        });
    }

    loop(eventTime) {
        // time
        App.time.update(eventTime);

        // advance sim
        this.tick();

        // draw
        App.project.draw();

        // next loop
        requestAnimationFrame(this.loop.bind(this));
    }

    tick() {
        if (!App.time.isRunning) {
            return;
        }
        App.project.tick();
    }

    save() {
        console.log("SAVE START -----------------------------------------------------")
        App.project.save();
        App.projectList.save();
        console.log("------------------------------------------------------- SAVE END");
    }

    createUI() {
        App.projectList.createUI(this.uiEl);
        this.projectEl = App.project.createUI(this.uiEl);
        // adds systematic handlers, etc
        uiParse(this.uiEl);
    }

    createProjectUI() {
        this.projectEl = App.project.createUI(this.uiEl);
        uiParse(this.projectEl);
    }
}
