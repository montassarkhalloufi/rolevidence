# Local operations

Use Node 24.15+ within Node 24.x. Run `npm ci`, copy `.env.example` to `.env`, configure a provider key locally, then `npm run build` and `npm start`. Open http://127.0.0.1:3001. Development uses `npm run dev` and port 5173. Restart after changing environment variables. No provider key is required for local dossiers, resume text extraction, backups or historical reports.

## Common problems

- Port already used: stop the previous Rolevidence process or configure a free PORT and, for development, align the Vite proxy. Do not terminate unrelated processes.
- Provider unavailable: verify local configuration and account usage. Never paste a secret in an issue. A deliberately new attempt may be billed; do not retry automatically after uncertain remote failure.
- Scanned CV: paste a readable text version. The local parser does not claim OCR support.
- Public URL inaccessible: paste the offer text. The importer does not bypass login or anti-bot restrictions.
- Invalid/incomplete output: review the error, simplify excessively fragmented inputs if needed and deliberately start a new attempt. Partial findings are not silently stored as a completed result.
- Stale revision: reopen the saved dossier before applying changes from another tab. The application does not silently merge concurrent drafts.

## Backup and recovery

The history panel exports the saved dossier, not unsaved edits. JSON includes documents and all included analysis snapshots. Restore from the home page creates a new copy and never calls a provider. Each explicit restoration creates another copy. Limits: 100 analyses, 8 MiB. Keep files private; they are not encrypted. Treat received backups as untrusted historical material, not authenticated evidence.

For a larger or whole-workspace backup, stop Rolevidence and copy DATABASE_PATH (default storage/rolevidence.sqlite). Stop the app before restoring the database file, preserve a copy of the current database, and use a release supporting its schema version. Avoid copying a database while it is being written. OS backups/snapshots are outside the application's deletion guarantee.

## Reports

Open an analysis in history and export HTML. The file includes classifications, original quotes, verification limits, model metadata and exact saved documents. Use the browser's Print / Save as PDF if needed. Never distribute it without reviewing its personal data. A restored report is not proof of source authenticity or actual candidate competence.

## Verification and support limits

Run `npm run quality` and `npm run test:browser`. Browser suites use fictional providers and local SQLite. Real OpenAI evaluations are separate paid runs in ignored artifacts. Anthropic and hosted LangSmith require their own keys and are not declared live-validated when those keys are absent.

The local desktop validation does not establish Windows compatibility or a complete assistive-technology audit. GitHub CI checks Linux. This application is local and unauthenticated; do not expose it as a multi-user web service.

## Upgrade to 0.4 and interrupted work

Stop the application and back up its SQLite file before upgrading. Schema 3 adds campaign/job tables without rewriting saved document payloads. Older versions reject the newer schema: downgrade by restoring the pre-upgrade database backup, not by changing PRAGMA user_version. Run one server process per database.

Closing a browser leaves accepted jobs running locally. Reopen the dossier to read current progress. A stopped server leaves interrupted work available for explicit resume; no startup model call is made. Resume uses the original documents/provider selection and completed checkpoints. Cancel/resume controls carry the observed attempt number to reject stale actions. A provider call interrupted before its response was saved can already be billed; explicit resumption can invoke that unfinished step again.

Campaign membership is a grouping of independent copies. Edits to a source dossier do not update members. Recruiter campaigns deliberately start with empty candidate preferences/clarifications. Review each member before analysis. Group deletion retains dossiers; dossier deletion removes its own analyses, jobs and membership. To preserve grouping and in-progress checkpoints, use a whole-database backup while stopped. Per-dossier JSON preserves tracking and completed results only.
