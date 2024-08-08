export default class WASM {
    memory = null;
    heap = null;
    exports = null;
    ready = false;
    onReady = null;

    constructor(path) {
        this.memory = new WebAssembly.Memory({ initial: 2, maximum: 2 })
        this.heap = new Uint8Array(this.memory.buffer);

        const imports = {
            env: {
                memory: this.memory,
                print_val: console.log,
                print_str: this.logCStr.bind(this),
                print_err: this.logCStr.bind(this),
            }
        };

        WebAssembly.instantiateStreaming(fetch(path), imports).then(obj => {
            this.exports = obj.instance.exports;
            this.ready = true;
            this.afterReady();
            if (this.onReady) this.onReady();
        });
    }

    afterReady() {
    }

    encodeCStr(str) {
        if (!this.ready) {
            throw `exports not ready`;
        }
        const size = str.length;
        const ptr = this.exports.request_str_ptr(size);
        const bytes = new Uint8Array(this.memory.buffer, ptr, size);
        (new TextEncoder()).encodeInto(str, bytes);
        return [ptr, size];
    };

    decodeCStr(ptr, size) {
        const bytes = new Uint8Array(this.memory.buffer, ptr, size);
        return (new TextDecoder()).decode(bytes);
    };

    logCStr(ptr, size) {
        console.log(this.decodeCStr(ptr, size));
    }
}
