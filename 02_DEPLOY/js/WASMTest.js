import WASM from "./WASM.js"

export default class WASMTest extends WASM {

    // convenience references to underlying exports (wasm functions)
    test = null;
    caps = null;

    constructor() {
        super("./wasm/test.wasm");
    }

    afterReady() {
        super.afterReady();

        // simple fn that takes no args, returns number. doesn't really need
        // any convenience code wrapping, but still nice to be consistent
        this.test = this.exports.test;

        // anything that deals with strings requires a bit of work before/after,
        // so this becomes much more noticeably convenient.
        this.caps = str => {
            const [ptr, size] = this.encodeCStr(str);
            this.exports.caps(ptr);
            return this.decodeCStr(ptr, size);
        }
    }
}
