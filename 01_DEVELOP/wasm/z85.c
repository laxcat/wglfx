#include <stddef.h>
#include "wasm.h"

void WASM_EXPORT(init)() {

    prints("init z85 wasm");
}

void WASM_EXPORT(test)() {
    prints("testing z85 wasm module");
    printv(MEM_HEAP_S);
    printv(MEM_HEAP_E);
}

// char * WASM_EXPORT(Z85_encode)(byte * data, size_t size) {
//     return NULL;
// }

// byte * WASM_EXPORT(Z85_decode)(char * str) {
//     return NULL;
// }
