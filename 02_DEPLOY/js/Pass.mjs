import Serializable from "./common/Serializable.mjs"
import DataUI from "./common/DataUI.mjs"
import Color from "./common/Color.mjs"
import {
    parse as uiParse,
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

class Temp {
    dataUI;
    static dataUI = {
        html: `
            <tr>
                <td><!-- key   --></td>
            </tr>`,
        bind: {
            key:   {el:trEl=>trEl.children[0]},
        },
        control: {
        },
    };
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

                    <!--<button class="action">Reset Pass To Default</button>-->
                </div>
            </li>
            `,
        bind: {
            name: { el: els=>els[0].children[0] },
            layout: {
                el: els=>els[0].querySelector("table.layout tbody"),
                type: [VertexAttrib],
                reorderable: true,
                addControl: els=>els[0].querySelector("table.layout+button"),
            },
        },
        control: {
            // reset: liEl=>liEl.querySelector("button.action"),
        },
        callback: {
            onChange: "onChangeData",
            onReorder: "onReorderData",
            onRemoveChild: "onRemoveChildData",
        }
    };

    get el() { return this.dataUI?.el; }

    onChangeData(key) {
        // console.log("onChangeData", key);
        if (key !== "layout") {
            this.el.dispatchEvent(Project.makeChangeEvent("pass."+key));
        }
    }

    onReorderData(key, oldIndex, newIndex) {
        // console.log("onChangeData", key);
        this.el.dispatchEvent(Project.makeChangeEvent(`pass.${key}[${oldIndex}→${newIndex}]`));
    }

    onRemoveChildData(key, index) {
        // console.log("onChangeData", key);
        this.el.dispatchEvent(Project.makeChangeEvent(`pass.${key}[${index}] removed`));
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
        DataUI.bind(this, parentEl);

        // add clear color handler
        const colorEl = this.el.querySelector(`input.color`);
        colorEl.value = "#"+this.clearColor.toRGBAStr();
        colorEl.addEventListener("input", e => {
            this.clearColor.set(colorEl.value);
            this.el.dispatchEvent(Project.makeChangeEvent("passClearColor"));
        });
        Coloris({
            forceAlpha: true,
        });
        Coloris.wrap(colorEl);
        Coloris(colorEl);

        // create mesh list
        const meshesEl = this.el.querySelector("ul.meshes");
        this.meshes.forEach(mesh => mesh.createUI(meshesEl));

        // // add restore default handler
        // const defaultButtonEl = this.el.querySelector("button.action");
        // defaultButtonEl.addEventListener("click", e => {
        //     e.preventDefault();
        //     confirmDialog(
        //         `Really DELETE ALL CHANGES and reset ${this.name} pass to default?`,
        //         "Cancel", null,
        //         defaultButtonEl.innerHTML, () => {
        //             this.reset(this.defaultTemplate);
        //             // this.resetUI();
        //         }
        //     );
        // });
    }
}
