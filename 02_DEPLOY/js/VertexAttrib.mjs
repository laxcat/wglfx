import App from "./App.mjs"
import DataUI from "./common/DataUI.mjs"
import Project from "./Project.mjs"
import Serializable from "./common/Serializable.mjs"
import SVG from "./common/SVG.mjs"
import { isNum, getSet } from "./common/util.mjs"


/*
    Vertex attrib information for each attrib in VertexLayout.
    Does not hold attrib data (see VertexAttribData).
*/
export default class VertexAttrib extends Serializable {
    static initProps = {
        index: undefined,   // vertex attribute index
        key: undefined,     // key to indicate nature of data. pos, norm, color, etc.
                            // key should match key in mesh attrib data
        size: undefined,    // number of compoenents
    };

    static templates = [
        {key:"", size:3},
    ];

    // binds data structure to this on createUI
    dataUI;
    static dataUI = {
        html: `
            <tr>
                <td><!-- index --></td>
                <td><!-- key   --></td>
                <td><!-- size  --></td>
                <td class="noDrag">
                    <button>${SVG.get("edit")}</button>
                    <button>🚫</button>
                    <button>×</button>
                    <button>✓</button>
                </td>
            </tr>`,
        bind: {
            index: {el:els=>els[0].children[0]},
            key:   {el:els=>els[0].children[1], pattern:"[a-z]{3,12}", editable:true},
            size:  {el:els=>els[0].children[2], limit:[1,4], editable:true, getStrKey:"sizeRowStr"},
        },
        control: {
            editStart:  els=>els[0].children[3].children[0],
            removeSelf: els=>els[0].children[3].children[1],
            editCancel: els=>els[0].children[3].children[2],
            editSubmit: els=>els[0].children[3].children[3],
        },
        callback: {
            onChange: "onChangeData",
        }
    };

    set index(value) {
        const i = parseInt(value);
        if (!isNum(i)) {
            throw new TypeError(`${value} not a valid index (${i}).`);
        }
        this._index = i;
        if (this.el) {
            this.el.dataset.index = i;
            this.el.children[0].innerHTML = i;
        }
    }
    get index() { return this._index; }

    get sizeStr() { return (this.size === 1) ? "float" : `vec${this.size}` }

    get sizeRowStr() { return `${this.sizeStr} (${this.size * 4} bytes)`; }

    get el() { return this.dataUI?.el; }

    onChangeData(key) {
        this.el?.dispatchEvent(Project.makeChangeEvent(`pass.layout[${this.index}].${key}`));
    }

    // createUI(parentEl) {
    //     return DataUI.bind(this, parentEl);
    //     // this.el = parentEl.appendHTML(dataUI.html);
    // }

    // createUI_old(parentEl) {
    //     this.el = parentEl.appendHTML(
    //         `
    //         <tr>
    //             <td></td>
    //             <td></td>
    //             <td></td>
    //             <td class="noDrag">
    //                 <button>${SVG.get("edit")}</button>
    //                 <button>🚫</button>
    //                 <button>×</button>
    //                 <button>✓</button>
    //             </td>
    //         </tr>
    //         `
    //     );
    //     const buttonEl = (el,i)=>el.children[3].children[i];
    //     const formConfig = makeRowForm(this.el, [
    //         // key
    //         {
    //             slot: el=>el.children[1],
    //             prop: getSet(this, "key"),
    //             pattern: "[a-z]{3,12}",
    //             unique: true,
    //         },
    //         // size
    //         {
    //             slot: el=>el.children[2],
    //             prop: getSet(this, "size", "sizeRowStr"),
    //             limit: [1,4],
    //         },
    //     ], {
    //         rows: ()=>parentEl.children,
    //         unique: true,
    //         onChanged: (el,changed)=>{
    //             el.dispatchEvent(Project.makeChangeEvent("passLayout"));
    //         },
    //         showFormEl: el=>buttonEl(el,0),
    //         removeEl:   el=>buttonEl(el,1),
    //         cancelEl:   el=>buttonEl(el,2),
    //         submitEl:   el=>buttonEl(el,3),
    //     });

    //     buttonEl(this.el,1).addEventListener("click", e=>{
    //         if (formConfig.onRemove) formConfig.onRemove(this.el);
    //         // console.log("delete me!!!!");
    //     });

    //     return formConfig;
    // }
}
