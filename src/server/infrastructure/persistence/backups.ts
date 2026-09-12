import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { DossierBackup, Dossier } from "../../application/dossiers.ts";
import {
  Backup,
  BACKUP_MAX_ANALYSES,
  BACKUP_MAX_BYTES,
  SavedAnalysis,
} from "../../../shared/dossiers.ts";
import { AppError } from "../../application/errors.ts";

export function restoreBackup(db: DatabaseSync, backup: DossierBackup) {
  const validated = Backup.parse(backup);

  const dossierId = randomUUID();

  const dossier = { ...validated.dossier, id: dossierId };

  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("INSERT INTO dossiers VALUES(?,?,?,?,?,?,?)").run(
      dossier.id,
      dossier.title,
      dossier.purpose,
      dossier.revision,
      dossier.createdAt,
      dossier.updatedAt,
      JSON.stringify(dossier),
    );
    for (const analysis of validated.analyses) {
      const restored = {
        ...analysis,
        id: randomUUID(),
        dossierId,
        snapshot: { ...analysis.snapshot, id: dossierId },
      };

      db.prepare("INSERT INTO analyses VALUES(?,?,?,?,?)").run(
        restored.id,
        dossierId,
        restored.createdAt,
        `restore-${randomUUID()}`,
        JSON.stringify(restored),
      );
    }

    db.exec("COMMIT");

    return dossier;
  } catch {
    db.exec("ROLLBACK");
    throw new AppError(
      "STORAGE_ERROR",
      "La restauration a échoué. Aucun dossier n’a été modifié.",
    );
  }
}

export function exportBackup(
  db: DatabaseSync,
  dossier: Dossier,
): DossierBackup {
  const rows = db
    .prepare(
      "SELECT payload FROM analyses WHERE dossier_id=? ORDER BY created_at,id LIMIT ?",
    )
    .all(dossier.id, BACKUP_MAX_ANALYSES + 1);

  if (rows.length > BACKUP_MAX_ANALYSES) {
    throw new AppError(
      "FILE_TOO_LARGE",
      "Ce dossier dépasse la limite d’export. Sauvegardez SQLite avec l’application arrêtée.",
    );
  }

  const backup = Backup.parse({
    format: "rolevidence-backup-v1",
    dossier,
    analyses: rows.map((row) =>
      SavedAnalysis.parse(JSON.parse(String(row.payload)) as unknown),
    ),
  });

  if (Buffer.byteLength(JSON.stringify(backup)) > BACKUP_MAX_BYTES) {
    throw new AppError("FILE_TOO_LARGE", "Sauvegarde trop volumineuse.");
  }

  return backup;
}
