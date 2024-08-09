// UNNEEDED FOR NOW. OVERKILL!

byte * alloc(uint32_t size) {
    HeapBlock * hb = heap_next_free;
    while (hb && hb->size < size) {
        hb = hb->next;
    }

    // no slot big enough
    if (!hb) {
        return NULL;
    }

    // found block, but not big enough to split
    // claim, adjust its size, and return
    uint32_t canSplit = HeapBlock_canSplit(hb);
    if (!canSplit) {
        hb->size = size;
        hb->free = 0;
        return HeapBlock_getPtr(hb);
    }

    HeapBlock * newBlock = HeapBlock_split(hb, size);
    if (!newBlock) {
        return NULL;
    }
    return HeapBlock_getPtr(newBlock);
}

void free(void * ptr) {

}

void init(){
    // heap_next_free will point to the next available block of memory
    heap_next_free = HeapBlock_createAtPtr(
        (byte *)MEM_HEAP_S,
        MEM_HEAP_E - MEM_HEAP_S - sizeof(HeapBlock)
    );
    print_val(heap_next_free);
}



// HEAP BLOCK /////////////////////////////////////////////////////////////// //

uint32_t align_padding(uint32_t size, uint32_t align) {
    if (align == 0) return 0;
    uint32_t remainder = size % align;
    return (remainder) ? align - remainder : 0;
}

byte * align_ptr(byte * ptr, size_t align) {
    return ptr + alignPadding((size_t)ptr, align);
}

uint32_t align_size(uint32_t size, uint32_t align) {
    return size + align_padding(size, align);
}

typedef struct {
    uint32_t size;
    byte * next;
    uint32_t free;
    char magic[4];
} HeapBlock;

#define HEAP_BLOCK_MIN_DATA_SIZE 4

// "instance"
HeapBlock * HeapBlock_init(HeapBlock * hb);
uint8_t HeapBlock_canSplit(HeapBlock * hb, uint32_t size);
HeapBlock * HeapBlock_split(HeapBlock * hb, uint32_t size);
byte * HeapBlock_getPtr(HeapBlock * hb);
// util
HeapBlock * HeapBlock_createAtPtr(byte * b, uint32_t size);
HeapBlock * HeapBlock_getBlockForPtr(byte * b);


static HeapBlock * heap_next_free = NULL;

HeapBlock * HeapBlock_init(HeapBlock * hb) {
    hb->size = 0;
    hb->next = NULL;
    hb->free = 1;
    hb->magic[0] = 'B';
    hb->magic[1] = 'L';
    hb->magic[2] = 'O';
    hb->magic[2] = 'K';
}

// is there enough room to split this block?
// block's data needs to be sizeof(HeapBlock) + size + HEAP_BLOCK_MIN_DATA_SIZE
uint8_t HeapBlock_canSplit(HeapBlock * hb, uint32_t size) {
    if (!hb) {
        return 0;
    }
    return (hb->size >= size + sizeof(HeapBlock) + HEAP_BLOCK_MIN_DATA_SIZE);
}

// splits for size bytes return new block
HeapBlock * HeapBlock_split(HeapBlock * hb, uint32_t size) {
    // not enough room for new block
    if (size + sizeof(HeapBlock) > hb->size) {
        return NULL;
    }

    // next block location
    uint32_t newSize = hb->size - size - sizeof(HeapBlock);
    byte * b = align_ptr(HeapBlock_getPtr(hb)+size, 16);
    HeapBlock * newBlock = HeapBlock_createAtPtr(b, );

    hb->size = size;
}

byte * HeapBlock_getPtr(HeapBlock * hb) {
    return ((byte *)hb) + sizeof(HeapBlock);
}

HeapBlock * HeapBlock_createAtPtr(byte * b, uint32_t size) {
    HeapBlock * hb = (HeapBlock *)b;
    HeapBlock_init(hb);
    hb->size = size;
    return hb;
}

HeapBlock * HeapBlock_getBlockForPtr(byte * b) {
    return (HeapBlock *)(b - sizeof(HeapBlock));
}

// /////////////////////////////////////////////////////////////// HEAP BLOCK //
