import WASM from "./WASM.js"

export default class WASMZ85 extends WASM {
    // set once on init, so we cache
    decodedDataSizeMax = 0;
    encodedDataSizeMax = 0;
    decodedDataPtr     = 0;
    encodedDataPtr     = 0;
    dataSizePtr        = 0;

    get dataSize() { return this.getUint32At(this.dataSizePtr); };
    set dataSize(size) { this.setUint32At(this.dataSizePtr, size); };

    get paddedDataSize() { return this.fns.Z_85_getPaddedDataSize(); }
    get encodedDataSize() { return this.paddedDataSize * 5 / 4; }

    constructor() {
        super("./wasm/z85.wasm", 4);
    }

    afterReady() {
        super.afterReady();
        this.fns.Z85_init();
        // cache after getting set once on init
        this.cacheGlobals();
    }

    cacheGlobals() {
        this.decodedDataSizeMax =   this.fns.Z85_getDecodedDataSizeMax();
        this.encodedDataSizeMax =   this.fns.Z85_getEncodedDataSizeMax();
        this.decodedDataPtr =       this.fns.Z85_getDecodedDataPtr();
        this.encodedDataPtr =       this.fns.Z85_getEncodedDataPtr();
        this.dataSizePtr =          this.fns.Z85_getDataSizePtr();

        // console.log("this.decodedDataSizeMax",   this.decodedDataSizeMax);
        // console.log("this.encodedDataSizeMax",   this.encodedDataSizeMax);
        // console.log("this.decodedDataPtr",       this.decodedDataPtr);
        // console.log("this.encodedDataPtr",       this.encodedDataPtr);
        // console.log("this.dataSizePtr",          this.dataSizePtr);
    }

    // fill bytes at decodedDataPtr
    fillDecodedBytes(buffer) {
        if (buffer.length > this.decodedDataSizeMax) {
            console.log(
                `Fill decoded bytes request (buffer size: ${buffer.length}) `+
                `is too big for wasm module (decodedDataSizeMax: ${this.decodedDataSizeMax}).`
            );
            return "";
        }

        // set byte size to decodedDataSizePtr in buffer
        this.dataSize = buffer.length;

        // set bytes to decodedDataPtr
        this.setBytesAt(this.decodedDataPtr, buffer);
    }

    // fill bytes at encodedDataPtr from string
    // size is true data size, which might be less than padded size
    fillEncodedBytes(str, decodedSize) {
        if (str.length > this.encodedDataSizeMax) {
            console.log(
                `Fill encoded bytes request (string length: ${str.length}) `+
                `is too big for wasm module (encodedDataSizeMax: ${this.encodedDataSizeMax}).`
            );
            return "";

        }
        // decodedSize might be known, and passed in. if not we can assume the algo
        if (decodedSize === undefined) {
            decodedSize = str.length * 4 / 5;
        }
        // write data size to buffer
        this.dataSize = decodedSize;
        // write encoded bytes to buffer
        this.encodeCStrInto(str, this.encodedDataPtr);
    }

    // call without buffer to decode bytes already filled at decodedDataPtr
    encode(buffer) {
        if (!this.ready) {
            throw `z85 wasm not ready.`;
        }

        if (buffer !== undefined) {
            this.fillDecodedBytes(buffer);
        }

        if (!this.fns.Z85_encode()) {
            return "";
        }

        return this.decodeCStr(this.encodedDataPtr, this.encodedDataSize);
    }

    decode(str, decodedSize, copy=false) {
        if (!this.ready) {
            throw `z85 wasm not read.`;
        }

        if (str !== undefined) {
            this.fillEncodedBytes(str, decodedSize);
        }

        if (!this.fns.Z85_decode()) {
            return null;
        }

        if (copy)
            return this.copyBytesAt(this.decodedDataPtr, this.dataSize);
        else
            return this.bytesAt(this.decodedDataPtr, this.dataSize);
    }

    encodeString(str) {
        this.encodeCStrInto(str, this.decodedDataPtr);
        this.dataSize = str.length;
        if (!this.fns.Z85_encode()) {
            return "";
        }
        return this.decodeCStr(this.encodedDataPtr, this.encodedDataSize);
    }

    decodeToString(str) {
        this.encodeCStrInto(str, this.encodedDataPtr);
        let size = str.length * 4 / 5;
        // set padded for now, to decode
        this.dataSize = size;
        if (!this.fns.Z85_decode()) {
            return "";
        }
        // view padded decoded bytes
        const arr = this.bytesAt(this.decodedDataPtr, size);
        // reducing size to exclude trailing null bytes
        while (arr[size-1] === 0) {
            --size;
        }
        // true data size back into buffer for consistency
        this.dataSize = size;
        // return string that excludes padded bytes
        return this.decodeCStr(this.decodedDataPtr, size);
    }
}
