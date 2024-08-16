import App from "./App.mjs"
import LiveProgram from "./LiveProgram.mjs"
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
    id = 0;
    name = "";
    pass = null;
    prog = null;
    unib = null;

    static nextId = 1;
    static newName = "New Project";

    static templates = [
        {key:"blank"},
        {key:"basic2d", default: true},
        {key:"basic3d"},
    ];

    static serialBones = {
        id:   undefined,
        name: undefined,
        pass: undefined,
        prog: undefined,
        unib: undefined,
    };

    constructor(serialObj) {
        super();
        this.deserialize(serialObj);
    }

    deserialize(serialObj) {
        serialObj = super.deserialize(serialObj);

        this.id =   serialObj.id    || Project.nextId++;
        this.name = serialObj.name  || Project.newName;

        // if previous children existed, make sure they destroy any created objects
        if (this.pass) this.pass.destroy();
        if (this.prog) this.prog.destroy();
        if (this.unib) this.unib.destroy();

        // serialObj's children (serialObj.pass) follow standard fromObject rules (see above)
        this.pass = new Pass(serialObj.pass);
        this.prog = new LiveProgram(serialObj.prog);
        this.unib = new UniformBuffer(serialObj.unib);
    }

    compile() {
        this.prog.compile(this.unib.name);
        App.gl.logErrors("COMPILE");
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

    toString() {
        return JSON.stringify(this.serialize());
    }
}
