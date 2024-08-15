/*
    WebGL2RenderingContext extension

    Add context creation, helpers for errors, and WebGL shortcut export.
*/

// Export a shortcut name for this bad-boy
const WebGL2 = WebGL2RenderingContext;
export default WebGL2;

// TODO: make these read-only
// error array populated with most recent call to getErrors
WebGL2.prototype.errors = [];
// will indicate if error array is populated; updated by getErrors
WebGL2.prototype.hasErrors = false;

// creates WebGL2RenderingContext instance
WebGL2.create = function(canvasElOrQuery) {
    // find canvas
    let canvas = (c => {
        // if falsy find first canvas in document
        if (!c) {
            return document.getElementsByTagName("canvas")[0];
        }
        // we already have a canvas
        if (c instanceof HTMLCanvasElement) {
            return c;
        }
        // query document if string
        if (typeof c == "string") {
            return document.querySelector(c);
        }
        throw   `Error creating WebGL2RenderingContext context. Could not find canvas.`+
                `canvasElOrQuery: ${c}\n`;
    })(canvasElOrQuery);

    // setup context
    let gl = null;
    if (canvas instanceof HTMLCanvasElement) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl = canvas.getContext("webgl2");
    }
    if (!gl) {
        throw   `Error creating WebGL2RenderingContext context.\n`+
                `canvasElOrQuery: ${canvasElOrQuery}\n`+
                `canvas: ${canvas}\n`;
    }
    // check errors just to make sure
    gl.logErrors();
    return gl;
}

WebGL2.prototype.throwErrors = function() {
    const errs = this.getErrors();
    errs.forEach(err => { throw err; });
}

WebGL2.prototype.logErrors = function(msg) {
    const errs = this.getErrors();
    if (errs.length) {
        console.log(`%c`+
            `${msg} errors found in ${this}:\n`+
            `\t${Error().stack.replaceAll("\n", "\n\t")}\n\n`+
            `\t${errs.join("\n\t")}`,
            "color:red;"
        );
    }
    return errs;
}

// run getError until exhausted and populate errors array
WebGL2.prototype.getErrors = function() {
    this.errors = [];
    let err;
    while ((err = this.getError())) {
        switch(err) {
        case this.INVALID_ENUM:                   this.errors.push("INVALID_ENUM");
        case this.INVALID_VALUE:                  this.errors.push("INVALID_VALUE");
        case this.INVALID_OPERATION:              this.errors.push("INVALID_OPERATION");
        case this.INVALID_FRAMEBUFFER_OPERATION:  this.errors.push("INVALID_FRAMEBUFFER_OPERATION");
        case this.OUT_OF_MEMORY:                  this.errors.push("OUT_OF_MEMORY");
        case this.CONTEXT_LOST_WEBGL:             this.errors.push("CONTEXT_LOST_WEBGL");
        default: {};
        }
    }
    this.hasErrors = (this.errors.length > 0);
    return this.errors;
}

WebGL2.prototype.framebufferStatusString = function() {
    const status = this.checkFramebufferStatus(this.FRAMEBUFFER);
    switch(status) {
    case this.FRAMEBUFFER_COMPLETE:                         return "FRAMEBUFFER_COMPLETE";
    case this.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:            return "FRAMEBUFFER_INCOMPLETE_ATTACHMENT";
    case this.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:    return "FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT";
    case this.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:            return "FRAMEBUFFER_INCOMPLETE_DIMENSIONS";
    case this.FRAMEBUFFER_UNSUPPORTED:                      return "FRAMEBUFFER_UNSUPPORTED";
    case this.FRAMEBUFFER_INCOMPLETE_MULTISAMPLE:           return "FRAMEBUFFER_INCOMPLETE_MULTISAMPLE";
    default:                                                return "FRAMEBUFFER_UNKNOWN_STATUS";
    }
    return status;
}
