import type { Express } from "express";
import { z } from "zod";
import type { CampaignRepository } from "../../application/campaigns.ts";
import type { createJobRunner } from "../../application/jobs.ts";
import {
  AnalysisJob,
  CampaignInput,
  JobStart,
  JobResume,
} from "../../../shared/workflows.ts";
import { parseInput } from "./dossier-routes.ts";

export type WorkflowServices = {
  campaigns: CampaignRepository;
  jobs: ReturnType<typeof createJobRunner>;
};

export function registerWorkflowRoutes(
  app: Express,
  { campaigns, jobs }: WorkflowServices,
) {
  app.get("/api/v1/campaigns", (req, res) => {
    const offset = parseInput(
      z.coerce.number().int().min(0).max(100000).default(0),
      req.query.offset,
    );

    res.json(campaigns.list(offset));
  });
  app.put("/api/v1/campaigns/:id", (req, res) => {
    const id = parseInput(z.uuid(), req.params.id);

    res
      .status(201)
      .location(`/api/v1/campaigns/${id}`)
      .json(campaigns.create(id, parseInput(CampaignInput, req.body)));
  });
  app.get("/api/v1/campaigns/:id", (req, res) =>
    res.json(campaigns.get(parseInput(z.uuid(), req.params.id))),
  );
  app.delete("/api/v1/campaigns/:id", (req, res) => {
    campaigns.delete(parseInput(z.uuid(), req.params.id));
    res.json({ deleted: true });
  });
  app.put("/api/v1/analysis-jobs/:id", (req, res) => {
    const { dossierId, revision } = parseInput(JobStart, req.body);

    const job = jobs.start(
      parseInput(z.uuid(), req.params.id),
      dossierId,
      revision,
    );

    res
      .status(job.status === "completed" ? 200 : 202)
      .location(`/api/v1/analysis-jobs/${job.id}`)
      .json(AnalysisJob.parse(job));
  });
  app.get("/api/v1/analysis-jobs/:id", (req, res) =>
    res.json(AnalysisJob.parse(jobs.get(parseInput(z.uuid(), req.params.id)))),
  );
  app.get("/api/v1/dossiers/:id/latest-job", (req, res) => {
    const job = jobs.latest(parseInput(z.uuid(), req.params.id));

    res.json(job ? AnalysisJob.parse(job) : null);
  });
  app.post("/api/v1/analysis-jobs/:id/cancel", (req, res) => {
    const { attempt } = parseInput(JobResume, req.body);

    res.json(
      AnalysisJob.parse(
        jobs.cancel(parseInput(z.uuid(), req.params.id), attempt),
      ),
    );
  });
  app.post("/api/v1/analysis-jobs/:id/resume", (req, res) => {
    const { attempt } = parseInput(JobResume, req.body);

    res
      .status(202)
      .json(
        AnalysisJob.parse(
          jobs.resume(parseInput(z.uuid(), req.params.id), attempt),
        ),
      );
  });
}
