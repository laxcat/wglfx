import Time from "/Time.js"
import Renderer from "/Renderer.js"
import * as util from "/util.js"

export default class App {
    renderer = null; // delay initialization
    time = new Time();

    constructor() {
        const vertEditor = ace.edit("vertEditor");
        vertEditor.setTheme("ace/theme/solarized_dark");
        vertEditor.session.setMode("ace/mode/glsl");
        const fragEditor = ace.edit("fragEditor");
        fragEditor.setTheme("ace/theme/solarized_dark");
        fragEditor.session.setMode("ace/mode/glsl");

        this.loadShader("/vert.glsl", vertEditor);
        this.loadShader("/frag.glsl", fragEditor);

        this.renderer = new Renderer(vertEditor, fragEditor);

        window.addEventListener("keydown", (e) => {
            if (e.shiftKey || e.altKey) {
                return;
            }
            // cmd+s, save/recompile
            else if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
                this.save();
                e.preventDefault();
            }
            // cmd+e, toggle ui
            else if (e.key === "e" && (e.metaKey || e.ctrlkey)) {
                this.toggleUI();
                e.preventDefault();
            }
        });

        // start
        this.loop(0);
    }

    get uiShowing() {
        return (document.getElementById("ui").classList.contains("hidden") === false);
    }

    toggleUI() {
        document.getElementById("ui").classList.toggle("hidden");
    }

    toggleRun() {
        this.time.isRunning = !this.time.isRunning;
        this.time.printStatus();
    }

    loop(eventTime) {
        // time
        this.time.update(eventTime);

        // advance sim
        this.tick();

        // draw
        this.renderer.draw();

        // next loop
        requestAnimationFrame(this.loop.bind(this));
    }

    tick() {
        if (!this.time.isRunning) {
            return;
        }
        // console.log("global", this.time.global, this.time.dt);
        // console.log("now", this.time.now);
    }

    loadShader(path, editor) {
        editor.setValue(util.loadFileSync(path), -1);
    }

    save() {
        this.renderer.compile();
        // todo save to cookie
    }
}
