# WGLFX
WGLFX (“WebGL Effects” or “wiggle fix”) is a WebGL2 playground app written in ES module JavaScript. The project’s main goal is to create a simple tool to play directly with shader code, but allow for (and create tools to easily facilitate) advanced, multi-pass set-ups. Currently a work in progress and is mostly still a proof of concept. So far: supports a one-pass basic vert/frag shader setup, some simple mesh data, some UBO variable capability, multiple projects and some basic project management. The primary feature of editing shader code in real time is implemented, with a [feature rich editor](https://ace.c9.io) and in-line compile error indicators.

Feel free to play with this [Live Version](https://tylermartin.net/wglfx), but do expect many bugs and probably incompatible project saves as development continues.

Supports some keyboard shortcuts:

| Win | Mac | Function |
| --- | --- | --- |
| Ctrl+S | ⌘ S | Save current shader code and mesh data to [local storage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage). Will reload code and data on next page load. |
| Ctrl+E | ⌘ E | Toggle UI |

## On JavaScript
This project uses [ES modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) (“ES6 Modules”) and plenty of [ even-more-modern](https://262.ecma-international.org/13.0/) features like [instance fields](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Public_class_fields), [static fields](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/static), [private fields and methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_properties), and more. 

There are two main reasons for being aggressive with requiring such modern features (and not bothering with any polyfills). The first is an acknowledgment of the specific audience for a shader/graphics development app. The author has little concern generally as these new features are broadly available, but especially when concidering the audience in question.

The second reason is more personal, as the primary contributor is simply enjoying catching up on modern JavaScript after years of only occasional check-ins. It is useful and educational to explore and experiment cutting-edge features in exactly this sort of toy-app scenario.

This project also uses extensions to the built-in types and prototypes (“monkey patching”). The author justifies the out-of-vogue practice by reminding potential critics that this code, while hopefully useful and portable, is not intended for *automated* inclusion into any ecosystem, and the convenience to the development process easily overrides any theoretical concerns about unlikely deployment scenarios. Also, all extensions are added through a central function (see [extd](02_DEPLOY/js/common/common-extension.mjs#L5-L13)) so the policy can be changed in once place if necessary. As it is this app’s additions will never override anything, and simply break this app if they fail, which is an extremely acceptable (and again, unlikely) outcome.

## WebAssembly + z85.wasm
This project includes a WebAssembly [Z85](https://rfc.zeromq.org/spec/32/) encoder/decoder based on the C code from the [Z85 reference spec](https://github.com/zeromq/rfc/blob/master/src/spec_32.c). To facilitate the wasm module and its build pipeline this project also includes some useful generic tools for working with WebAssembly.

- [`WASM.mjs`](02_DEPLOY/js/common/WASM.mjs) / [`wasm.h`](01_DEVELOP/wasm/wasm.h): A basic wasm module handler class and corresponding header. Designed to run small modules with no standard library or memory allocation requirements. Facilitates the basics of loading the compiled wasm module and communicating between the JavaScript and WebAssembly runtimes.
- See [`WASMTest.mjs`](02_DEPLOY/js/WASMTest.mjs) / [`test.c`](01_DEVELOP/wasm/test.c) for a simple example.
- [`build_wasm`](01_DEVELOP/wasm/build_wasm): A sample build script intended to build very small WebAssembly modules. Uses `clang` and llvm's `wasm-ld` directly.

## 3rd party libraries and contributions
| Library/Function | Credit |
| --- | --- |
| Ace text editor | [Ace](https://ace.c9.io) |
| Coloris color picker | [Coloris](https://coloris.js.org) |
| wasm minimal setup, [wasm build script](01_DEVELOP/wasm/build_wasm) | [ern0](https://github.com/ern0/howto-wasm-minimal) |
| [WASM_EXPORT](01_DEVELOP/wasm/wasm.h#L24-L26) | [jaredkrinke](https://github.com/jaredkrinke/wasm-c-string/blob/main/test/wasm-c-string-test.c) |
