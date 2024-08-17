import App from "./App.mjs"
import Serializable from "./Serializable.mjs"
import UBOSlot from "./UBOSlot.mjs"
import * as ui from "./util-ui.mjs"

/*
    Uniform Buffer Object, and related data and operations.
*/
export default class UniformBuffer extends Serializable {
    static serialProps = {
        name: undefined,    // name of the UBO. should match the uniform block name in shader
        size: undefined,    // size of buffer in bytes
        slots: [UBOSlot],   // array of UBOSlot
    };

    data = null;        // our data buffer, which mirrors what's on the gpu
    dataView = null;    // maintain a data view into the whole buffer why not
    el = null;          // the ui element attached to the base of this class
    glBuffer = null;    // the webgl obect for the uniform buffer

    // dirty bytes have been set in buffer, but not uploaded to webgl
    // one dirty range maintained, to upload everything inbetween for simplicity
    #dirtyFirstByte = 0xffffffff;
    #dirtyLastByte  = 0;

    // default setup
    static templates = [{
        name: "Block",
        size: 1024,
        slots: [
            {name: "time", offset: 0, size: 1, values: [0.5]},
        ],
        default: true,
    }];

    constructor(serialObj) {
        super(serialObj);

        this.data = new ArrayBuffer(this.size);
        this.dataView = new DataView(this.data);

        const gl = App.gl;
        this.glBuffer = gl.createBuffer();
        gl.bindBuffer(gl.UNIFORM_BUFFER, this.glBuffer);
        gl.bufferData(gl.UNIFORM_BUFFER, this.data, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.UNIFORM_BUFFER, null);
        gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, this.glBuffer);

        this.setAllData();
    }

    destroy() {
        App.gl.bindBuffer(App.gl.UNIFORM_BUFFER, null);
        App.gl.deleteBuffer(this.glBuffer);
    }

    get dirty() {
        return (this.#dirtyLastByte > 0);
    }

    get dirtyByteLength() {
        return (this.#dirtyLastByte - this.#dirtyFirstByte);
    }

    setFloatAtOffset(offset, value) {
        this.dataView.setFloat32(offset, value, true);
        if (this.#dirtyFirstByte > offset) {
            this.#dirtyFirstByte = offset;
        }
        if (this.#dirtyLastByte < offset + 4) {
            this.#dirtyLastByte = offset + 4;
        }
    }

    setAllData() {
        this.slots.forEach((slot, si) =>
            slot.values.forEach((value, vi) =>
                this.setFloatAtOffset(slot.offset + vi * 4, value)
            )
        );
    }

    getFloatAtOffset(offset, valueIndex=0) {
        return this.dataView.getFloat32(offset + valueIndex * 4, true);
    }

    update() {
        if (!this.dirty) {
            return;
        }

        console.log(`updating UBO, dirty:${this.#dirtyFirstByte}–${this.#dirtyLastByte}`);

        const gl = App.gl;

        gl.bindBuffer(gl.UNIFORM_BUFFER, this.glBuffer);
        gl.bufferSubData(
            gl.UNIFORM_BUFFER,
            this.#dirtyFirstByte,
            new DataView(this.data, this.#dirtyFirstByte, this.dirtyByteLength),
        );
        gl.bindBuffer(gl.UNIFORM_BUFFER, null);

        this.#dirtyFirstByte = this.size;
        this.#dirtyLastByte  = 0;
    }

    updateDataFromUI() {
        this.slots.forEach(slot => slot.updateSlotFromUI());
    }

    createUI(parentEl) {
        this.el = parentEl.appendHTML(
            `
            <section id="uniform-buffer">
                <label class="collapsible">Uniform Buffer</label>
                <section>
                    <label>Name</label><div>${this.name}</div>
                    <label>Size</label><div>${this.size}</div>
                    <label>Vars</label>
                    <table>
                        <tbody>
                        <tr>
                            <td>Name</td>
                            <td>Offset</td>
                            <td>Size</td>
                            <td>Value</td>
                        </tr>
                        </tbody>
                    </table>
                </section>
            </section>
            `
        );
        const tbodyEl = this.el.querySelector("table > tbody");
        const slotCount = this.slots.length;
        for (let si = 0; si < slotCount; ++si) {
            const slotEl = tbodyEl.appendHTML(`<tr></tr>`);
            this.slots[si].createUI(slotEl, this);
        }
    }
}
