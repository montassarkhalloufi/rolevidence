# ADR 0006 — Campaigns, human tracking and explicit resumable analysis

Status: Accepted · 2026-09-12

## Context

Users need one profile against several offers, or one offer against several profiles. Long comparisons must show actual progress, survive a closed browser and recover from interruption without silently repeating paid work. Human interview notes must not become model evidence.

## Decision

Keep a modular monolith and the existing provider port. A campaign creates two to ten independent dossier copies in a single SQLite transaction. Job-search campaigns copy the profile, clarifications and preferences; recruitment campaigns copy the offer and reset candidate-specific preferences, clarifications and tracking. Source edits never propagate implicitly. Each dossier remains independently editable, analysable, exportable and deletable. A comparison view displays original findings and evidence side by side; it does not assume that similarly named criteria from different offers are equivalent or calculate a ranking.

Campaign PUT uses a caller-generated UUID and a fingerprint of validated input: identical requests reopen the existing campaign; changed input conflicts. Campaign deletion removes grouping only. Member deletion removes its membership through foreign keys; the remaining members survive. Collection reads are paginated. The fingerprint retains no duplicate candidate text.

Human status, notes, interview preparation and interview account are optional dossier fields. Saves and snapshots preserve them; only `documents` enter the model port. These fields are not CV evidence and never silently become clarifications.

Saved dossier analyses use durable local job resources. Starting a UUID again with the same dossier/revision replays its state. Changed identity conflicts. Resume and cancel require the observed attempt number; stale controls cannot affect a later attempt. One durable job executes at a time; the shared provider transport also rejects overlapping model calls. There is no background queue or automatic paid retry. Campaign members are launched individually and may be inspected while another is running.

The fixed pipeline reports preparation, comparison batch counts and result persistence. After each validated provider response, a checkpoint is persisted before continuing. Resume replays saved responses through the current request schema, then calls only remaining steps. Input snapshot, selection, pipeline version, request name and prompt version constrain reuse. Incompatible checkpoints require a new explicit analysis. This finite pipeline does not need LangGraph or an agent loop.

A stopped process marks unfinished jobs interrupted on reopening, without contacting providers. Graceful shutdown aborts the transport and drains checkpoint handling before closing SQLite. Completed stages survive; an in-flight provider call may already have been charged even if no checkpoint exists. Explicit resume may repeat that uncertain call. Cancellation is best effort and cannot undo billing. Result append uses the job ID for persistent deduplication, including after a lost storage acknowledgement.

## Consequences and verification

SQLite schema migrations preserve v0.3 dossiers/history. Job checkpoints contain private model responses and remain local; completed jobs discard checkpoints. Dossier deletion cascades through jobs. Portable dossier backups preserve tracking and completed analyses, but not campaign grouping or unfinished checkpoints; stopped-server database backup preserves the whole workspace. Run one application process per database.

Tests cover source isolation in both campaign directions, transactional failure/replay, immutable snapshots, cancellation, stale attempt rejection, restart recovery, schema/version rejection, no repeated completed model calls, lost storage acknowledgement, source privacy and API/browser journeys. Real provider cancellation and billing behavior cannot be established by fake transport tests. Existing semantic checks remain necessary: resumability does not prove model accuracy.
