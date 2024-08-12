// wasm.h /////////////////////////////////////////////////////////////////////
// Use in conjunction with WASM.js
// /////////////////////////////////////////////////////////////////////////////

#pragma once
#include <stdint.h>

// TYPE DEFS ///////////////////////////////////////////////////////////////////

typedef unsigned char byte;


// EXPORTS /////////////////////////////////////////////////////////////////////

extern uint8_t memory;
extern void print(
    void * str, uint32_t strLen, uint8_t isErr,
    uint8_t valType, uint8_t valCount, void * valPtr
);

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

// TYPES -------------------------------------------- //
#define T_NONE 0x00
#define T_BYTE 0x10
#define T_PTR  0x12
#define T_U8   0x20
#define T_U16  0x21
#define T_U32  0x22
#define T_U64  0x23
#define T_I8   0x30
#define T_I16  0x31
#define T_I32  0x32
#define T_I64  0x33
#define T_F32  0x42
#define T_F64  0x43

// UTILITY FUNCTIONS ///////////////////////////////////////////////////////////

// strlen, limits to 32bit
inline uint32_t len(char const * str) {
    if (!str) return 0;
    uint32_t len = 0;
    while(*str && len < 0xffffffff) ++str, ++len;
    return len;
}

// shortcut for print, single string
inline void prints(char * str) {
    print(str, len(str), 0, T_NONE, 0, NULL);
}

// shortcut for print, single string as error
inline void printe(char * err) {
    print(err, len(err), 1, T_NONE, 0, NULL);
}

// shortcut for print, string with u32 value
inline void printu32(char * str, uint32_t value) {
    print(str, len(str), 0, T_U32, 1, &value);
}

// shortcut for print, string with value of type
inline void printv(char * str, uint8_t valType, void * ptr) {
    print(str, len(str), 0, valType, 1, ptr);
}

// shortcut for print, string with value of type
inline void printvs(char * str, uint8_t valType, uint8_t valCount, void * ptr) {
    print(str, len(str), 0, valType, valCount, ptr);
}

// shortcut for print, string with multiple values of type
// inline void printv(char * str, uint8_t valType, uint8_t valCount, void * ptr) {
//     print(str, len(str), 0, valType, valCount, ptr);
// }

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
