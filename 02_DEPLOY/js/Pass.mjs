import Serializable from "./common/Serializable.mjs"
import Color from "./common/Color.mjs"
import { confirmDialog } from "./common/util.mjs"
import { parse as uiParse, makeReorderable } from "./common/util-ui.mjs"

import App from "./App.mjs"
import Mesh from "./Mesh.mjs"
import Project from "./Project.mjs"
import VertexAttrib from "./VertexAttrib.mjs"

/*
    A draw pass, with necessary objects, data, and UI.
    Draws a list of meshes (bound by a vertex layout) to framebuffer.

    TODO:
    • ability to draw to texture for multiple pass pipelines
*/
class PassColor extends Color {
    serialize() { return this.toRGBAStr(); }
}

export default class Pass extends Serializable {
    static initProps = {
        name: undefined,
        clearColor: PassColor,
        layout: [VertexAttrib],
        meshes: [Mesh],
    }
    el = null;

    static templates = [
        { // first template is default unless otherwise indicated
            key: "basic2d",
            name: "Main",
            clear: "000000",
            layout: [
                {key: "pos",   size: 4},
                {key: "color", size: 4},
                {key: "norm",  size: 3},
                {key: "tan",   size: 3},
            ],
            meshes: ["debugTriangles"],
        },
        {
            key: "blank",
            clear: "000000",
            layout: [],
            meshes: [],
        }
    ];

    destroy() {
        this.meshes.forEach(mesh => mesh.destroy());
    }

    reset(initObj) {
        this.destroy();
        this.deserialize(initObj);
        this.el.dispatchEvent(Project.makeChangeEvent("passReset"));
    }

    draw() {
        App.gl.clearColor(...this.clearColor.data);
        App.gl.clear(App.gl.COLOR_BUFFER_BIT);
        let i = this.meshes.length;
        while(i--) {
            const mesh = this.meshes[i];
            mesh.bind(this.layout);
            mesh.draw();
        }
    }

    updateDataFromUI() {
        this.meshes.forEach(mesh => mesh.updateDataFromUI());
    }

    createUI(parentEl) {
        this.el = parentEl.appendHTML(`<li></li>`);
        this.#fillUI();
    }

    resetUI() {
        // clear contents and listeners
        this.el.innerHTML = "";
        // refill and recreate listeners
        this.#fillUI();
        // add global listeners
        uiParse(this.el);
    }

    #fillUI() {
        this.el.appendHTML(
            `
            <label class="collapsible">${this.name}</label>
            <section>

                <label>Clear Color</label>
                <input type="text" class="color" value="#${this.clearColor.toRGBAStr()}">

                <label class="collapsible">Layout</label>
                <table class="layout"><tbody></tbody></table>

                <label class="collapsible">Meshes</label>
                <ul class="meshes"></ul>

                <button class="action">Reset Pass To Default</button>
            </section>
            `
        );

        // add clear color handler
        const colorEl = this.el.querySelector(`input.color`);
        colorEl.addEventListener("input", e => {
            this.clearColor.set(colorEl.value);
            this.el.dispatchEvent(Project.makeChangeEvent("passClearColor"));
        });
        Coloris({
            forceAlpha: true,
        });
        Coloris.wrap(colorEl);
        Coloris(colorEl);

        // create attributes list (layout)
        const layoutEl = this.el.querySelector("table.layout tbody");
        this.layout.forEach(attrib => attrib.createUI(layoutEl));
        // make rows drag-and-drop reorderable
        makeReorderable(layoutEl, {
            onReorder: (oldIndex, newIndex) => {
                const oldAttrib = this.layout.splice(oldIndex, 1)[0];
                this.layout.splice(newIndex, 0, oldAttrib);
                this.layout.forEach((child, index) => child.index = index);
                this.el.dispatchEvent(Project.makeChangeEvent("layoutReorder"));
            }
        });

        // create mesh list
        const meshesEl = this.el.querySelector("ul.meshes");
        this.meshes.forEach(mesh => mesh.createUI(meshesEl));

        // add restore default handler
        const defaultButtonEl = this.el.querySelector("button.action");
        defaultButtonEl.addEventListener("click", e => {
            e.preventDefault();
            confirmDialog(
                `Really DELETE ALL CHANGES and reset ${this.name} pass to default?`,
                "Cancel", null,
                defaultButtonEl.innerHTML, () => {
                    this.reset(this.defaultTemplate);
                    this.resetUI();
                }
            );
        });
    }

    addAttrib(size, key) {
        key = key.trim();

        // basic error checking
        if (!Number.isInteger(size) ||
            size < 1 ||
            size > 4 ||
            key.length < 3 ||
            this.layout.find(i => (i.key === key))
            ) {
            console.log("Did not create new attribute.", size, key);
            return false;
        }

        const attrib = new VertexAttrib({size:size, key:key, index:this.layout.legnth});
        this.layout.push(attrib);
        // create list ui for new attrib in layout ul
        attrib.createUI(this.el.querySelector("section.layout > ul"));

        this.el.dispatchEvent(Project.makeChangeEvent("passAddAttrib"));

        return true;
    }

}
