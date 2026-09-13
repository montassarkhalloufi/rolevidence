import { errorMessages } from "../../application/locales/errors-fr.ts";
import { restoreBackup, exportBackup } from "./backups.ts";
import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import {
  CaseFile as CaseFileSchema,
  SavedAnalysis as AnalysisSchema,
  CaseFileSummary,
} from "../../../shared/case-files.ts";
import type {
  CaseFileRepository,
  CaseFileDraft,
} from "../../application/case-files.ts";
import { AppError } from "../../application/errors.ts";

const notFound = () =>
  new AppError("NOT_FOUND", errorMessages.caseFileNotFound);

const conflict = () =>
  new AppError("IDEMPOTENCY_CONFLICT", errorMessages.staleSave);

function payload<T>(row: unknown, schema: z.ZodType<T>): T {
  const { payload } = z.object({ payload: z.string() }).parse(row);

  return schema.parse(JSON.parse(payload) as unknown);
}

function safe<T>(operation: () => T): T {
  try {
    return operation();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("STORAGE_ERROR", errorMessages.storageFailed);
  }
}

function write(
  db: DatabaseSync,
  id: string,
  draft: CaseFileDraft,
  revision: number,
) {
  const previous = db
    .prepare("SELECT revision, created_at FROM dossiers WHERE id=?")
    .get(id);

  if ((previous?.revision ?? 0) !== revision) {
    throw conflict();
  }

  const now = new Date().toISOString();

  const value = CaseFileSchema.parse({
    ...draft,
    id,
    revision: revision + 1,
    createdAt: previous?.created_at ?? now,
    updatedAt: now,
  });

  db.prepare(
    `INSERT INTO dossiers VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
    title=excluded.title, purpose=excluded.purpose, revision=excluded.revision,
    updated_at=excluded.updated_at, payload=excluded.payload`,
  ).run(
    id,
    value.title,
    value.purpose,
    value.revision,
    value.createdAt,
    now,
    JSON.stringify(value),
  );

  return value;
}

function transaction<T>(db: DatabaseSync, operation: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = operation();

    db.exec("COMMIT");

    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function createCaseFileRepository(db: DatabaseSync): CaseFileRepository {
  const get = (id: string) =>
    safe(() => {
      const row = db.prepare("SELECT payload FROM dossiers WHERE id=?").get(id);

      if (!row) {
        throw notFound();
      }

      return payload(row, CaseFileSchema);
    });

  return {
    get,
    restore: (backup) => restoreBackup(db, backup),
    backup: (id) => safe(() => exportBackup(db, get(id))),
    save: (id, draft, revision) =>
      safe(() => transaction(db, () => write(db, id, draft, revision))),
    list: (query, offset, limit) =>
      safe(() => {
        const filter = `%${query.replace(/[\\%_]/g, "\\$&")}%`;

        const items = db
          .prepare(
            "SELECT id,title,purpose,revision,created_at AS createdAt,updated_at AS updatedAt FROM dossiers WHERE title LIKE ? ESCAPE '\\' ORDER BY updated_at DESC,id DESC LIMIT ? OFFSET ?",
          )
          .all(filter, limit, offset)
          .map((row) => CaseFileSummary.parse(row));

        const total = Number(
          db
            .prepare(
              "SELECT count(*) AS count FROM dossiers WHERE title LIKE ? ESCAPE '\\'",
            )
            .get(filter)?.count,
        );

        return { items, total, offset, limit };
      }),
    delete: (id, revision) =>
      safe(() => {
        const outcome = db
          .prepare("DELETE FROM dossiers WHERE id=? AND revision=?")
          .run(id, revision);

        if (!outcome.changes) {
          get(id);
          throw conflict();
        }
      }),
    analyses: (id, offset, limit) =>
      safe(() => {
        get(id);
        const items = db
          .prepare(
            "SELECT payload FROM analyses WHERE dossier_id=? ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?",
          )
          .all(id, limit, offset)
          .map((row) => payload(row, AnalysisSchema));

        const total = Number(
          db
            .prepare(
              "SELECT count(*) AS count FROM analyses WHERE dossier_id=?",
            )
            .get(id)?.count,
        );

        return { items, total, offset, limit };
      }),
    append: (snapshot, result, requestKey) =>
      safe(() =>
        transaction(db, () => {
          get(snapshot.id);
          const old = db
            .prepare("SELECT payload FROM analyses WHERE request_key=?")
            .get(requestKey);

          if (old) {
            return payload(old, AnalysisSchema);
          }

          const value = AnalysisSchema.parse({
            id: randomUUID(),
            dossierId: snapshot.id,
            createdAt: new Date().toISOString(),
            snapshot,
            result,
          });

          db.prepare("INSERT INTO analyses VALUES(?,?,?,?,?)").run(
            value.id,
            snapshot.id,
            value.createdAt,
            requestKey,
            JSON.stringify(value),
          );

          return value;
        }),
      ),
  };
}
