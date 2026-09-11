# Security and privacy

## Supported deployment

The application is an unauthenticated, single-user local application. Keep the server on loopback. Public hosting, shared access and reverse proxies are outside the supported configuration.

The API key belongs in `.env`, never in client code, screenshots or issue reports. Analysis sends input texts and preferences to the selected provider; local parsing and request preview do not call the provider. `store: false` is not a promise of zero provider retention.

Uploads have size/time limits and run in a parser worker. This worker is not an operating-system security sandbox. Do not import untrusted files without considering this boundary. The analysis model has no tool access.

## Reporting

Do not post credentials, personal CVs or exploit details in a public issue. Use the repository's private vulnerability reporting channel when enabled. If unavailable, open a minimal issue requesting a private contact channel without sensitive details.

Provide the release version, operating system, affected component and a minimal fictional reproduction. Rotate any exposed credentials through the provider; removing a file from the current tree does not remove it from Git history.

## Data and traces

Runtime artifacts, uploads, local databases and secrets are excluded by `.gitignore`. Ignore rules are not a substitute for reviewing staged files. The UI explicitly saves dossiers in unencrypted local SQLite. Deletion cascades to stored analyses but does not erase backups or short-lived idempotency entries. Evaluation traces contain document text and must use fictional fixtures only.

Public URL imports reject private/special addresses, credential-bearing URLs and custom ports; every redirect is revalidated and connections pin validated DNS addresses. No cookies or scripts are executed. Optional LangSmith telemetry contains only allowlisted technical metrics, never source documents or raw error messages.
