// wasm.h /////////////////////////////////////////////////////////////////////
// Use in conjunction with WASM.js
// /////////////////////////////////////////////////////////////////////////////

#pragma once
#include <stdint.h>

// EXPORTS /////////////////////////////////////////////////////////////////////

extern uint8_t memory;
extern void print_val(void * value);
extern void print_str(void * ptr, uint32_t len);
extern void print_err(void * ptr, uint32_t len);


// WASM MACROS /////////////////////////////////////////////////////////////////

// thanks to: https://github.com/jaredkrinke/wasm-c-string/blob/main/test/wasm-c-string-test.c
#define WASM_EXPORT_AS(name) __attribute__((export_name(name)))
#define WASM_EXPORT(symbol) WASM_EXPORT_AS(#symbol) symbol


// CONSTANTS ///////////////////////////////////////////////////////////

// MEMORY LAYOUT ------------------------------------ //
// define block of memory for dynamic string creation
#define MEM_STR_S 0x0400
#define MEM_STR_E 0xf400
// -------------------------------- END MEMORY LAYOUT //


// UTILITY FUNCTIONS ///////////////////////////////////////////////////////////

// strlen, limits to 32bit
inline uint32_t len(char const * str) {
    uint32_t len = 0;
    while(*str && len < 0xffffffff) ++str, ++len;
    return len;
}

// shotcut for print_str export
inline void prints(char * str) {
    print_val(str);
    print_str(str, len(str));
}

// shotcut for print_val export
inline void printv(uint32_t value) {
    print_val(&value);
    print_val((void *)value);
}

// UTILITY EXPORTS /////////////////////////////////////////////////////////////
// use in conjunction with WASM.js

// Request memory location for string encoding.
// Simple circular buffer in range: MEM_STR_S — MEM_STR_E
// Never frees strings, just overwrites old ones.
// Zeros out memory at return value for size+1 bytes (for debug sanity),
//     which could be removed for optimization.
// size is string length WITHOUT counting null terminus.
// NOTE: size typically determined by javascripts str.length, but that might
//     not be the length we actually need, once encoded.
//     UTF-16 to UTF-8 can NOT predict length beforehand, right?
char * WASM_EXPORT(request_str_ptr)(uint32_t size) {
    // bail if requested size is bigger than our entire string block
    if (size + 1 > MEM_STR_E - MEM_STR_S) return 0;

    // ptr to next available location in string block
    static uint32_t next = MEM_STR_S;

    // set start and end
    uint32_t start = next;
    uint32_t end = start + size + 1;

    // bail if end is out of range
    if (end > MEM_STR_E) {
        return 0;
    }

    // zero out bytes (remove to optimize)
    uint8_t * ptr = &memory;
    for (int i = start; i < end; ++i) {
        ptr[i] = 0;
    }

    // return
    next = end;
    return (char *)(void *)start;
}
