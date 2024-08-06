import * as ui from "./util-ui.js"

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

        this.setAllValues();
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

    setSlotValue(slotIndex, valueIndex, value) {
        const slot = this.slots[slotIndex];
        slot.values[valueIndex] = value;
        this.setFloatAtOffset(slot.offset + valueIndex * 4, value);
    }

    resetSlotValues(slotIndex) {
        const nValues = this.slots[slotIndex].values.length;
        for (let vi = 0; vi < nValues; ++vi) {
            this.setSlotValue(slotIndex, vi, 0);
        }
    }

    setAllValues() {
        const nSlots = this.slots.length;
        for (let si = 0; si < nSlots; ++si) {
            const nValues = this.slots[si].values.length;
            for (let vi = 0; vi < nValues; ++vi) {
                this.setSlotValue(si, vi, this.slots[si].values[vi]);
            }
        }
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
        const nSlots = this.slots.length;
        const rows = this.el.getElementsByTagName("tr");
        for (let i = 0; i < nSlots; ++i) {
            const valueEls = rows[i+1].querySelectorAll("input.value");
            this.updateSlotFromUI(i, valueEls);
        }
    }

    updateSlotFromUI(slotIndex, valueEls) {
        const slot = this.slots[slotIndex];
        for (let i = 0; i < slot.size; ++i) {
            this.setSlotValue(slotIndex, i, parseFloat(valueEls[i].value));
        }
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
        for (let slotIndex = 0; slotIndex < slotCount; ++slotIndex) {
            const slotEl = tbodyEl.appendHTML(`<tr></tr>`);
            this.#fillSlotUI(slotIndex, slotEl);
        }
    }

    #fillSlotUI(slotIndex, slotEl=null) {
        if (!slotEl && !(slotEl = this.#getTableRowEl(slotIndex))) {
            return;
        }

        const slot = this.slots[slotIndex];

        let valueInputs = "";
        for (let valueIndex = 0; valueIndex < slot.size; ++valueIndex) {
            valueInputs +=
                `<input
                type="text"
                class="value"
                value="${this.getFloatAtOffset(slot.offset, valueIndex)}"
                >`;
        }

        slotEl.appendHTML(
            `
            <td><input type="text" class="name" value="${slot.name}"></td>
            <td>
                <input
                    type="number"
                    class="offset"
                    step="4"
                    min="0"
                    max="${this.size - slot.values.length * 4}"
                    value="${slot.offset}"
                >
            </td>
            <td>
                <select class="size">
                    <option  value="1"${slot.size== 1?" selected":""}>float</option>
                    <option  value="2"${slot.size== 2?" selected":""}>vec2</option>
                    <option  value="3"${slot.size== 3?" selected":""}>vec3</option>
                    <option  value="4"${slot.size== 4?" selected":""}>vec4</option>
                    <option value="12"${slot.size==12?" selected":""}>mat3</option>
                    <option value="16"${slot.size==16?" selected":""}>mat4</option>
                </select>
            </td>
            <td>${valueInputs}</td>
            `
        );

        const nameEl   = slotEl.querySelector("input.name");
        const offsetEl = slotEl.querySelector("input.offset");
        const selectEl = slotEl.querySelector("select");
        const valueEls = slotEl.querySelectorAll("input.value");

        // name event listener
        nameEl.addEventListener("change", e => {
            slot.name = nameEl.value.trim();
        });

        // offset event listener (updates whole value when changed)
        offsetEl.addEventListener("change", e => {
            if (parseInt(offsetEl.value) > parseInt(offsetEl.max)) {
                offsetEl.value = offsetEl.max;
            }
            if (parseInt(offsetEl.value) < parseInt(offsetEl.min)) {
                offsetEl.value = offsetEl.min;
            }
            if (offsetEl.value === offsetEl.dataset.prevValue) {
                return;
            }

            this.resetSlotValues(slotIndex);
            slot.offset = parseInt(offsetEl.value);
            this.updateSlotFromUI(slotIndex, valueEls);

            offsetEl.dataset.prevValue = offsetEl.value;
        });
        offsetEl.dataset.prevValue = offsetEl.value;

        // size event listener (changes number of floats in slot (float, vec2, vec3, vec4, etc))
        selectEl.addEventListener("change", e => {

        });

        // values event listeners
        for (let valueIndex = 0; valueIndex < slot.size; ++valueIndex) {
            const valueEl = valueEls[valueIndex];
            valueEl.addEventListener("change", e => {
                this.setSlotValue(slotIndex, valueIndex, parseFloat(valueEl.value));
            });
        }
    }

    #resetSlotUI(slotIndex, slotEl=null) {
        if (!slotEl && !(slotEl = this.#getTableRowEl(slotIndex))) {
            return;
        }
        slotEl.innerHTML = "";
        this.#fillSlotUI(slotIndex, slotEl);
        ui.parse(slotEl);
    }

    #getTableRowEl(slotIndex) {
         // slotIndex+1 to ignore table header row
        return this.el.getElementsByTagName("tr")[slotIndex + 1];
    }

    toObject() {
        return {
            name: this.name,
            size: this.size,
            slots: this.slots,
        };
    }

    toString() {
        return JSON.stringify(this.toObject());
    }
}
