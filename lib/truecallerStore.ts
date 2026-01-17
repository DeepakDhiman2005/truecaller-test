const globalStore = globalThis as unknown as { 
    truecallerTempStorage: Map<string, any>;
    truecallerLogs: any[]; 
};

if (!globalStore.truecallerTempStorage) globalStore.truecallerTempStorage = new Map();
if (!globalStore.truecallerLogs) globalStore.truecallerLogs = [];

export const truecallerStore = globalStore.truecallerTempStorage;
export const truecallerLogs = globalStore.truecallerLogs;

// 🟢 Helper to push console-style messages to our log array
export const pushLog = (type: "INFO" | "ERROR" | "DEBUG", message: string, detail: any = null) => {
    const logEntry = {
        timestamp: new Date().toISOString(),
        type,
        message,
        detail
    };
    truecallerLogs.push(logEntry);
    if (truecallerLogs.length > 100) truecallerLogs.shift(); // Keep last 100
    
    // Also log to real server console
    if (type === "ERROR") console.error(`[${type}] ${message}`, detail);
    else console.log(`[${type}] ${message}`, detail);
};