import App from "./App.js"
import LiveProgram from "./LiveProgram.js"
import Pass from "./Pass.js"
import UniformBuffer from "./UniformBuffer.js"
import * as ui from "./util-ui.js"

/*
    A project, holding all information and UI.
    Can be thought of as root of actual drawing functionality.

    TODO:
    • save each project to its own localStorage item
*/
export default class Project {
    id = 0;
    name = "";
    pass = null;
    prog = null;
    unib = null;

    static nextId = 1;
    static newName = "New Project";

    /*
    Template objects should look like toObject() objects.
    If children are not set, makeObjectFromTemplate can set them to a template key
    */
    static templates = [
        {key:"blank"},
        {key:"basic2d", default: true},
        {key:"basic3d"},
    ];

    constructor(obj) {
        this.fromObject(obj);
    }

    /*
    All fromObject (deserialize) functions work like this:
        • obj can be falsy, which will create project from default template
        • obj can be string, which will create project from template key
        • obj can be object (probably deserialized from load, see toObject for structure)
    */
    fromObject(obj) {
        // no obj sent. load default template
        if (!obj) {
            obj = Project.makeObjectFromTemplate();
        }
        // template key (string) sent. load specific template
        else if (typeof obj == "string") {
            obj = Project.makeObjectFromTemplate(obj);
        }

        this.id = obj.id;
        this.name = obj.name;

        // if previous children existed, make sure they destroy any created objects
        if (this.pass) this.pass.destroy();
        if (this.prog) this.prog.destroy();
        if (this.unib) this.unib.destroy();

        // obj's children (obj.pass) follow standard fromObject rules (see above)
        this.pass = new Pass(obj.pass);
        this.prog = new LiveProgram(obj.prog);
        this.unib = new UniformBuffer(obj.unib);
    }

    compile() {
        this.prog.compile(this.unib.name);
        App.renderer.checkGLErrors("COMPILE");
    }

    draw() {
        this.pass.draw();
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

    static makeObjectFromTemplate(key) {
        const obj = {...Project.templates.findByKeyOrDefault(key)};

        // if not set, set children to key (pass template key through to children)
        if (!obj.pass) obj.pass = key;
        if (!obj.prog) obj.prog = key;
        if (!obj.unib) obj.unib = key;

        obj.id = Project.nextId++;
        obj.name = Project.newName;

        return obj;
    }

    toObject() {
        return {
            pass: this.pass.toObject(),
            prog: this.prog.toObject(),
            unib: this.unib.toObject(),
        };
    }

    toString() {
        return JSON.stringify(this.toObject());
    }
}

