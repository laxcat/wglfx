import WASM from "./WASM.js"

export default class WASMZ85 extends WASM {

    test = null;
    // encode = null;
    // decode = null;

    constructor() {
        super("./wasm/z85.wasm");
    }

    afterReady() {
        super.afterReady();

        this.fns.init();

        console.log("heap", this.heap.slice(0x20000, 0x20020));

        this.test = this.fns.test;

        // this.encode = buffer => {
        //     // request encoding buffer location
        //     const offset = 0;

        //     // copy buffer into wasm buffer

        //     // encoded size is knowable
        //     const size = buffer.length * 5 / 4;

        //     // allocate output string
        //     const ptr = this.fns.Z85_encode(offset, size);

        //     // free or handle string
        // }

        // this.decode = str => {

        // }
    }
}
