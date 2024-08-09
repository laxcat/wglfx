import WASM from "./WASM.js"

export default class WASMZ85 extends WASM {

    test = null;
    encode = null;
    // decode = null;

    constructor() {
        super("./wasm/z85.wasm");
    }

    afterReady() {
        super.afterReady();

        const [ptr, size] = this.encodeCStr("fart");
        console.log("ptr", ptr);
        console.log("str", this.decodeCStr(ptr));

        this.test = this.fns.test;

        this.encode = buffer => {
            if (buffer.length > 0xcb50) { // TODO: make this dynamic
                console.log("buffer too big");
                return "";
            }
            const offset = 0x30000;

            const memView = new Uint8Array(this.memory.buffer, offset, buffer.length);
            memView.set(buffer);

            const ptr = this.fns.Z85_encode(offset, buffer.length);

            // decodeCStr(ptr);
        }

        // this.decode = str => {

        // }
    }
}
