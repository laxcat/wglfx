import WASM from "./WASM.mjs"

/*
    Test case for WASM.mjs/wasm.h.
*/
export default class WASMTest extends WASM {

    // convenience references to underlying exports (wasm functions)
    test = null;
    caps = null;

    constructor() {
        super("./wasm/test.wasm");
        this.addEventListener(WASM.READY, () => { this.#onReady(); })
    }

    #onReady() {
        // setup convenience access here.
        // sometimes you can call wasm functions directly to be useful, but
        // usually they need a little wrapping code to handle strings and other
        // memory access issues.

        // simple fn that takes no args, returns number. easy to call directly.
        this.test = this.fns.test;

        // sending and recieving strings requires a little work before and after
        this.caps = str => {
            const {ptr, size} = this.encodeStr(str);
            this.fns.caps(ptr);
            return this.decodeCStr(ptr, size);
        }
    }
}
