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

    static nextId = 1;
    static newName = "New Project";

    static templates = [
        {key:"blank"},
        {key:"basic2d", default: true},
        {key:"basic3d"},
    ];

    get valid() { return !!this.prog?.compiled; }

    constructor(serialObj) {
        super(serialObj);
        if (!this.id)   this.id = Project.nextId++;
        if (!this.name) this.name = Project.newName;
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
        App.gl.clear(App.gl.COLOR_BUFFER_BIT);
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
}
