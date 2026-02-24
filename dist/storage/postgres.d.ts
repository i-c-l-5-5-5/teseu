import { Pool } from "pg";
export declare function getPostgresPool(): Pool | null;
export declare function closePostgresPool(): Promise<void>;
export declare function query(text: string, params?: unknown[]): Promise<{
    rows: unknown[];
    rowCount: number;
}>;
export declare function get(text: string, params?: unknown[]): Promise<unknown>;
export declare function all(text: string, params?: unknown[]): Promise<unknown[]>;
export declare function run(text: string, params?: unknown[]): Promise<{
    rows: unknown[];
    rowCount: number;
}>;
export declare function isPostgresConfigured(): boolean;
