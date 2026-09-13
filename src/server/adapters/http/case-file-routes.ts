import { errorMessages } from "../../application/locales/errors-fr.ts";
import {
  SEARCH_MAX_CHARACTERS,
  PAGE_MAX_OFFSET,
  PAGE_MAX_SIZE,
  CASE_FILE_PAGE_SIZE,
} from "../../../shared/limits.ts";
import type { Express } from "express";
import { z } from "zod";
import { CaseFileSave, Backup } from "../../../shared/case-files.ts";
import type { CaseFileRepository } from "../../application/case-files.ts";
import { AppError } from "../../application/errors.ts";
import { parseInput } from "./input.ts";

const Page = z.object({
  q: z.string().max(SEARCH_MAX_CHARACTERS).default(""),
  offset: z.coerce.number().int().min(0).max(PAGE_MAX_OFFSET).default(0),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGE_MAX_SIZE)
    .default(CASE_FILE_PAGE_SIZE),
});

export function registerCaseFileRoutes(
  app: Express,
  repository: CaseFileRepository,
  onDelete?: (id: string) => void,
) {
  const root = "/api/v1/dossiers";

  app.post(`${root}/restore`, (req, res) => {
    const restored = repository.restore(parseInput(Backup, req.body));

    res.status(201).location(`${root}/${restored.id}`).json(restored);
  });

  app.get(`${root}/:id/backup`, (req, res) =>
    res.json(repository.backup(parseInput(z.uuid(), req.params.id))),
  );

  app.get(root, (req, res) => {
    const { q, offset, limit } = parseInput(Page, req.query);

    res.json(repository.list(q, offset, limit));
  });

  app.get(`${root}/:id`, (req, res) =>
    res.json(repository.get(parseInput(z.uuid(), req.params.id))),
  );

  app.put(`${root}/:id`, (req, res) => {
    const id = parseInput(z.uuid(), req.params.id);

    const { draft, revision } = parseInput(CaseFileSave, req.body);

    const result = repository.save(id, draft, revision);

    res
      .status(revision === 0 ? 201 : 200)
      .location(`${root}/${id}`)
      .json(result);
  });

  app.delete(`${root}/:id`, (req, res) => {
    const id = parseInput(z.uuid(), req.params.id);

    const { revision } = parseInput(
      z.object({ revision: z.number().int().positive() }).strict(),
      req.body,
    );

    if (repository.get(id).revision !== revision) {
      throw new AppError("IDEMPOTENCY_CONFLICT", errorMessages.staleDeletion);
    }

    onDelete?.(id);

    repository.delete(id, revision);

    res.json({ deleted: true });
  });

  app.get(`${root}/:id/analyses`, (req, res) => {
    const id = parseInput(z.uuid(), req.params.id);

    const { offset, limit } = parseInput(Page, req.query);

    res.json(repository.analyses(id, offset, limit));
  });
}
