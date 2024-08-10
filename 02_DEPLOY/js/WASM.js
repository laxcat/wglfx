import * as util from "./util.js"

export default class WASM extends EventTarget {
    // STATICS -------------------------------------------------------------- //

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

    // messages
    static MSG_NOT_READY = "wasm not ready!";
    // events
    static READY = "ready"

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

    // MEMBER VARS ---------------------------------------------------------- //

    memory = null;      // WebAssembly.Memory
    heap = null;        // Uint8Array view of entire memory ArrayBuffer
    view = null;        // DataView of entore memory ArrayBuffer

    // READY, after loaded and instantiated
    ready = false;      // wasm has been loaded and instantiated, wasm functions available
    fns = null;         // populated on module instantiation, object of wasm functions

    // GETTERS/ SETTERS ----------------------------------------------------- //

    // TODO: research wasm-ld memory layout more; def makeing some assumtions here!
    // !! These values are dynamically sent into the wasm runtime !!
    // MEM LAYOUT info
    // string circular buffer, for converting arbitrary strings js <-> wasm
    get memStrBufS() { return 0x00400; }
    get memStrBufE() { return 0x10000; }
    // NOTE STACK and "RODATA" SEEM TO GO IN THE 0x10000 range... NEEDS RESEARCH
    // heap bounds. based on WebAssembly.Memory size, technically dynamic
    get memHeapS() { return 0x20000; }
    get memHeapE() { return this.memory.buffer.byteLength; }

    // INIT ----------------------------------------------------------------- //

    constructor(path, memory={}, imports={}) {
        super();

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
            this.fns = obj.instance.exports;
            this.ready = true;

            // do some special memory configuration
            // special memory locations configured by wasm.h.
            this.view.setUint32(WASM.MEM_SPECIAL_STR_S , this.memStrBufS, true);
            this.view.setUint32(WASM.MEM_SPECIAL_STR_E , this.memStrBufE, true);
            this.view.setUint32(WASM.MEM_SPECIAL_HEAP_S, this.memHeapS  , true);
            this.view.setUint32(WASM.MEM_SPECIAL_HEAP_E, this.memHeapE  , true);

            this.dispatchEvent(new Event(WASM.READY));
        });
    }

    // ERROR CHECKING ------------------------------------------------------- //

    // throws if NOT ready!
    throwIfNotReady() { if (!this.ready) throw WASM.MSG_NOT_READY; }
    // returns true if NOT ready!
    warnIfNotReady() { if (!this.ready) console.log(WASM.MSG_NOT_READY); return !this.ready; }

    // MEMORY ACCESS, GENERIC ----------------------------------------------- //

    setBytesAt(ptr, buffer) {
        // accept some different buffer types
        // ArrayBuffer
        if (buffer instanceof ArrayBuffer) {
            buffer = new Uint8Array(buffer);
        }
        // DataView or TypedArray other than Uint8Array
        else if (ArrayBuffer.isView(buffer) && !(buffer instanceof Uint8Array)) {
            buffer = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        }
        // buffer should be a Uint8Array at this point
        (new Uint8Array(this.memory.buffer, ptr, buffer.byteLength)).set(buffer);
    }

    // returns VIEW
    bytesAt(ptr, size) {
        this.throwIfOutOfRange(ptr, size);
        return new Uint8Array(this.memory.buffer, ptr, size);
    }

    // returns COPY
    copyBytesAt(ptr, size) {
        const buffer = new Uint8Array(this.dataSize);
        buffer.set(this.bytesAt(ptr, size));
        return buffer;
    }

    // MEMORY ACCESS, INTS/FLOATS ------------------------------------------- //

    getUint32At(ptr) { return this.view.getUint32(ptr, true); }
    setUint32At(ptr, value) { this.view.setUint32(ptr, value, true); }

    getFloat32At(ptr) { return this.view.getFloat32(ptr, true); }
    setFloat32At(ptr, value) { this.view.setFloat32(ptr, value, true); }
    getFloat64At(ptr) { return this.view.getFloat64(ptr, true); }
    setFloat64At(ptr, value) { this.view.setFloat64(ptr, value, true); }

    // MEMORY ACCESS, STRING ------------------------------------------------ //

    // encode js-string to c-string in UTF-8 into memory buffer
    encodeCStr(str) {
        this.throwIfNotReady();
        const size = str.length;
        const ptr = this.fns.request_str_ptr(size);
        const bytes = this.bytesAt(ptr, size);
        const {read, written} = (new TextEncoder()).encodeInto(str, bytes);
        return [ptr, written];
    };

    // same as encodeCStr specifying specific memory location
    encodeCStrInto(str, ptr) {
        this.throwIfNotReady();
        const size = str.length;
        const bytes = this.bytesAt(ptr, size);
        const {read, written} = (new TextEncoder()).encodeInto(str, bytes);
        return [ptr, written];
    };

    // decode c-style UTF-8 string in memory into js-string.
    // if size not defined, c-style string rules will apply and will
    // automatically look for terminating null-byte for length.
    decodeCStr(ptr, size, trimNullBytes=false) {
        if (size === 0) {
            return "";
        }
        else if (size === undefined) {
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
        return WASM.decodeCStrArr(this.bytesAt(ptr, size), trimNullBytes);
    };

    // same as decodeCStr, but arr could be data from anywhere
    // arr is c-string in Uint8Array format, possibly with trailing null-byte(s)
    static decodeCStrArr(arr, trimNullBytes=false) {
        if (!(arr instanceof Uint8Array)) {
            throw `arr should be Uint8Array`;
        }
        else if (arr.length === 0) {
            return "";
        }
        if (trimNullBytes) {
            let size = arr.length;
            // reducing size to exclude trailing null bytes
            while (arr[size-1] === 0) {
                --size;
            }
            // make new smaller slice (be careful to not use TOO small a slice)
            arr = arr.subarray(0, size);
        }
        return (new TextDecoder()).decode(arr);
    }

    logCStr(ptr, size) {
        console.log(this.decodeCStr(ptr, size));
    }
}
