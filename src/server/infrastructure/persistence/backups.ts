import { errorMessages } from "../../application/locales/errors-fr.ts";
import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { CaseFileBackup, CaseFile } from "../../application/case-files.ts";
import {
  Backup,
  BACKUP_MAX_ANALYSES,
  BACKUP_MAX_BYTES,
  SavedAnalysis,
} from "../../../shared/case-files.ts";
import { AppError } from "../../application/errors.ts";

export function restoreBackup(db: DatabaseSync, backup: CaseFileBackup) {
  const validated = Backup.parse(backup);

  const caseFileId = randomUUID();

  const caseFile = { ...validated.dossier, id: caseFileId };

  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("INSERT INTO dossiers VALUES(?,?,?,?,?,?,?)").run(
      caseFile.id,
      caseFile.title,
      caseFile.purpose,
      caseFile.revision,
      caseFile.createdAt,
      caseFile.updatedAt,
      JSON.stringify(caseFile),
    );
    for (const analysis of validated.analyses) {
      const restored = {
        ...analysis,
        id: randomUUID(),
        dossierId: caseFileId,
        snapshot: { ...analysis.snapshot, id: caseFileId },
      };

      db.prepare("INSERT INTO analyses VALUES(?,?,?,?,?)").run(
        restored.id,
        caseFileId,
        restored.createdAt,
        `restore-${randomUUID()}`,
        JSON.stringify(restored),
      );
    }

    db.exec("COMMIT");

    return caseFile;
  } catch {
    db.exec("ROLLBACK");
    throw new AppError("STORAGE_ERROR", errorMessages.restoreFailed);
  }
}

export function exportBackup(
  db: DatabaseSync,
  caseFile: CaseFile,
): CaseFileBackup {
  const rows = db
    .prepare(
      "SELECT payload FROM analyses WHERE dossier_id=? ORDER BY created_at,id LIMIT ?",
    )
    .all(caseFile.id, BACKUP_MAX_ANALYSES + 1);

  if (rows.length > BACKUP_MAX_ANALYSES) {
    throw new AppError("FILE_TOO_LARGE", errorMessages.historyTooLarge);
  }

  const backup = Backup.parse({
    format: "rolevidence-backup-v1",
    dossier: caseFile,
    analyses: rows.map((row) =>
      SavedAnalysis.parse(JSON.parse(String(row.payload)) as unknown),
    ),
  });

  if (Buffer.byteLength(JSON.stringify(backup)) > BACKUP_MAX_BYTES) {
    throw new AppError("FILE_TOO_LARGE", errorMessages.backupTooLarge);
  }

  return backup;
}
