// wasm.h /////////////////////////////////////////////////////////////////////
// Use in conjunction with WASM.js
// /////////////////////////////////////////////////////////////////////////////

#pragma once
#include <stdint.h>

// TYPE DEFS ///////////////////////////////////////////////////////////////////

typedef unsigned char byte;


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

// WASM.js will configure memory with a special block, defined as follows
// Mirror these settings in WASM.js
// Space for 12 special 4-byte blocks here
#define MEM_SPECIAL_S 0x00010
#define MEM_SPECIAL_E 0x00040
// Reserved memory locations (4/12)
#define MEM_SPECIAL_STR_S   (MEM_SPECIAL_S+0x00)
#define MEM_SPECIAL_STR_E   (MEM_SPECIAL_S+0x04)
#define MEM_SPECIAL_HEAP_S  (MEM_SPECIAL_S+0x08)
#define MEM_SPECIAL_HEAP_E  (MEM_SPECIAL_S+0x0c)

// MEMORY LAYOUT ------------------------------------ //
#define MEM_STR_S  (*((uint32_t *)MEM_SPECIAL_STR_S))
#define MEM_STR_E  (*((uint32_t *)MEM_SPECIAL_STR_E))
#define MEM_HEAP_S (*((uint32_t *)MEM_SPECIAL_HEAP_S))
#define MEM_HEAP_E (*((uint32_t *)MEM_SPECIAL_HEAP_E))
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
    // print_val(str);
    print_str(str, len(str));
}

// shotcut for print_err export
inline void printe(char * err) {
    // print_val(err);
    print_err(err, len(err));
}

// shotcut for print_val export
inline void printv(uint32_t value) {
    // print_val(&value);
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
    static uint32_t next = 0;
    if (!next) {
        next = MEM_STR_S;
    }

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
