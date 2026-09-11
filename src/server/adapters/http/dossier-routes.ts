import type { Express } from "express";
import { z } from "zod";
import { DossierSave } from "../../../shared/dossiers.ts";
import type { DossierRepository } from "../../application/dossiers.ts";
import { AppError } from "../../application/errors.ts";

export function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    throw new AppError(
      "INVALID_INPUT",
      "Paramètres invalides. Vérifiez les champs saisis.",
    );
  }

  return parsed.data;
}

const Page = z.object({
  q: z.string().max(120).default(""),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export function registerDossierRoutes(
  app: Express,
  repository: DossierRepository,
) {
  const root = "/api/v1/dossiers";

  app.get(root, (req, res) => {
    const { q, offset, limit } = parseInput(Page, req.query);

    res.json(repository.list(q, offset, limit));
  });
  app.get(`${root}/:id`, (req, res) =>
    res.json(repository.get(parseInput(z.uuid(), req.params.id))),
  );
  app.put(`${root}/:id`, (req, res) => {
    const id = parseInput(z.uuid(), req.params.id);

    const { draft, revision } = parseInput(DossierSave, req.body);

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

    repository.delete(id, revision);
    res.json({ deleted: true });
  });
  app.get(`${root}/:id/analyses`, (req, res) => {
    const id = parseInput(z.uuid(), req.params.id);

    const { offset, limit } = parseInput(Page, req.query);

    res.json(repository.analyses(id, offset, limit));
  });
}
