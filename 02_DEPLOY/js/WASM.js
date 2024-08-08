import * as util from "./util.js"

export default class WASM {
    memory = null;
    heap = null;
    instance = null;
    exports = null;
    ready = false;
    onReady = null;

    get fns() { return this.instance.exports; }

    static defaultMemory = {
        initial: 4,
        maximum: 4,
    };

    static defaultImports = t => {
        return {
            env: {
                memory: t.memory,
                print_val: console.log,
                print_str: t.logCStr.bind(t),
                print_err: t.logCStr.bind(t),
            }
        };
    };

    constructor(path, memory={}, imports={}) {
        // it's possible to pass in a pre-initialized memory object
        if (imports?.env?.memory !== undefined &&
            imports?.env?.memory instanceof "WebAssembly.Memory") {
            // ...if so, assign directly
            this.memory = imports.env.memory;
        }
        // create memory
        else {
            // deep merge imports with defaultImports (passed imports take precedence)
            memory  = Object.assign (WASM.defaultMemory, memory);
            // setup memory objects. javascript provides memory buffer to wasm.
            this.memory = new WebAssembly.Memory(memory);
        }
        // convenience memory access
        this.heap = new Uint8Array(this.memory.buffer);

        // deep merge imports with defaultImports (passed imports take precedence)
        imports = util.mergeDeep(WASM.defaultImports(this), imports);
        // stream-load and auto initiate WASM module
        WebAssembly.instantiateStreaming(fetch(path), imports).then(obj => {
            this.instance = obj.instance;
            this.ready = true;
            this.afterReady();
            if (this.onReady) this.onReady();
        });
    }

    afterReady() {
        console.log(this.instance)
    }

    encodeCStr(str) {
        if (!this.ready) {
            throw `exports not ready`;
        }
        const size = str.length;
        const ptr = this.fns.request_str_ptr(size);
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
