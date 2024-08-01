import * as ui from "./util-ui.js"

/*
NOTES:
 • component type is always float32
*/

export default class VertexAttrib {
    gl = null;          // webgl contex object
    index = 0;          // vertex attribute index
    size = 4;           // number of compoenents
    name = "";          // friendly name to indicate nature of data. pos, norm, color, etc.
    glBuffer = null;    // when VertexLayout assigned to a pass, buffers get stored here
    data = null;        // when VertexLayout assigned to a pass, keep copy of buffer data here
    uiDirty = false;      // ui data has changed, has not been set to local/gpu yet
    editor = null;      // ace editor, replaces dataEl

    constructor(gl, obj=null, ignoreData=false) {
        this.gl = gl;
        if (obj) {
            this.fromObject(obj, ignoreData);
        }
    }

    fromObject(obj, ignoreData=false) {
        this.index = obj.index;
        this.size = obj.size;
        this.name = obj.name;

        this.deleteBuffer();
        this.data = null;
        if (obj.data && ignoreData === false) {
            console.log("type of attrib data", typeof obj.data);
            if (typeof obj.data === "string") {
                this.createBufferFromArrayBuffer(obj.data.base64ToArrayBuffer());
            }
            else {
                this.createBufferFromArrayBuffer(obj.data.buffer);
            }
        }
    }

    createBuffer(nVerts) {
        const emptyData = new Float32Array(nVerts * this.size);
        this.createBufferFromArrayBuffer(emptyData.buffer);
    }

    createBufferFromArrayBuffer(arrayBuffer) {
        if (this.glBuffer || this.data) {
            throw `Unexpected call to createBuffer. Buffer already created.\n`+
                  `${this.glBuffer}\n`+
                  `${this.data}\n`;
        }
        this.glBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.glBuffer);
        this.data = new Float32Array(arrayBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.data, this.gl.STATIC_DRAW);
        this.gl.vertexAttribPointer(this.index, this.size, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.index);
    }

    deleteBuffer() {
        // if (!this.glBuffer || !this.data) {
        //     throw `Unexpected call to deleteBuffer. Buffer not created.\n`+
        //           `${this.glBuffer}\n`+
        //           `${this.data}\n`;
        // }
        this.gl.disableVertexAttribArray(this.index);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        this.gl.deleteBuffer(this.glBuffer);
        this.glBuffer = null;
        this.data = null;
    }

    setData(data, offset=0) {
        // update this.data
        const n = Math.min(data.length, this.data.length);
        for (let i = offset; i < n; ++i) {
            this.data[i] = data[i];
        }
        // update ui from this.data
        this.updateUIFromData();
        // upload this.data to gpu
        this.uploadData();
    }

    uploadData() {
        console.log(`Uploading vertex attrib ${this.name} local data to GPU.`);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.glBuffer);
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.data);
    }

    get dataStr() {
        let str = "";
        let rowIndex = 0;
        let maxLen = 0;
        let hasNeg = "";
        this.data.forEach(item => {
            const len = item.toString().length;
            if (maxLen < len) {
                maxLen = len;
            }
            if (item < 0) hasNeg = " ";
        });
        maxLen = (maxLen === 1) ? 0 : maxLen - 2;
        if (maxLen > 3) maxLen = 3;
        // console.log("max len in ", this.name, maxLen, hasNeg.length);
        this.data.forEach(item => {
            str += `${item<0?"":hasNeg}${item.toFixed(maxLen)}  `;
            ++rowIndex;
            if (rowIndex === this.size) {
                str += "\n";
                rowIndex = 0;
            }
        });
        return str;
    }

    updateDataFromUI() {
        // BAIL IF NO CHANGES MADE!
        if (!this.uiDirty) {
            return;
        }
        // strings, might have extra empty element at end, or other junk
        const uiDataStr = this.editor.getValue().split(/[\s]+/);
        // take only valid floats
        let uiData = [];
        uiDataStr.forEach(item => {
            const f = parseFloat(item);
            if (!isNaN(f)) {
                uiData.push(f);
            }
        })
        console.log(`Updating vertex attrib ${this.name} data from UI:\n` +
                    `UI has ${uiData.length} elements. (Data buffer has ${this.data.length})`
        );
        // don't go beyond bound of this.data or uiData. we don't care which is bigger.
        const n = Math.min(uiData.length, this.data.length);
        // copy whatever data we can from ui to this.data
        for (let i = 0; i < n; ++i) {
            this.data[i] = uiData[i];
        }
        // upload ALL of this.data to gpu (even parts not changed by uiData)
        this.uploadData();
        // set the data string again, to fix formatting, etc
        this.updateUIFromData();
        // this house is clean
        this.uiDirty = false;
    }

    updateUIFromData() {
        if (!this.editor) {
            return;
        }
        const row = this.editor.session.selection.cursor.row;
        const col = this.editor.session.selection.cursor.column;
        this.editor.setValue(this.dataStr);
        this.editor.clearSelection();
        this.editor.moveCursorTo(row, col);
    }

    createListUI(parentEl) {
        parentEl.appendHTML(
            // li set to white-space:pre, so string can't contain new lines
            `<li>`+
            `${this.index}: `+
            `${this.name}, `.padEnd(13)+
            `${this.size} float components, `+
            `${(this.size * 4).toString().padStart(2)} bytes`+
            `</li>`
        );
    }

    createDataUI(parentEl) {
        const dataEl = parentEl.appendHTML(
            `<li>
                <div>${this.name}</div>
                <pre>${this.dataStr}</pre>
            </li>`
        );
        this.editor = ui.aceit(dataEl.querySelector("pre"), "ace/mode/text");
        this.editor.addEventListener("change", e => {
            this.uiDirty = true;
        })
    }

    toObject() {
        const obj = {
            index: this.index,
            size: this.size,
            name: this.name
        };
        if (this.data) {
            obj.data = this.data.buffer.toBase64String();

            // console.log("this.data", this.data);
            // console.log("decoded data", new Float32Array(obj.data.base64ToArrayBuffer()));

            // let arr = new Uint8Array(this.data.buffer);
            // console.log("arr", arr);
            // let str = "";
            // arr.forEach(byte => str += String.fromCodePoint(byte));
            // // let str = (new TextDecoder('utf8')).decode(arr.buffer);
            // console.log("str", str, str.length);
            // // console.log("str 1", str, str.length);
            // // str = unescape(encodeURIComponent(str));
            // // console.log("str 2", str, str.length);
            // obj.data = window.btoa(str);

            // console.log("base64 str", obj.data);

            // str = window.atob(obj.data);
            // arr = str.split("");
            // console.log("arr of string bytes", arr);
            // arr = arr.map(byteStr => byteStr.codePointAt(0));
            // console.log("arr of bytes", arr);
            // arr = new Uint8Array(arr);
            // console.log("Uint8Array", arr);
            // arr = new Float32Array(arr.buffer);
            // // arr = str.split("").map(c => c.charCodeAt(0));
            // // console.log("decoded arr", arr);
            // // const data = new Float32Array((new Uint8Array(arr)).buffer);
            // console.log("data", this.data);
            // // console.log("data str", obj.data);
            // console.log("encoded/decoded data", arr);
        }



        return obj;
    }

    toString() {
        return JSON.stringify(this.toObject());
    }
}
