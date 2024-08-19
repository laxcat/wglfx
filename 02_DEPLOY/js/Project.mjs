import App from "./App.mjs"
import ShaderProgram from "./ShaderProgram.mjs"
import Pass from "./Pass.mjs"
import Serializable from "./Serializable.mjs"
import UniformBuffer from "./UniformBuffer.mjs"
import * as ui from "./util-ui.mjs"

/*
    A project, holding all information and UI.
    Can be thought of as root of actual drawing functionality.

    TODO:
    • save each project to its own localStorage item
*/
export default class Project extends Serializable {
    static serialProps = {
        id:   undefined,
        name: undefined,
        pass: Pass,
        prog: ShaderProgram,
        unib: UniformBuffer,
    };

    static templates = [
        {key:"blank", name:"Blank", },
        {key:"basic2d", name:"Basic 2D", default: true},
        {key:"basic3d", name:"Basic 3D", },
    ];

    static load(id, expectedName) {
        const storageKey = Project.getStorageKey(id);
        let serialStr;
        if (typeof id !== "number" ||
            (!(serialStr = localStorage.getItem(storageKey)))) {
            console.log(`%cWARNING! Could not load ${expectedName} (${storageKey})`, "color:red;");
            return null;
        }
        return JSON.parse(serialStr);
    }

    static getStorageKey(id) { return App.KEY_PROJ_PREFIX+id.toString(); }

    get valid() { return !!this.prog?.compiled; }

    get storageKey() { return Project.getStorageKey(this.id); }

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
        // add pass ui
        const listEl = parentEl.appendHTML(
            `
            <section id="passes">
                <label class="collapsible">Passes</label>
                <ul></ul>
            </section>
            `
        );
        // pass will be an array eventually, making this a loop
        this.pass.createUI(listEl.children[1]);

        // add uniform buffer ui
        this.unib.createUI(parentEl);

        // add program ui
        this.prog.createUI(parentEl);
    }

    save() {
        Coloris.close();
        this.pass.updateDataFromUI();
        this.unib.updateDataFromUI();
        this.unib.update();
        this.compile();
        let serialObj = this.serialize();
        localStorage.setItem(this.storageKey, JSON.stringify(serialObj));
        console.log(serialObj);
    }
}
