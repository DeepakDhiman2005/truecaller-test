// lib/truecallerStore.ts
const globalStore = globalThis as unknown as { 
    truecallerTempStorage: Map<string, any> 
};

if (!globalStore.truecallerTempStorage) {
    globalStore.truecallerTempStorage = new Map();
}

export const truecallerStore = globalStore.truecallerTempStorage;