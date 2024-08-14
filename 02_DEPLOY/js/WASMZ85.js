import WASM from "./WASM.js"
import Struct from "./Struct.js"

/*
    Z85 encoder/decoder
    Currently has a data size limitation based on available memory, which is
    configuable in constructor.

    TODO:
    • chunk encoding/decoding, which would remove any size limit
*/
class InitInfo extends Struct {
    constructor(buffer, ptr) {
        super({
            decodedDataSizeMax: {type:Uint32Array, offset: 0, size:1},
            encodedDataSizeMax: {type:Uint32Array, offset: 4, size:1},
            decodedDataPtr:     {type:Uint32Array, offset: 8, size:1},
            encodedDataPtr:     {type:Uint32Array, offset:12, size:1},
            dataSizePtr:        {type:Uint32Array, offset:16, size:1},
        }, buffer, ptr);
    }
}

export default class WASMZ85 extends WASM {
    info = null;

    get dataSize() { return this.getUint32At(this.info.dataSizePtr); };
    set dataSize(size) { this.setUint32At(this.info.dataSizePtr, size); };

    get paddedDataSize() { return this.fns.Z85_getPaddedDataSize(); }
    get encodedDataSize() { return this.paddedDataSize * 5 / 4; }

    // 0-58252 for minimum wasm size. more starts adding pages.
    // see WASM.js for more info about memory, min size, etc
    constructor(unencodedDataSizeLimit=58252) {
        // This could be simplified by using the entire "heap" for encoding/
        // decoding. right now we reserve a single data size varaible, but it
        // surely could be moved to special memory space (like the info struct).
        const totalDataSize = Math.ceil(unencodedDataSizeLimit / 4) * 9 + 4;
        const nPages = WASM.pagesForMinHeapSize(totalDataSize);
        super("./wasm/z85.wasm", nPages);
        this.addEventListener(WASM.READY, () => { this.#onReady(); })
    }

    #onReady() {
        const infoPtr = this.fns.Z85_init();
        this.info = new InitInfo(this.memory.buffer, infoPtr);
    }

    // fill un-encoded bytes at decodedDataPtr
    fillDecodedBytes(buffer) {
        if (buffer.byteLength > this.info.decodedDataSizeMax) {
            console.log(
                `Fill decoded bytes request (buffer.byteLength: ${buffer.byteLength}) `+
                `is too big for wasm module (decodedDataSizeMax: ${this.info.decodedDataSizeMax}).`
            );
            return "";
        }

        // set byte size to decodedDataSizePtr in buffer
        this.dataSize = buffer.byteLength;

        // set bytes to decodedDataPtr
        this.setBytesAt(this.info.decodedDataPtr, buffer);
    }

    // fill encoded bytes at encodedDataPtr from string
    // size is true data size, which might be less than padded size
    fillEncodedBytes(str, decodedSize) {
        if (str.length > this.info.encodedDataSizeMax) {
            console.log(
                `Fill encoded bytes request (string length: ${str.length}) `+
                `is too big for wasm module (encodedDataSizeMax: ${this.info.encodedDataSizeMax}).`
            );
            return "";

        }
        // empty string, write 0 to dataSize and bail
        else if (str.length === 0) {
            this.dataSize = 0;
            return;
        }
        // decodedSize might be known, and passed in. if not we can assume the algo (no padding)
        if (decodedSize === undefined) {
            decodedSize = str.length * 4 / 5;
        }
        // write data size to buffer
        this.dataSize = decodedSize;
        // write encoded bytes to buffer
        this.encodeStrInto(str, this.info.encodedDataPtr);
    }

    // encode bytes in buffer into z85 string, or
    // call without buffer to encode bytes already in decoded buffer
    encode(buffer) {
        this.throwIfNotReady();
        if (buffer !== undefined) {
            this.fillDecodedBytes(buffer);
        }
        return this.#encode();
    }

    // write string as data decoded buffer, then encode into z85 string
    encodeString(str) {
        this.dataSize = str.length;
        this.encodeStrInto(str, this.info.decodedDataPtr);
        return this.#encode();
    }

    // internal use only
    // encode dataSize bytes already filled at decodedDataPtr into z85 string
    #encode() {
        // if no bytes to encode...
        if (this.dataSize === 0 ||
            // ...or if encode fails
            !this.fns.Z85_encode()) {
            return "";
        }
        return this.decodeCStr(this.info.encodedDataPtr, this.encodedDataSize);
    }

