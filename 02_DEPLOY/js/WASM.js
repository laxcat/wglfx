import * as util from "./util.js"

export default class WASM {
    memory = null;
    heap = null;
    view = null;
    instance = null;
    exports = null;
    ready = false;
    onReady = null;

    get fns() { return this.instance.exports; }

    // SPECIAL MEMORY BLOCK CONFIG
    // inform wasm runtime code of string buffer and heap limits
    // mirror these values in wasm.h
    static MEM_SPECIAL_S = 0x00010;
    static MEM_SPECIAL_E = 0x00040;
    // Reserved memory locations (4/12)
    static MEM_SPECIAL_STR_S   = WASM.MEM_SPECIAL_S+0x00;
    static MEM_SPECIAL_STR_E   = WASM.MEM_SPECIAL_S+0x04;
    static MEM_SPECIAL_HEAP_S  = WASM.MEM_SPECIAL_S+0x08;
    static MEM_SPECIAL_HEAP_E  = WASM.MEM_SPECIAL_S+0x0c;

    static defaultMemory = {
        initial: 4,
        maximum: 4,
    };

    static defaultImports = t => {
        return {
            env: {
                memory: t.memory,
                print_val: val => console.log(val, `(0x${val.toString(16)})`),
                print_str: t.logCStr.bind(t),
                print_err: t.logCStr.bind(t),
            }
        };
    };

    // TODO: research wasm-ld memory layout more; def makeing some assumtions here!
    // !! These values are dynamically sent into the wasm runtime !!
    // MEM LAYOUT info
    // string circular buffer, for converting arbitrary strings js <-> wasm
    get memStrBufS() { return 0x00400; }
    get memStrBufE() { return 0x10000; }
    // heap bounds. based on WebAssembly.Memory size, technically dynamic
    get memHeapS() { return 0x30000; }
    get memHeapE() { return this.memory.buffer.byteLength; }

    constructor(path, memory={}, imports={}) {
        // it's possible to pass in a pre-initialized memory object
        if (imports?.env?.memory !== undefined &&
            imports?.env?.memory instanceof "WebAssembly.Memory") {
            // ...if so, assign directly
            this.memory = imports.env.memory;
        }
        // create memory
        else {
            // it's possible for memory config to be a single number of pages
            // this has the effect of creating a non-resizable memory space of memory*64*1024 bytes
            if (typeof memory === "number") {
                memory = {
                    initial: memory,
                    maximum: memory,
                };
            }
            // deep merge imports with defaultImports (passed imports take precedence)
            memory  = Object.assign (WASM.defaultMemory, memory);
            // setup memory objects. javascript provides memory buffer to wasm.
            this.memory = new WebAssembly.Memory(memory);
        }
        // convenience memory access
        this.heap = new Uint8Array(this.memory.buffer);
        this.view = new DataView(this.memory.buffer);

        // deep merge imports with defaultImports (passed imports take precedence)
        imports = util.mergeDeep(WASM.defaultImports(this), imports);
        // stream-load and auto initiate WASM module
        WebAssembly.instantiateStreaming(fetch(path), imports).then(obj => {
            this.instance = obj.instance;
            this.ready = true;

            // do some special memory configuration
            // special memory locations configured by wasm.h.
            this.view.setUint32(WASM.MEM_SPECIAL_STR_S , this.memStrBufS, true);
            this.view.setUint32(WASM.MEM_SPECIAL_STR_E , this.memStrBufE, true);
            this.view.setUint32(WASM.MEM_SPECIAL_HEAP_S, this.memHeapS  , true);
            this.view.setUint32(WASM.MEM_SPECIAL_HEAP_E, this.memHeapE  , true);

            this.afterReady();
            if (this.onReady) this.onReady();
        });
    }

    afterReady() {}

    setBytesAt(ptr, buffer) {
        (new Uint8Array(this.memory.buffer, ptr, buffer.length)).set(buffer);
    }

    // returns VIEW
    bytesAt(ptr, size) {
        return new Uint8Array(this.memory);
    }

    // returns COPY
    copyBytesAt(ptr, size) {
        const buffer = new Uint8Array(this.dataSize);
        buffer.set(this.bytesAt(ptr, size));
        return buffer;
    }

    getUint32At(ptr) { return this.view.getUint32(ptr, true); }
    setUint32At(ptr, value) { this.view.setUint32(ptr, value, true); }

    encodeCStr(str) {
        if (!this.ready) {
            throw `exports not ready`;
        }
        const size = str.length;
        const ptr = this.fns.request_str_ptr(size);
        const bytes = new Uint8Array(this.memory.buffer, ptr, size);
        const {read, written} = (new TextEncoder()).encodeInto(str, bytes);
        return [ptr, written];
    };

    encodeCStrInto(str, ptr) {
        if (!this.ready) {
            throw `exports not ready`;
        }
        const size = str.length;
        const bytes = new Uint8Array(this.memory.buffer, ptr, size);
        const {read, written} = (new TextEncoder()).encodeInto(str, bytes);
        return [ptr, written];
    };

    decodeCStr(ptr, size) {
        if (size === undefined) {
            console.log("WARNING: Automatically scanning for string size in decodeCStr...");
            const strToEndOfBuffer = new Uint8Array(this.memory.buffer, ptr);
            size = 0;
            let end = strToEndOfBuffer.length;
            while(size < end && strToEndOfBuffer[size] !== 0) {
                ++size;
            }
            if (size === end) {
                console.log(`term-byte not found! size (${size}) extends to end of buffer!`);
            }
            else {
                console.log(`term-byte found; size set: ${size}`);
            }
        }
        const bytes = new Uint8Array(this.memory.buffer, ptr, size);
        return (new TextDecoder()).decode(bytes);
    };

    logCStr(ptr, size) {
        console.log(this.decodeCStr(ptr, size));
    }
}
