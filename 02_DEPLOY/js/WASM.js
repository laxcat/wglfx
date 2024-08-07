WebAssembly.Memory.prototype.encodeCStr = function (str) {
    const size = str.length;
    const ptr = wasm.request_str_ptr(size);
    (new TextEncoder()).encodeInto(str, new Uint8Array(this.buffer, ptr, size));
    return [ptr, size];
};

WebAssembly.Memory.prototype.decodeCStr = function (ptr, size) {
    return (new TextDecoder()).decode(new Uint8Array(this.buffer, ptr, size));
};

export default class WASM {
    memory = null;
    heap = null;
    wasm = null;
    ready = false;

    constructor(path) {
        this.memory = new WebAssembly.Memory({ initial: 2, maximum: 2 })
        this.heap = new Uint8Array(memory.buffer);

        const logCStr = (ptr, size) => {
            console.log(memory.decodeCStr(ptr, size));
        };

        const imports = {
            env: {
                memory: memory,
                print_val: console.log,
                print_str: logCStr,
                print_err: logCStr,
            }
        };

        WebAssembly.instantiateStreaming(fetch(path), imports).then(obj => {
            wasm = obj.instance.exports;
            wasm.test();
            const caps = str => {
                const [ptr, size] = memory.encodeCStr(str);
                wasm.caps(ptr);
                return memory.decodeCStr(ptr, size);
            }
            console.log("from js", caps("fart"));
            console.log("heap at", ptr, heap.slice(ptr, ptr+8));
            // console.log("caps", memory.decodeCStr(wasm.caps()));

            this.ready = true;
        });

    }

}
