import Project from "./Project.mjs"
import Serializable from "./common/Serializable.mjs"

export default class UBOSlot extends Serializable {
    static initProps = {
        name: undefined,
        offset: undefined,
        size: undefined,
        values: [Number],
    };

    updateFromUI = {};

    createUI(parentEl, ubo) {
        parentEl.insertHTML(
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
        parentEl.insertHTML(`<td>${valueInputs}</td>`);

        const nameEl   = parentEl.querySelector("input.name");
        const offsetEl = parentEl.querySelector("input.offset");
        const selectEl = parentEl.querySelector("select");
        const valueEls = parentEl.querySelectorAll("input.value");

        const dispatchChange = () => {
            parentEl.dispatchEvent(Project.makeChangeEvent("ubo"));
        };

        this.updateFromUI = {
            name: () => {
                this.name = nameEl.value.trim();
                dispatchChange();
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
                this.values.forEach((val, index) => ubo.setFloatAtOffset(this.offset + index * 4, 0));
                // update our data object
                this.offset = newOffset;
                // set all data for new offset
                this.values.forEach((val, index) => ubo.setFloatAtOffset(newOffset + index * 4, val));

                dispatchChange();
            },

            select: () => {
                dispatchChange();
            },

            values: this.values.map((_, vi) => () => {
                this.values[vi] = parseFloat(valueEls[vi].value);
                ubo.setFloatAtOffset(this.offset + vi * 4, this.values[vi]);
                dispatchChange();
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
}
