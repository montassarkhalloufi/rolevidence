import { DatabaseSync } from "node:sqlite";
import { mkdirSync, chmodSync } from "node:fs";
import { dirname } from "node:path";

export function openDatabase(path: string) {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  }

  const db = new DatabaseSync(path);

  if (path !== ":memory:") {
    chmodSync(path, 0o600);
  }

  db.exec(
    "PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000; PRAGMA secure_delete=ON;",
  );
  const version = db.prepare("PRAGMA user_version").get()?.user_version;

  if (version !== 0 && version !== 1) {
    db.close();
    throw new Error(
      "Unsupported database version. Use a compatible Rolevidence release.",
    );
  }

  if (version === 0) {
    db.exec(`BEGIN IMMEDIATE;
      CREATE TABLE dossiers (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, purpose TEXT NOT NULL,
        revision INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
        payload TEXT NOT NULL
      );
      CREATE TABLE analyses (
        id TEXT PRIMARY KEY, dossier_id TEXT NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL, request_key TEXT NOT NULL UNIQUE, payload TEXT NOT NULL
      );
      CREATE INDEX analyses_dossier ON analyses(dossier_id, created_at DESC, id DESC);
      PRAGMA user_version=1; COMMIT;`);
  }

  return db;
}
