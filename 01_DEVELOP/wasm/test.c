#include "wasm.h"

void WASM_EXPORT(test)() {
    printu32(NULL, 47);
    prints("fart");
    prints("dingus");
}

char * WASM_EXPORT(caps)(char * str) {
    char * s = str;
    while (*s) {
        if ('a' <= *s && *s <= 'z') {
            *s -= 'a' - 'A';
        }
        ++s;
    }
    return str;
}
