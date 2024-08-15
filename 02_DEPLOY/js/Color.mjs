/*
    Color data, with convenient operations.
    Holds color data as 4 32bit floats, for covenient uploading to WebGL.
    The set() variadic method handles most types of color information
    (hex string, rgba numbers, etc).
    Use setFrom*() methods to be more explicit with input, specifically
    setting from an integer, which is too ambiguous in set().
    See to*() methods for color output.
*/
export default class Color {
    data = new Float32Array([0, 0, 0, 1])

    constructor(...args) {
        this.set(...args);
    }

    set(...args) {
        // new Color();
        if (args.length === 0 || !args[0]) {
            // do nothing, default already set in member init above
        }

        // new Color(floatArray.buffer)
        else if (args.length === 1 && args[0] instanceof ArrayBuffer) {
            this.data = new Float32Array(args[0]);
        }

        // new Color("ff0000");
        // new Color("ff0000ff");
        // new Color("#ff0000");
        // new Color("#ff0000ff");
        else if (args.length === 1 && typeof args[0] === "string") {
            let str = args[0].trim().replaceAll("#", "");
            if (str.length === 6) {
                this.setFromRGBInt(parseInt(str, 16));
            }
            else if (str.length === 8) {
                this.setFromRGBAInt(parseInt(str, 16));
            }
        }

        // new Color(0xff0000); // ERROR. 0xff0000ff or 0xff0000 ? too ambiguous.
        else if (args.length === 1 && typeof args[0] === "number") {
            throw `Don't initialize color with integer. Use hex string.`;
        }

        // new Color([0, 1, 0, 1]);
        else if (args.length === 1 && args[0] instanceof Array) {
            this.setFromFloatArray(args[0]);
        }

        // new Color({r:0, g:1, b:0, a:1});
        else if (args.length === 1 && args[0] instanceof Object) {
            this.setFromFloatObj(args[0]);
        }

        // new Color(0, 1, 0, 1);
        else if (args.length === 4) {
            this.setFromFloatArray(args);
        }
    }

    setFromRGBInt(i) {
        this.setFromRGBAInt((i << 8) | 0xff);
    }

    setFromRGBAInt(i) {
        this.data[0] = ((i >> 24) & 0xff) / 255.0;
        this.data[1] = ((i >> 16) & 0xff) / 255.0;
        this.data[2] = ((i >>  8) & 0xff) / 255.0;
        this.data[3] = ((i >>  0) & 0xff) / 255.0;
    }

    setFromNumbers(r, g, b, a=1) {
        this.data[0] = r;
        this.data[1] = g;
        this.data[2] = b;
        this.data[3] = a;
    }

    setFromFloatArray(rgba) {
        if (rgba.length > 0) this.data[0] = rgba[0];
        if (rgba.length > 1) this.data[1] = rgba[1];
        if (rgba.length > 2) this.data[2] = rgba[2];
        if (rgba.length > 3) this.data[3] = rgba[3];
    }

    setFromFloatObj(obj) {
        if (obj.r !== undefined) this.data[0] = obj.r;
        if (obj.g !== undefined) this.data[1] = obj.g;
        if (obj.b !== undefined) this.data[2] = obj.b;
        if (obj.a !== undefined) this.data[3] = obj.a;
    }

    toRGBStr() {
        return Math.round(this.data[0] * 255.0).toString(16).padStart(2, "0")+
               Math.round(this.data[1] * 255.0).toString(16).padStart(2, "0")+
               Math.round(this.data[2] * 255.0).toString(16).padStart(2, "0");
    }

    toRGBAStr() {
        return  this.toRGBStr()+
                Math.round(this.data[3] * 255.0).toString(16).padStart(2, "0");
    }

    toCSSStr() {
        return `#${this.toRGBStr()}`;
    }
}