    // decode z85 string to Uint8Array of bytes, either view or copy
    decode(str, decodedSize, copy=false) {
        this.throwIfNotReady();
        if (str !== undefined) {
            this.fillEncodedBytes(str, decodedSize);
        }
        return this.#decode(str, copy);
    }

    // decode z85 string to string, and trim end null bytes
    decodeToString(str) {
        this.encodeStrInto(str, this.info.encodedDataPtr);
        let size = str.length * 4 / 5;
        // set padded for now, to decode
        this.dataSize = size;
        // decode string bytes
        const arr = this.#decode(str, false);
        // return string with null bytes trimmed off the end
        return WASM.decodeCStrArr(arr, true);
    }

    // decode to TypedArray
    // Example:
    // decodeTo(Float32Array, "Q&n:*Xe]cDAxQV}");
    decodeTo(TypedArray, str, copy=false) {
        this.throwIfNotReady();
        if (str !== undefined) {
            this.fillEncodedBytes(str);
        }
        const arr = this.#decode(str, copy);
        return new TypedArray(arr.buffer, arr.byteOffset, arr.byteLength/TypedArray.BYTES_PER_ELEMENT);
    }

    // decode encodedDataSize
    #decode(str, copy) {
        if (!this.fns.Z85_decode()) {
            return null;
        }
        return (copy) ?
            this.copyBytesAt(this.info.decodedDataPtr, this.dataSize):
            this.bytesAt    (this.info.decodedDataPtr, this.dataSize);
    }

    test() {
        // buffer
        {
            console.group("Z85 TEST BUFFER");
            const bufIn = new Uint8Array([99]);
            console.log("input buffer", bufIn);
            const z85Str = this.encode(bufIn);
            console.log("z85 encoded:", z85Str);
            const bufOut = this.decode(z85Str, bufIn.byteLength);
            console.log("z85 decoded:", bufOut);
            if (bufIn[0] !== bufOut[0]) throw "test failed";
            console.groupEnd();
        }

        // string
        {
            console.group("Z85 TEST STRING");
            const strIn = "farts";
            console.log("input string", strIn);
            const z85Str = this.encodeString(strIn);
            console.log("z85 encoded:", z85Str);
            const strOut = this.decodeToString(z85Str);
            console.log("z85 decoded:", strOut);
            if (strIn !== strOut) throw "test failed";
            console.groupEnd();
        }

        // write arbitrary data
        {
            console.group("Z85 TEST ARBITRARY DATA");
            const valIn = 1234.5678;
            console.log("z85 encoded:", valIn);
            this.setFloat64At(this.info.decodedDataPtr, valIn);
            this.dataSize = 8;
            const z85Str = this.encode();
            console.log("z85 encoded:", z85Str);
            this.setFloat64At(this.info.decodedDataPtr, 0);
            const bufOut = this.decode(z85Str);
            console.log("z85 decoded:", bufOut);
            const valOut = this.getFloat64At(this.info.decodedDataPtr);
            console.log("z85 decoded:", valOut);
            if (valIn !== valOut) throw "test failed";
            console.groupEnd();
        }

        // write float buffer
        {
            console.group("Z85 TEST WRITE FLOAT BUFFER");
            const bufIn = new Float32Array([12.34, 56.78, 90.12]);
            console.log("input buffer", bufIn);
            const z85Str = this.encode(bufIn);
            console.log("z85 encoded:", z85Str);
            const bufOut = this.decodeTo(Float32Array, z85Str);
            console.log("z85 decoded:", bufOut);
            console.log("z85 decoded again:", this.decodeTo(Float32Array, "Q&n:*Xe]cDAxQV}"));
            let i = 0;
            let e = bufIn.length;
            while (i < e) {
                if (bufIn[i] != bufOut[i]) throw "test failed";
                ++i;
            }
            console.groupEnd();
        }

        // basic string access
        {
            console.group("Z85 TEST BASIC STRING ACCESS");
            const bufIn = new Uint8Array([0x61, 0x62, 0x63, 0x00]); // "abc"(\0)
            console.log("string array", bufIn)
            this.setBytesAt(this.info.decodedDataPtr, bufIn);
            // no size given, scans for null-byte
            const strA = this.decodeCStr(this.info.decodedDataPtr);
            console.log("string decoded:", strA);
            // convenience decoding function that skips memory buffer altogether (used under the hood)
            const strB = WASM.decodeCStrArr(bufIn, true);
            console.log("string decoded:", strB);
            if (strA !== strB || strA !== "abc") throw "test failed";
            console.groupEnd();
        }
    }
}
