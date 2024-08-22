import Serializable from "./common/Serializable.mjs"

import App from "./App.mjs"
import ShaderProgram from "./ShaderProgram.mjs"
import Pass from "./Pass.mjs"
import UniformBuffer from "./UniformBuffer.mjs"

/*
    A project, holding all information and UI.
    Can be thought of as root of actual drawing functionality.

    TODO:
    • save each project to its own localStorage item
*/
export default class Project extends Serializable {
    static initProps = {
        id:   undefined,
        name: undefined,
        pass: Pass,
        prog: ShaderProgram,
        unib: UniformBuffer,
        timeSaved: Date,
    };
    timeChanged = null;
    #listenForChanges = true;

    static templates = [
        {key:"blank", name:"Blank", pass:"blank", prog:"blank", unib:"blank"},
        {key:"basic2d", name:"Basic 2D", default:true},
        {key:"basic3d", name:"Basic 3D", },
    ];

// STATIC API --------------------------------------------------------------- //

    static load(id, expectedName) {
        const storageKey = Project.getStorageKey(id);
        const projStr = localStorage.getItem(storageKey);
        if (!projStr) {
            console.log(`%cWARNING! Could not load ${expectedName} (${storageKey})`, "color:red;");
            return null;
        }
        return JSON.parse(projStr);
    }

    static getStorageKey(id) { return App.KEY_PROJ_PREFIX+id.toString(); }

    static CHANGE_EVENT = "projectchange";
    static makeChangeEvent(detail) {
        return new CustomEvent(Project.CHANGE_EVENT, {detail,bubbles:true});
    }

// API: STATUS / INFO ------------------------------------------------------- //

    get valid() { return !!this.prog?.compiled; }

    get storageKey() { return Project.getStorageKey(this.id); }

    hasChanged() {
        const changedTimeExists = (
            this.timeChanged &&
            !isNaN(this.timeChanged.valueOf())
        );
        if (this.hasSaved() && changedTimeExists) {
            return (this.timeChanged > this.timeSaved);
        }
        return changedTimeExists;
    }

    hasSaved() {
        const savedValue = this.timeSaved.valueOf();
        return (this.timeSaved && !isNaN(savedValue));
    }

    static timeFormat = Intl.DateTimeFormat(undefined, {dateStyle:"short",timeStyle:"short"});
    get statusStr() {
        const saved = this.hasSaved();
        const changed = this.hasChanged();
        let str = "";
        if (changed) str += "* ";
        if (saved) {
            str += (changed) ? "Last saved " : "Saved ";
            str += Project.timeFormat.format(this.timeSaved)
                   .replaceAll(" ", "")
                   .replaceAll("AM", "a")
                   .replaceAll("PM", "p");
        }
        else {
            str += "Not saved";
        }
        return str;
    }

    hasUnsavedChanges() {
        return (
            // has a valid changed date...
            hasChanged() &&
            // and either...
            (!hasSaved() ||
            this.timeSaved < this.timeChanged)
        )
    }

// LIFECYCLE ---------------------------------------------------------------- //

    destroy() {
        this.pass.destroy();
        this.prog.destroy();
        this.unib.destroy();
    }

    compile() {
        this.prog.compile(this.unib.name);
        App.gl.logErrors("COMPILE");
    }

    tick() {
        this.unib.update();
    }

    draw() {
        if (App.gl.hasErrors) {
            return;
        }
        this.pass.draw();
        App.gl.logErrors("DRAW");
    }

    createUI(parentEl) {
        const projEl = parentEl.appendHTML(
            `
            <div id="project">
            <section id="passes">
                <label class="collapsible">Passes</label>
                <ul></ul>
            </section>
            </div>
            `
        );

        // add pass ui
        const passEl = projEl.querySelector("#passes ul");
        // pass will be an array eventually, making this a loop
        this.pass.createUI(passEl);

        // add uniform buffer ui
        this.unib.createUI(projEl);

        // add program ui
        this.prog.createUI(projEl);

        projEl.addEventListener(Project.CHANGE_EVENT, e => {
            if (this.#listenForChanges) {
                // console.log(e);
                this.timeChanged = new Date();
                App.projectList.updateStatusUI();
            }
        });

        return projEl;
    }

    save() {
        this.#listenForChanges = false;
        Coloris.close();
        this.timeSaved =
        this.timeChanged = new Date();
        this.pass.updateDataFromUI();
        this.unib.updateDataFromUI();
        this.unib.update();
        this.compile();
        let serialObj = this.serialize();
        localStorage.setItem(this.storageKey, JSON.stringify(serialObj));
        console.log(serialObj);
        this.#listenForChanges = true;
    }

    deleteSaved() {
        localStorage.removeItem(this.storageKey);
    }
}
