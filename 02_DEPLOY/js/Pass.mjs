import Serializable from "./common/Serializable.mjs"
import DataUI from "./common/DataUI.mjs"
import Color from "./common/Color.mjs"
import {
    parse as uiParse,
    makeReorderable,
    makeReorderableItem,
    confirmDialog
    } from "./common/util-ui.mjs"

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
    // el = null;

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


    dataUI;
    static dataUI = {
        html:
            `
            <li>
                <h3 class="collapsible"></h3>
                <div>
                    <label>Clear Color</label>
                    <input type="text" class="color" value="">

                    <label class="collapsible">Layout</label>
                    <table class="layout"><tbody></tbody></table>
                    <button>+</button>

                    <label class="collapsible">Meshes</label>
                    <ul class="meshes"></ul>

                    <button class="action">Reset Pass To Default</button>
                </div>
            </li>
            `,
        bind: {
            layout: {
                el: liEl=>liEl.querySelector("table.layout tbody"),
                type: [VertexAttrib],
                reorderable: true,
                add: liEl=>liEl.querySelector("table.layout+button"),
            },
        },
        control: {
            reset: liEl=>liEl.querySelector("button.action"),
        },
        onChange: "onChangeData",
    };

    get el() { return this.dataUI?.el; }

    onChangeData(key) {
        // console.log("onChangeData", key);
        this.el.dispatchEvent(Project.makeChangeEvent("pass"+key));
    }

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

        // this.el = parentEl.appendHTML(`<li></li>`);
    //     this.#fillUI();
    // }

    // // resetUI() {
    // //     // clear contents and listeners
    // //     this.el.innerHTML = "";
    // //     // refill and recreate listeners
    // //     this.#fillUI();
    // //     // add global listeners
    // //     uiParse(this.el);
    // // }

    // #fillUI() {


        // this.el = parentEl.appendHTML(
        //     `
        //     <li>
        //         <h3 class="collapsible">${this.name}</h3>
        //         <div>
        //             <label>Clear Color</label>
        //             <input type="text" class="color" value="#${this.clearColor.toRGBAStr()}">

        //             <label class="collapsible">Layout</label>
        //             <table class="layout"><tbody></tbody></table>
        //             <button>+</button>

        //             <label class="collapsible">Meshes</label>
        //             <ul class="meshes"></ul>

        //             <button class="action">Reset Pass To Default</button>
        //         </div>
        //     </li>
        //     `
        // );
        DataUI.bind(this, parentEl);

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
        // const layoutEl = this.el.querySelector("table.layout tbody");
        // const layoutFormConfigs = this.layout.map(attrib => attrib.createUI(layoutEl));
        // // make rows drag-and-drop reorderable
        // const reorderableConfig = makeReorderable(layoutEl, {
        //     onReorder: (oldIndex, newIndex) => {
        //         const oldAttrib = this.layout.splice(oldIndex, 1)[0];
        //         this.layout.splice(newIndex, 0, oldAttrib);
        //         this.layout.forEach((child, index) => child.index = index);
        //         this.el.dispatchEvent(Project.makeChangeEvent("layoutReorder"));
        //     }
        // });
        // const addButton = this.el.querySelector("table.layout+button");
        // addButton.addEventListener("click", e=>{
        //     const newAttrib = new VertexAttrib({index:this.layout.length,key:"",size:3})
        //     const addRowConfig = newAttrib.createUI(layoutEl);
        //     addRowConfig.showForm();
        //     addRowConfig.onCancel = row=>{
        //         addRowConfig.row.remove();
        //         addButton.classList.remove("hidden");
        //     };
        //     addRowConfig.onChange = row=>{
        //         makeReorderableItem(row, reorderableConfig);
        //         this.layout.push(newAttrib);
        //         this.el.dispatchEvent(Project.makeChangeEvent("passAddAttrib"));
        //         addButton.classList.remove("hidden");
        //     };
        //     addButton.classList.add("hidden");
        // });
        // layoutFormConfigs.forEach(config=>{
        //     config.onRemove = row=>{
        //         const index = row.elementIndex();
        //         const attrib = this.layout[index];
        //         confirmDialog(
        //             `Remove vertex attribute “${attrib.key}”?`,

        //             "Cancel",
        //             null,

        //             "Remove Attribute",
        //             () => {
        //                 this.layout.splice(index, 1);
        //                 row.remove();
        //                 this.layout.forEach((c,i)=>c.index=i);
        //                 this.el.dispatchEvent(Project.makeChangeEvent("passAddAttrib"));
        //             }
        //         );
        //     };
        // });

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
                    // this.resetUI();
                }
            );
        });
    }
}
