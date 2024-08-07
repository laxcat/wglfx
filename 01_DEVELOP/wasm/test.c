#include <stdint.h>

extern uint8_t memory;
// define block of memory for dynamic string creation
#define MEM_STR_S 0x0400
#define MEM_STR_E 0x8400

extern void print_val(void * value);
extern void print_str(void * ptr, uint32_t len);
extern void print_err(void * ptr, uint32_t len);

uint32_t len(char const * str) {
    uint32_t len = 0;
    while(*str && len < 0xffffffff) ++str, ++len;
    return len;
}

// Request memory location for string encoding.
// Simple circular buffer in range: MEM_STR_S — MEM_STR_E
// Zeros out memory at return value for size+1 bytes (for debug sanity),
// which could be removed for optimization.
// size is string length WITHOUT counting null terminus.
__attribute__((export_name("request_str_ptr")))
char * request_str_ptr(uint32_t size) {
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
