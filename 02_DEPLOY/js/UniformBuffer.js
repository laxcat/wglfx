import * as ui from "./util-ui.js"

export default class UniformBuffer {
    gl = null;
    el = null;
    size = 1024;
    glBuffer = null;
    buffer = null;

    constructor(gl, obj) {
        this.gl = gl;
        this.fromObject(obj);
    }

    fromObject(obj) {
        if (!obj) {
            return;
        }

        if (obj.size !== undefined) {
            this.size = obj.size;
        }

        this.buffer = new Uint8Array(this.size);

        this.glBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.glBuffer);
        this.gl.bufferData(this.gl.UNIFORM_BUFFER, this.buffer, this.gl.DYNAMIC_DRAW);
        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, null);
        this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, 0, this.glBuffer);
    }

    destroy() {
        this.gl.bindBuffer(gl.UNIFORM_BUFFER, null);
        this.gl.deleteBuffer(this.glBuffer);
    }

    createUI(parentEl) {
        this.el = parentEl.appendHTML(
            `
            <section id="uniform-buffer">
                <label class="collapsible">Uniform Buffer</label>
                <section>Size: ${this.size}</section>
            </section>
            `
        );
    }

    toObject() {
        return {
            size: this.size,
        };
    }

    toString() {
        return JSON.stringify(this.toObject());
    }
}
