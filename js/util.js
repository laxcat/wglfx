export function loadFileSync(path) {
    let request = new XMLHttpRequest();
    request.open("GET", path, false);
    request.send();
    if (request.status == 200) {
        return request.responseText;
    }
    return null;
}

export function checkError(gl) {
    const err = gl.getError();
    switch(err) {
    case gl.INVALID_ENUM:                   throw "INVALID_ENUM";
    case gl.INVALID_VALUE:                  throw "INVALID_VALUE";
    case gl.INVALID_OPERATION:              throw "INVALID_OPERATION";
    case gl.INVALID_FRAMEBUFFER_OPERATION:  throw "INVALID_FRAMEBUFFER_OPERATION";
    case gl.OUT_OF_MEMORY:                  throw "OUT_OF_MEMORY";
    case gl.CONTEXT_LOST_WEBGL:             throw "CONTEXT_LOST_WEBGL";
    default: return;
    }
}

export function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function last(arrayLike) {
    return arrayLike[arrayLike.length - 1];
}
