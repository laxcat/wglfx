# WebGL Graphics Pipeline Toy
Simple tool to play directly with shader code. Supports a one-pass basic vert/frag shader setup, some simple mesh data, with some UBO variable capability. Very much still in progress.

[Live Version](https://tylermartin.net/gfxtoy)

Supports some keyboard shortcuts:

| Win | Mac | Function |
| --- | --- | --- |
| Ctrl+S | ⌘ S | Save current shader code and mesh data to [local storage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage). Will reload code and data on next page load. |
| Ctrl+E | ⌘ E | Toggle UI |

## WebAssembly + z85.wasm
This project includes a WebAssembly [Z85](https://rfc.zeromq.org/spec/32/) encoder/decoder based on the C code from the [Z85 reference spec](https://github.com/zeromq/rfc/blob/master/src/spec_32.c). To facilitate the wasm module and its build pipeline this project also includes some useful generic tools for working with WebAssembly.

- [`WASM.mjs`](02_DEPLOY/js/common/WASM.mjs) / [`wasm.h`](01_DEVELOP/wasm/wasm.h): A basic wasm module handler class and coresponding header. Designed to run small modules with no standard library or memory allocation requirements. Facilitates the basics of loading the compiled wasm module and comunicating between the JavaScript and WebAssembly runtimes.
- See [`WASMTest.mjs`](02_DEPLOY/js/WASMTest.mjs) / [`test.c`](01_DEVELOP/wasm/test.c) for a simple example.
- [`build_wasm`](01_DEVELOP/wasm/build_wasm): A sample build script intended to build very small WebAssembly modules. Uses `clang` and llvm's `wasm-ld` directly. (Thanks to [ern0](https://github.com/ern0/howto-wasm-minimal), [jaredkrinke](https://github.com/jaredkrinke/wasm-c-string))
