export interface DBResult {
    changes: number;
    lastInsertRowid: number | bigint;
}
export interface DB {
    query: (text: string, params?: unknown[]) => Promise<{
        rows: unknown[];
        rowCount: number;
    }>;
    get: (text: string, params?: unknown[]) => Promise<unknown>;
    all: (text: string, params?: unknown[]) => Promise<unknown[]>;
    run: (text: string, params?: unknown[]) => Promise<DBResult>;
    close: () => Promise<void>;
}
export declare function getDB(): DB;
export declare function closeDB(): Promise<void>;
export declare function isDBConfigured(): boolean;
