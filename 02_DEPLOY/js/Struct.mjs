/*
 A collection of TypedArrays designed to structure WebAssembly memory.
 A javascript mirror of a C struct.

 Sample usage:

 Given WASM C:
    typedef struct {
        float pos[3];
        uint8_t * ptr;
        uint32_t size;
        data uint8_t[256];
    } Info;

    // export
    Info * getInfo() {
        Info * bi = (Info *)malloc(sizeof(Info));
        ...
        return bi;
    }

 JS:
    const info = new Struct({
        pos:    {type:Float32Array, offset:0, size:3},
        ptr:    {type:Uint32Array, offset:12, size:1},
        size:   {type:Uint32Array, offset:16, size:1},
        data:   {type:Uint8Array, offset:20, size:256},
    });
    info.setPtr(memory.buffer, wasm.getInfo());

    // info would now be a live, structured view into wasm memory, also
    // modifiable from wasm runtime.
    info.pos.set([4.5, 6.7]);
    info.pos[2] = 8.9;
    console.log(info); // {pos:[4.5, 6.7, 8.9], ...

    // Proxy set to bypass subscript[0] for size=1 properties
    info.ptr = 0x10000;
*/

export default class Struct {
    #layout = null;

    constructor(layout, buffer, offset=0) {
        if (layout.hasOwnProperty("setPtr")) {
            throw `Struct can't use reserved property "setPtr".`;
        }

        // store the layout, allowing to set pointer later
        this.#layout = layout;

        // set pointer now if we can
        if (buffer) {
            this.setPtr(buffer, offset);
        }

        // Proxy
        return new Proxy(this, {
            // with one exeption (setPtr), all "get" properties passed through to layout's view
            get(target, prop, reciever) {
                // if property is our one Struct function, bind appropriately and return
                if (prop === "setPtr") {
                    return target.setPtr.bind(target);
                }
                // if property is in layout, pass through to that
                else if (layout.hasOwnProperty(prop)) {
                    // ptr not set yet!
                    if (layout[prop].view === undefined) {
                        throw TypeError(`Struct property ${prop} accessed (get) before pointer set.`);
                    }
                    // special case for size=1 properties
                    if (layout[prop].size === 1) {
                        return layout[prop].view[0];
                    }
                    // view will be some sort of TypedArray
                    return layout[prop].view;
                }
                throw new TypeError(`Struct property ${prop} not found.`);
            },
            // all "set" properties are diverted to layout's coresponding view
            set(obj, prop, value) {
                if (layout.hasOwnProperty(prop)) {
                    // ptr not set yet!
                    if (layout[prop].view === undefined) {
                        throw TypeError(`Struct property ${prop} accessed (set) before pointer set.`);
                    }
                    // the only time we actualy set a property is if it's a size=1 special case
                    if (layout[prop].size === 1) {
                        layout[prop].view[0] = value;
                        return true;
                    }
                    // we never set property in usual case of a TypedArray; use set(), [], etc instead.
                    throw TypeError(`Struct property ${prop} can't be set. Access with set(), [], etc.`);
                }
                throw TypeError(`Struct property ${prop} not found in layout.`);
            }
        });
    }

    setPtr(buffer, offset=0) {
        // allow TypeArrays and DataViews, which might have an additional offset
        if (ArrayBuffer.isView(buffer)) {
            offset = buffer.byteOffset + offset;
            buffer = buffer.buffer;
        }
        if (!(buffer instanceof ArrayBuffer)) {
            throw `Unexpected type`;
        }
        for (let [key, val] of Object.entries(this.#layout)) {
            val.view = new val.type(buffer, offset + val.offset, val.size);
        };
    }
}
