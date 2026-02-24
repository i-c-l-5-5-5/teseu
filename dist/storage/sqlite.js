import Database from "better-sqlite3";
let db = null;
export function getSQLite() {
    if (!db) {
        const dbPath = process.env.DB_PATH ?? "database/barqueiro.db";
        db = new Database(dbPath);
        db.pragma("journal_mode = WAL");
        db.pragma("foreign_keys = ON");
    }
    return db;
}
export function closeSQLite() {
    if (db) {
        db.close();
        db = null;
    }
}
