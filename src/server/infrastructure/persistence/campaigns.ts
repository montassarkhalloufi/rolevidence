import { emptyPreferences } from "../../../shared/analysis.ts";
import { randomUUID, createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import {
  Campaign,
  CampaignPage,
  CampaignInput,
} from "../../../shared/workflows.ts";
import type { CampaignRepository } from "../../application/campaigns.ts";
import type { DossierRepository } from "../../application/dossiers.ts";
import { Dossier } from "../../../shared/dossiers.ts";
import { AppError } from "../../application/errors.ts";

export function createCampaignRepository(
  db: DatabaseSync,
  dossiers: DossierRepository,
): CampaignRepository {
  function get(id: string) {
    const row = db
      .prepare(
        "SELECT id,title,purpose,created_at AS createdAt FROM campaigns WHERE id=?",
      )
      .get(id);

    if (!row) {
      throw new AppError("NOT_FOUND", "Campagne introuvable.");
    }

    const members = db
      .prepare(
        "SELECT dossier_id FROM campaign_members WHERE campaign_id=? ORDER BY position",
      )
      .all(id)
      .map((member) => {
        const dossier = dossiers.get(String(member.dossier_id));

        return {
          dossier,
          latest: dossiers.analyses(dossier.id, 0, 1).items[0] ?? null,
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
            "Cette demande correspond à une autre campagne.",
          );
        }

        return get(id);
      }

      const base = dossiers.get(parsed.baseId);

      if (base.revision !== parsed.baseRevision) {
        throw new AppError(
          "IDEMPOTENCY_CONFLICT",
          "Le dossier source a changé. Rouvrez-le.",
        );
      }

      const sharedText =
        base.purpose === "job_search"
          ? base.documents.profile
          : base.documents.job;

      if (!sharedText.trim()) {
        throw new AppError(
          "INVALID_INPUT",
          "Complétez le document commun avant de créer une campagne.",
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
            "SELECT id,title,purpose,created_at AS createdAt FROM campaigns ORDER BY created_at DESC,id DESC LIMIT 20 OFFSET ?",
          )
          .all(offset),
        total: Number(
          db.prepare("SELECT count(*) AS count FROM campaigns").get()?.count,
        ),
        offset,
        limit: 20,
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
  base: ReturnType<typeof Dossier.parse>,
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

    const dossier = Dossier.parse({
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
      dossier.id,
      dossier.title,
      dossier.purpose,
      1,
      now,
      now,
      JSON.stringify(dossier),
    );
    db.prepare("INSERT INTO campaign_members VALUES(?,?,?)").run(
      id,
      dossier.id,
      position,
    );
  });
}
