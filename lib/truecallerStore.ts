// lib/truecallerStore.ts

// Use globalThis to survive hot-reloads in development
const globalForTc = global as unknown as { tcStore: Map<string, any> };

export const tcStore = globalForTc.tcStore || new Map();

if (process.env.NODE_ENV !== "production") globalForTc.tcStore = tcStore;