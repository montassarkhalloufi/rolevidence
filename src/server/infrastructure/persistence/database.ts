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

  if (![0, 1, 2, 3].includes(Number(version))) {
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

  if (version === 0 || version === 1) {
    db.exec(`BEGIN IMMEDIATE;
      CREATE TABLE analysis_jobs (
        id TEXT PRIMARY KEY, dossier_id TEXT NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL, status TEXT NOT NULL, payload TEXT NOT NULL
      );
      CREATE INDEX jobs_dossier ON analysis_jobs(dossier_id,created_at DESC,id DESC);
      CREATE TABLE campaigns (id TEXT PRIMARY KEY, title TEXT NOT NULL, purpose TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE campaign_members (campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        dossier_id TEXT NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE, position INTEGER NOT NULL,
        PRIMARY KEY(campaign_id,dossier_id));
      PRAGMA user_version=2; COMMIT;`);
  }

  if (version !== 3) {
    db.exec(
      `BEGIN IMMEDIATE; ALTER TABLE campaigns ADD COLUMN request_fingerprint TEXT; PRAGMA user_version=3; COMMIT;`,
    );
  }

  return db;
}
