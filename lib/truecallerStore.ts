const globalStore = globalThis as unknown as { 
    truecallerTempStorage: Map<string, any>;
    truecallerLogs: any[]; // 🟢 Added for global history
};

if (!globalStore.truecallerTempStorage) {
    globalStore.truecallerTempStorage = new Map();
}
if (!globalStore.truecallerLogs) {
    globalStore.truecallerLogs = []; // 🟢 Global array for all callbacks
}

export const truecallerStore = globalStore.truecallerTempStorage;
export const truecallerLogs = globalStore.truecallerLogs;