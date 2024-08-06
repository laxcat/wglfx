import * as ui from "./util-ui.js"

class Slot {
    // ubo = null;
    index = 0;
    name = "";
    offset = 0;
    size = 1;
    values = [0.0];
    slotEl = null;

    updateFromUI = {};

    constructor(ubo, i, slotEl, obj) {
        this.index = i;
        this.name = obj.name;
        this.offset = obj.offset;
        this.size = obj.size;
        this.values = obj.values;
        this.slotEl = slotEl;

        this.slotEl.appendHTML(
            `
            <td><input type="text" class="name" value="${this.name}"></td>
            <td>
                <input
                    type="number"
                    class="offset"
                    step="4"
                    min="0"
                    max="${ubo.size - this.values.length * 4}"
                    value="${this.offset}"
                >
            </td>
            <td>
                <select class="size">
                    <option  value="1"${this.size== 1?" selected":""}>float</option>
                    <option  value="2"${this.size== 2?" selected":""}>vec2</option>
                    <option  value="3"${this.size== 3?" selected":""}>vec3</option>
                    <option  value="4"${this.size== 4?" selected":""}>vec4</option>
                    <option value="12"${this.size==12?" selected":""}>mat3</option>
                    <option value="16"${this.size==16?" selected":""}>mat4</option>
                </select>
            </td>
            `
        );
        let valueInputs = "";
        this.values.forEach(value => {
            valueInputs += `<input type="text" value="${value}" class="value">`;
        });
        this.slotEl.appendHTML(`<td>${valueInputs}</td>`);

        const nameEl   = slotEl.querySelector("input.name");
        const offsetEl = slotEl.querySelector("input.offset");
        const selectEl = slotEl.querySelector("select");
        const valueEls = slotEl.querySelectorAll("input.value");

        this.updateFromUI = {
            name: () => {
                this.name = nameEl.value.trim();
            },

            offset: () => {
                const newOffset = parseInt(offsetEl.value);

                if (newOffset > parseInt(offsetEl.max)) {
                    offsetEl.value = offsetEl.max;
                }
                if (newOffset < parseInt(offsetEl.min)) {
                    offsetEl.value = offsetEl.min;
                }

                // set all data at prev offset to 0
                this.values.forEach((val, i) => ubo.setFloatAtOffset(this.offset + i * 4, 0));
                // update our data object
                this.offset = newOffset;
                // set all data for new offset
                this.values.forEach((val, i) => ubo.setFloatAtOffset(newOffset + i * 4, val));
            },

            select: () => {

            },

            values: this.values.map((_, vi) => () => {
                this.values[vi] = parseFloat(valueEls[vi].value);
                ubo.setFloatAtOffset(this.offset + vi * 4, this.values[vi]);
            }),
        };

        // name event listener
        nameEl.addEventListener("change", e => this.updateFromUI.name());

        // offset event listener (updates whole value when changed)
        offsetEl.addEventListener("change", e => this.updateFromUI.offset());

        // size event listener (changes number of floats in slot (float, vec2, vec3, vec4, etc))
        selectEl.addEventListener("change", e => this.updateFromUI.select());

        // values event listeners
        valueEls.forEach((el, vi) =>
            el.addEventListener("change", e => this.updateFromUI.values[vi]())
        );
    }

    updateSlotFromUI() {
        this.updateFromUI.name();
        this.updateFromUI.offset();
        this.updateFromUI.select();
        this.updateFromUI.values.forEach(fn => fn());
    }

    toObject() {
        return {
            name: this.name,
            offset: this.offset,
            size: this.size,
            values: this.values
        };
    }
}

export default class UniformBuffer {
    gl = null;
    el = null;
    name = null;
    size = 0;
    slots = [];
    data = null;
    dataView = null;
    glBuffer = null;

    #dirtyFirstByte = 0;
    #dirtyLastByte  = 0;

    static default = {
        name: "Block",
        size: 1024,
        slots: [
            {name: "time", offset: 0, size: 1, values: [0.5]},
        ],
    };

    constructor(gl, obj) {
        this.gl = gl;
        this.fromObject(obj);
    }

    fromObject(obj) {
        if (!obj) {
            return;
        }

        this.name = obj.name;
        this.size = obj.size;
        this.slots = obj.slots;

        this.data = new ArrayBuffer(this.size);
        this.dataView = new DataView(this.data);

        this.glBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.glBuffer);
        this.gl.bufferData(this.gl.UNIFORM_BUFFER, this.data, this.gl.DYNAMIC_DRAW);
        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, null);
        this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, 0, this.glBuffer);

        this.setAllData();
    }

    destroy() {
        this.gl.bindBuffer(gl.UNIFORM_BUFFER, null);
        this.gl.deleteBuffer(this.glBuffer);
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

        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.glBuffer);
        this.gl.bufferSubData(
            this.gl.UNIFORM_BUFFER,
            this.#dirtyFirstByte,
            new DataView(this.data, this.#dirtyFirstByte, this.dirtyByteLength),
        );
        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, null);

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
            this.slots[si] = new Slot(this, si, slotEl, this.slots[si]);
        }
    }

    toObject() {
        return {
            name: this.name,
            size: this.size,
            slots: this.slots.map(slot => slot.toObject()),
        };
    }

    toString() {
        return JSON.stringify(this.toObject());
    }
}
