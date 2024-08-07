#include <stdint.h>
#include "wasm.h"

uint32_t len(char const * str) {
    uint32_t len = 0;
    while(*str && len < 0xffffffff) ++str, ++len;
    return len;
}

__attribute__((export_name("test")))
void test() {
    print_val((void *)47);
    char * temp1 = "fart";
    char * temp2 = "dingus";
    print_str(temp1, len(temp1));
    print_str(temp2, len(temp2));
}

__attribute__((export_name("caps")))
char * caps(char * str) {
    char * s = str;
    while (*s) {
        if ('a' <= *s && *s <= 'z') {
            *s -= 'a' - 'A';
        }
        ++s;
    }
    return str;
    // print_str(str, s - str);
}
