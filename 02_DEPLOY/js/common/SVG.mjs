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
            this.#svgEl = document.body.insertHTML(
                `<svg class="hidden" version="2.0"><defs></defs></svg>`,
                {position:"afterbegin"}
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
        const symbolStr = ((w, h) => {
            const innerStr = (() => {
                switch(key) {
                        
                // edit icon
                case "edit": 
                    const p = 10;
                    const i = 27;
                    return `
                    <path class="stroke"
                        d="
                            m   ${p}        ${h-p}
                            L   ${p+i}      ${h-p}
                                ${w-p}      ${p+i}
                                ${w-p-i}    ${p}
                                ${p}        ${h-p-i}
                            z
                        "
                    />`;

                // refresh/reload icon
                case "refresh":
                case "reload":
                    return `
                    <path class="stroke"
                        d="m ${w*.2} ${h*.8} A ${w*.4} ${h*.4} 0 1 0 ${w*.2} ${h*.2}"
                    />
                    <path class="fill" d="m ${w*.1} 0 v ${h*.4} h ${w*.4}" />
                    `;
                }
            })();
            return (innerStr) ?
                `<symbol viewbox="0 0 ${w} ${h}">${innerStr}</symbol>` :
                "";
        })(w ?? 100, h ?? 100);

        return (symbolStr) ? this.instance.#add(key, w, h, symbolStr) : "";
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
        const symbolEl = this.defsEl.insertHTML(symbolStr);
        symbolEl.setAttribute("id", "svg-"+key);
        return this.#getCached(key, w, h);
    }
}
