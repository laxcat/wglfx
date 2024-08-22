import Serializable from "./common/Serializable.mjs"

import App from "./App.mjs"
import Shader from "./Shader.mjs"

/*
    Shader Program, with editable UI.
    Handles vert and frag shaders, shader compiling/linking.
    Tightly bound with Shader, which handles the src and UI for both shaders.

    TODO:
    • apply new "template" system of defaults
*/
export default class ShaderProgram extends Serializable {
    static initProps = {
        vert: Shader,   // instance of Shader
        frag: Shader,   // instance of Shader
    };
    glObj = null;       // the webgl program object
    el = null;

    static templates = [
        // send template keys to children for lookup on Shader
        { vert: "vert", frag: "frag" },
        { key: "blank", vert: "blank", frag: "blank" },
    ];

    get compiled() { return !!this.glObj; }

    destroy() {
        App.gl.deleteProgram(this.glObj);
        this.glObj = null;
        this.vert.destroy();
        this.frag.destroy();
        this.vert.clearErrors();
        this.frag.clearErrors();
    }

    compile(uboBlockName=null) {
        console.log(`program compile, UBO Block Name:"${uboBlockName}"`);

        const gl = App.gl;

        gl.deleteProgram(this.glObj);
        this.glObj = null;
        this.vert.clearErrors();
        this.frag.clearErrors();

        this.vert.compile();
        this.frag.compile();
        this.link();

        if (!this.glObj) {
            this.vert.showErrors();
            this.frag.showErrors();
            return false;
        }

        gl.useProgram(this.glObj);
        console.log(`Shader glObj compiled/linked successfully.`);

        if (uboBlockName) {
            const uboBlockIndex = gl.getUniformBlockIndex(this.glObj, uboBlockName);
            // when index not found, returning 0xffffffff (or -1?),
            // but i couldn't find documentation for it
            if (uboBlockIndex !== 0xffffffff) {
                gl.uniformBlockBinding(this.glObj, uboBlockIndex, 0);
                console.log(`Attaching uniform block "${uboBlockName}" to UBO index 0.`);
            }
        }

        return true;
    }

    link() {
        if (!this.vert.glObj || !this.frag.glObj) {
            console.log(`Will not attempt to link shader program. Missing shader.`);
            return null;
        }

        const gl = App.gl;

        this.glObj = gl.createProgram();

        gl.attachShader(this.glObj, this.vert.glObj);
        gl.attachShader(this.glObj, this.frag.glObj);

        gl.linkProgram(this.glObj);

        gl.detachShader(this.glObj, this.vert.glObj);
        gl.detachShader(this.glObj, this.frag.glObj);

        this.vert.destroy();
        this.frag.destroy();

        if (!gl.getProgramParameter(this.glObj, gl.LINK_STATUS)) {
            const info = gl.getProgramInfoLog(this.glObj);
            console.log(`Error linking shader program. \n${info}`);
            gl.deleteProgram(this.glObj);
            this.glObj = null;
        }
    }

    createUI(parentEl) {
        this.el = parentEl.appendHTML(
            `
            <section id="program">
                <label class="collapsible">Program</label>
                <ul></ul>
            </section>
            `
        );
        const ul = this.el.children[1];
        this.vert.createUI(ul);
        this.frag.createUI(ul);
    }
}
