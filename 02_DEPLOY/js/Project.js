import LiveProgram from "./LiveProgram.js"
import Pass from "./Pass.js"
import UniformBuffer from "./UniformBuffer.js"
import * as ui from "./util-ui.js"

export default class Project {
    gl = null;
    id = 0;
    pass = null;
    prog = null;
    unib = null;

    static nextId = 1;
    static newName = "New Project";

    /*
    Template objects should look like toObject() objects.
    If children are not set, prepareFromTemplate can set them to a template key
    */
    static templates = [
        {key:"blank"},
        {key:"basic2d", default: true},
        {key:"basic3d"},
    ];

    constructor(gl, obj) {
        this.gl = gl;
        this.fromObject(obj);
    }

    /*
    All fromObject (deserialize) functions have the following setup:
        • obj can be falsy, which will create project from default template
        • obj can be string, which will create project from template key
        • obj can be object (probably deserialized from load, see toObject for structure)
    */
    fromObject(obj) {
        // no obj sent. load default template
        if (!obj) {
            obj = Project.prepareFromTemplate();
            obj.id = Project.nextId++;
        }
        // template key (string) sent. load specific template
        else if (typeof obj == "string") {
            obj = Project.prepareFromTemplate(obj);
            obj.id = Project.nextId++;
        }

        this.id = obj.id;

        // if previous children existed, make sure they destroy any created objects
        if (this.pass) this.pass.destroy();
        if (this.prog) this.prog.destroy();
        if (this.unib) this.unib.destroy();

        // if obj's children (obj.pass) follow standard fromObject rules (see above)
        this.pass = new Pass(this.gl, obj.pass);
        this.prog = new LiveProgram(this.gl, obj.prog);
        this.unib = new UniformBuffer(this.gl, obj.unib);
    }

    compile() {
        this.prog.compile(this.unib.name);
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

    static prepareFromTemplate(key) {
        const obj = Project.templates.getKeyOrDefault(key);
        // if not set, set children to key (pass template key through to children)
        if (!obj.pass) obj.pass = key;
        if (!obj.prog) obj.prog = key;
        if (!obj.unib) obj.unib = key;
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

