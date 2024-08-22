import "./html-extension.mjs"
import { is } from "./util.mjs"

/*
    SVG helper class

    SVG.get() is main interface. Mostly designed for icons for now.

    // Example:
    // Caches the built-in reload svg synbol def into body.svg, then wraps a the
    // refernce in an svg tag, with standardized classes to style path strokes
    // and fills
    const buttonEl = `<button>${SVG.get("reload")}</button>`

    // buttonEl is now:
    <button><svg class="icon reload" version="2.0"><use href="#svg-reload"></use></svg></button>

    // and also, when called for the first time...
    <body>
    <svg class="hidden"><defs>
        <!-- ...symbol cached once here for whole document -->
        <symbol id="svg-reload" ...></symbol>
    </defs></svg>
    ...
    </body>

*/
export default class SVG {
    static #instance = null;
    static get instance() {
        return SVG.#instance ?? (SVG.#instance = new SVG());
    }

    #svgEl;
    get svgEl() {
        if (!this.#svgEl) {
            this.#svgEl = document.body.prependHTML(
                `<svg class="hidden" version="2.0"><defs></defs></svg>`
            );
        }
        return this.#svgEl;
    }

    #defsEl;
    get defsEl() {
        if (!this.#defsEl) {
            this.#defsEl = this.svgEl.querySelector("defs");
        }
        return this.#defsEl;
    }

    static get(key, w, h) {
        if (h === undefined) {
            h = w;
        }
        const cache = this.instance.#getCached(key, w, h);
        if (cache) return cache;

        // TODO: search and return from external JSON database here?

        // ...for now here are some basic built-in icons
        switch(key) {

        // edit
        case "edit": {
            const ww = w ?? 100;
            const hh = h ?? 100;
            const p = 10;
            const i = 27;
            return this.instance.#add(key, w, h,
                `
                <symbol viewbox="0 0 ${ww} ${hh}">
                    <path
                        class="stroke"
                        d="
                            m   ${p}        ${hh-p}
                            L   ${p+i}      ${hh-p}
                                ${ww-p}     ${p+i}
                                ${ww-p-i}   ${p}
                                ${p}        ${hh-p-i}
                            z
                        "
                    />
                </symbol>

                `
            );
        }

        // refresh, reload
        case "refresh":
        case "reload": {
            return this.instance.#add(key, w, h,
                `
                <symbol viewbox="0 -10 100 110">
                    <path
                        class="stroke"
                        d="m 20 80 A 40 40 0 1 0 20 20"
                        fill="none"
                        stroke-width="10"
                    />
                    <path class="fill" d="M 10 0 v 40 h 40" />
                </symbol>

                `
            );
        }
        }
    }

    #getCached(key, w, h) {
        const symbolEl = this.defsEl.querySelector("#svg-"+key);
        if (symbolEl) {
            const wh = (w && h) ? `width="${w}" height="${h}"` : "";
            return  `<svg ${wh} class="icon ${key}" version="2.0">`+
                    `<use href="#svg-${key}" />`+
                    `</svg>`;
        }
        return undefined;
    }

    #add(key, w, h, symbolStr) {
        const symbolEl = this.defsEl.appendHTML(symbolStr);
        symbolEl.setAttribute("id", "svg-"+key);
        return this.#getCached(key, w, h);
    }
}
