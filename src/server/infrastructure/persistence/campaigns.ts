import { errorMessages } from "../../application/locales/errors-fr.ts";
import { CAMPAIGN_PAGE_SIZE } from "../../../shared/limits.ts";
import { emptyPreferences } from "../../../shared/analysis.ts";
import { randomUUID, createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import {
  Campaign,
  CampaignPage,
  CampaignInput,
} from "../../../shared/workflows.ts";
import type { CampaignRepository } from "../../application/campaigns.ts";
import type { CaseFileRepository } from "../../application/case-files.ts";
import { CaseFile } from "../../../shared/case-files.ts";
import { AppError } from "../../application/errors.ts";

export function createCampaignRepository(
  db: DatabaseSync,
  caseFiles: CaseFileRepository,
): CampaignRepository {
  function get(id: string) {
    const row = db
      .prepare(
        "SELECT id,title,purpose,created_at AS createdAt FROM campaigns WHERE id=?",
      )
      .get(id);

    if (!row) {
      throw new AppError("NOT_FOUND", errorMessages.campaignMissing);
    }

    const members = db
      .prepare(
        "SELECT dossier_id FROM campaign_members WHERE campaign_id=? ORDER BY position",
      )
      .all(id)
      .map((member) => {
        const caseFile = caseFiles.get(String(member.dossier_id));

        return {
          dossier: caseFile,
          latest: caseFiles.analyses(caseFile.id, 0, 1).items[0] ?? null,
        };
      });

    return Campaign.parse({ ...row, members });
  }

  return {
    get,
    create(id, input) {
      const parsed = CampaignInput.parse(input);

      const existing = db
        .prepare("SELECT request_fingerprint FROM campaigns WHERE id=?")
        .get(id);

      if (existing) {
        if (existing.request_fingerprint !== fingerprint(parsed)) {
          throw new AppError(
            "IDEMPOTENCY_CONFLICT",
            errorMessages.campaignConflict,
          );
        }

        return get(id);
      }

      const base = caseFiles.get(parsed.baseId);

      if (base.revision !== parsed.baseRevision) {
        throw new AppError(
          "IDEMPOTENCY_CONFLICT",
          errorMessages.staleCampaignSource,
        );
      }

      const sharedText =
        base.purpose === "job_search"
          ? base.documents.profile
          : base.documents.job;

      if (!sharedText.trim()) {
        throw new AppError(
          "INVALID_INPUT",
          errorMessages.missingSharedDocument,
        );
      }

      db.exec("BEGIN IMMEDIATE");
      try {
        db.prepare("INSERT INTO campaigns VALUES(?,?,?,?,?)").run(
          id,
          parsed.title,
          base.purpose,
          new Date().toISOString(),
          fingerprint(parsed),
        );
        insertMembers(db, id, parsed, base);
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }

      return get(id);
    },
    list(offset) {
      return CampaignPage.parse({
        items: db
          .prepare(
            "SELECT id,title,purpose,created_at AS createdAt FROM campaigns ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?",
          )
          .all(CAMPAIGN_PAGE_SIZE, offset),
        total: Number(
          db.prepare("SELECT count(*) AS count FROM campaigns").get()?.count,
        ),
        offset,
        limit: CAMPAIGN_PAGE_SIZE,
      });
    },
    delete(id) {
      get(id);
      db.prepare("DELETE FROM campaigns WHERE id=?").run(id);
    },
  };
}

function fingerprint(input: unknown) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function insertMembers(
  db: DatabaseSync,
  id: string,
  parsed: ReturnType<typeof CampaignInput.parse>,
  base: ReturnType<typeof CaseFile.parse>,
) {
  parsed.members.forEach((member, position) => {
    const now = new Date().toISOString();

    const documents =
      base.purpose === "job_search"
        ? { ...base.documents, job: member.text, reviewedJobQuotes: [] }
        : {
            profile: member.text,
            job: base.documents.job,
            preferences: emptyPreferences,
          };

    const caseFile = CaseFile.parse({
      ...base,
      id: randomUUID(),
      title: member.title,
      revision: 1,
      createdAt: now,
      updatedAt: now,
      documents,
      tracking: undefined,
      offerSource: base.purpose === "job_search" ? null : base.offerSource,
    });

    db.prepare("INSERT INTO dossiers VALUES(?,?,?,?,?,?,?)").run(
      caseFile.id,
      caseFile.title,
      caseFile.purpose,
      1,
      now,
      now,
      JSON.stringify(caseFile),
    );
    db.prepare("INSERT INTO campaign_members VALUES(?,?,?)").run(
      id,
      caseFile.id,
      position,
    );
  });
}
