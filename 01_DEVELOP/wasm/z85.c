#include <stddef.h>
#include "wasm.h"

#define streq(s1,s2) (!strcmp ((s1), (s2)))

static uint32_t   DecodedDataSizeMax    = 0;
static uint32_t   EncodedDataSizeMax    = 0;
static byte     * DecodedDataPtr        = NULL;
static byte     * EncodedDataPtr        = NULL;
static uint32_t * DataSizePtr           = NULL;

//  Maps base 256 to base 85
static char encoder[85 + 1] = {
    "0123456789"
    "abcdefghij"
    "klmnopqrst"
    "uvwxyzABCD"
    "EFGHIJKLMN"
    "OPQRSTUVWX"
    "YZ.-:+=^!/"
    "*?&<>()[]{"
    "}@%$#"
};

//  Maps base 85 to base 256
//  We chop off lower 32 and higher 128 ranges
static byte decoder[96] = {
    0x00, 0x44, 0x00, 0x54, 0x53, 0x52, 0x48, 0x00,
    0x4B, 0x4C, 0x46, 0x41, 0x00, 0x3F, 0x3E, 0x45,
    0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
    0x08, 0x09, 0x40, 0x00, 0x49, 0x42, 0x4A, 0x47,
    0x51, 0x24, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2A,
    0x2B, 0x2C, 0x2D, 0x2E, 0x2F, 0x30, 0x31, 0x32,
    0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A,
    0x3B, 0x3C, 0x3D, 0x4D, 0x00, 0x4E, 0x43, 0x00,
    0x00, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10,
    0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18,
    0x19, 0x1A, 0x1B, 0x1C, 0x1D, 0x1E, 0x1F, 0x20,
    0x21, 0x22, 0x23, 0x4F, 0x00, 0x50, 0x00, 0x00
};

void WASM_EXPORT(Z85_init)() {
    if (MEM_HEAP_E - MEM_HEAP_S <= 8) {
        printe("not enought dynamic memory for z85 wasm module. did not init.");
        return;
    }
    prints("init z85 wasm module");
    // For every 4 bytes we want to encode, we need 9 bytes available in the heap:
    // 4 to read from, 5 to encode to.
    // So we can calculate max encoding size by figuing how many 9-byte blocks we can fit
    uint32_t codecSize = MEM_HEAP_E - MEM_HEAP_S - sizeof(uint32_t);
    uint32_t blockCount = 1 + ((codecSize - 1) / 9);
    DecodedDataSizeMax = blockCount * 4;
    EncodedDataSizeMax = blockCount * 5;
    DataSizePtr = (uint32_t *)MEM_HEAP_S;
    DecodedDataPtr = (byte *)(MEM_HEAP_S + sizeof(uint32_t));
    EncodedDataPtr = DecodedDataPtr + DecodedDataSizeMax;
}

uint32_t   WASM_EXPORT(Z85_getDecodedDataSizeMax)()   { return DecodedDataSizeMax; }
uint32_t   WASM_EXPORT(Z85_getEncodedDataSizeMax)()   { return EncodedDataSizeMax; }
byte     * WASM_EXPORT(Z85_getDecodedDataPtr)()       { return DecodedDataPtr; }
byte     * WASM_EXPORT(Z85_getEncodedDataPtr)()       { return EncodedDataPtr; }
uint32_t * WASM_EXPORT(Z85_getDataSizePtr)()          { return DataSizePtr; }

uint32_t WASM_EXPORT(Z_85_getPaddedDataSize)() {
    uint32_t size = *DataSizePtr;
    uint32_t m = size % 4;
    uint32_t padding = (m) ? 4 - m : 0;
    size += padding;
    return size;
}

uint32_t WASM_EXPORT(Z85_encode)() {
    uint32_t size = Z_85_getPaddedDataSize();
    uint32_t padding = size - *DataSizePtr;

    if (size > DecodedDataSizeMax) {
        printe("ERROR IN Z85");
        return 0;
    }

    while (padding) {
        // prints("ZEROING BYTE AT");
        // print_val(DecodedDataPtr + size - padding);
        DecodedDataPtr[size-padding] = 0x00;
        --padding;
    }

    size_t encoded_size = size * 5 / 4;
    uint32_t char_nbr = 0;
    uint32_t byte_nbr = 0;
    uint32_t value = 0;
    while (byte_nbr < size) {
        //  Accumulate value in base 256 (binary)
        value = value * 256 + DecodedDataPtr[byte_nbr++];
        if (byte_nbr % 4 == 0) {
            //  Output value in base 85
            uint32_t divisor = 85 * 85 * 85 * 85;
            while (divisor) {
                EncodedDataPtr[char_nbr++] = encoder[value / divisor % 85];
                divisor /= 85;
            }
            value = 0;
        }
    }
    if (char_nbr != encoded_size) {
        printe("ERROR IN Z85");
        return 0;
    }
    // always return the "real" byte count, if known, not padded
    return *DataSizePtr;
}

uint32_t WASM_EXPORT(Z85_decode)() {
    uint32_t decoded_size = Z_85_getPaddedDataSize();
    uint32_t encoded_size = decoded_size * 5 / 4;

    // size_t decoded_size = size * 4 / 5;
    // byte *decoded = malloc (decoded_size);

    uint32_t byte_nbr = 0;
    uint32_t char_nbr = 0;
    uint32_t value = 0;
    while (char_nbr < encoded_size) {
        //  Accumulate value in base 85
        value = value * 85 + decoder[EncodedDataPtr[char_nbr++] - 32];
        if (char_nbr % 5 == 0) {
            //  Output value in base 256
            uint32_t divisor = 256 * 256 * 256;
            while (divisor) {
                DecodedDataPtr[byte_nbr++] = value / divisor % 256;
                divisor /= 256;
            }
            value = 0;
        }
    }
    if (byte_nbr != decoded_size) {
        printe("ERROR IN Z85");
        return 0;
    }
    // always return the "real" byte count, if known, not padded
    return *DataSizePtr;
}
