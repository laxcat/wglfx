/*

//  --------------------------------------------------------------------------
//  WebAssembly version of Z85 encoder/decoder based on reference
//  implementation for rfc.zeromq.org/spec:32/Z85
//
//  https://github.com/zeromq/rfc/blob/master/src/spec_32.c
//
//  Lots of superficial and memory-related changes were made for the wasm
//  environment, but the algoritm itself remains unchanged from reference
//  implementation. -tm,2024-08-12

//  --------------------------------------------------------------------------
//  Copyright (c) 2010-2013 iMatix Corporation and Contributors
//
//  Permission is hereby granted, free of charge, to any person obtaining a
//  copy of this software and associated documentation files (the "Software"),
//  to deal in the Software without restriction, including without limitation
//  the rights to use, copy, modify, merge, publish, distribute, sublicense,
//  and/or sell copies of the Software, and to permit persons to whom the
//  Software is furnished to do so, subject to the following conditions:
//
//  The above copyright notice and this permission notice shall be included in
//  all copies or substantial portions of the Software.
//
//  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
//  THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
//  FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
//  DEALINGS IN THE SOFTWARE.
//  --------------------------------------------------------------------------

*/
#include "wasm.h"

// INIT INFO
typedef struct {
    uint32_t   decodedDataSizeMax;
    uint32_t   encodedDataSizeMax;
    byte     * decodedDataPtr;
    byte     * encodedDataPtr;
    uint32_t * dataSizePtr;
} InitInfo;
static InitInfo info;

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

void * WASM_EXPORT(Z85_init)() {
    if (MEM_HEAP_E - MEM_HEAP_S <= 8) {
        printe("ERROR IN Z85");
        return NULL;
    }
    // For every 4 bytes we want to encode, we need 9 bytes available in the heap:
    // 4 to read from, 5 to encode to.
    // So we can calculate max encoding size by figuing how many 9-byte blocks we can fit
    uint32_t codecSize = MEM_HEAP_E - MEM_HEAP_S - sizeof(uint32_t);
    uint32_t blockCount = 1 + ((codecSize - 1) / 9);
    info.decodedDataSizeMax = blockCount * 4;
    info.encodedDataSizeMax = blockCount * 5;
    info.dataSizePtr = (uint32_t *)MEM_HEAP_S;
    info.decodedDataPtr = (byte *)(MEM_HEAP_S + sizeof(uint32_t));
    info.encodedDataPtr = info.decodedDataPtr + info.decodedDataSizeMax;

    printu32("INIT Z85. Buffer size:", info.decodedDataSizeMax);

    return &info;
}

uint32_t WASM_EXPORT(Z85_getPaddedDataSize)() {
    uint32_t size = *info.dataSizePtr;
    uint32_t m = size % 4;
    uint32_t padding = (m) ? 4 - m : 0;
    size += padding;
    return size;
}

uint32_t WASM_EXPORT(Z85_encode)() {
    uint32_t size = Z85_getPaddedDataSize();
    uint32_t padding = size - *info.dataSizePtr;

    if (size > info.decodedDataSizeMax) {
        printe("ERROR IN Z85");
        return 0;
    }

    while (padding) {
        // prints("ZEROING BYTE AT");
        // print_val(info.decodedDataPtr + size - padding);
        info.decodedDataPtr[size-padding] = 0x00;
        --padding;
    }

    size_t encoded_size = size * 5 / 4;
    uint32_t char_nbr = 0;
    uint32_t byte_nbr = 0;
    uint32_t value = 0;
    while (byte_nbr < size) {
        //  Accumulate value in base 256 (binary)
        value = value * 256 + info.decodedDataPtr[byte_nbr++];
        if (byte_nbr % 4 == 0) {
            //  Output value in base 85
            uint32_t divisor = 85 * 85 * 85 * 85;
            while (divisor) {
                info.encodedDataPtr[char_nbr++] = encoder[value / divisor % 85];
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
    return *info.dataSizePtr;
}

uint32_t WASM_EXPORT(Z85_decode)() {
    uint32_t decoded_size = Z85_getPaddedDataSize();
    uint32_t encoded_size = decoded_size * 5 / 4;

    uint32_t byte_nbr = 0;
    uint32_t char_nbr = 0;
    uint32_t value = 0;
    while (char_nbr < encoded_size) {
        //  Accumulate value in base 85
        value = value * 85 + decoder[info.encodedDataPtr[char_nbr++] - 32];
        if (char_nbr % 5 == 0) {
            //  Output value in base 256
            uint32_t divisor = 256 * 256 * 256;
            while (divisor) {
                info.decodedDataPtr[byte_nbr++] = value / divisor % 256;
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
    return *info.dataSizePtr;
}
