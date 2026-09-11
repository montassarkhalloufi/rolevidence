import { createOpenAITransport } from "./infrastructure/openai-client.ts";
import { createAnalysisRequest } from "./adapters/openai/request.ts";
import { loadConfig } from "./infrastructure/config.ts";
import { createAnalysisService } from "./application/analyze.ts";
import { createOpenAIGateway } from "./adapters/openai/gateway.ts";
import { readExampleDocuments } from "./infrastructure/documents.ts";
import { createApp } from "./infrastructure/http/app.ts";

const config = loadConfig();

const service = createAnalysisService(
  config.OPENAI_MODEL,
  createOpenAIGateway(createOpenAITransport(config.OPENAI_API_KEY)),
  createAnalysisRequest,
);

const app = createApp({
  service,
  observe: (event) => console.log(JSON.stringify(event)),
  readDocuments: readExampleDocuments,
  model: config.OPENAI_MODEL,
  configured: Boolean(config.OPENAI_API_KEY),
});

const server = app.listen(config.PORT, "127.0.0.1", () =>
  console.log(`Rolevidence : http://127.0.0.1:${config.PORT}`),
);

server.on("error", () => {
  console.error("Serveur indisponible : vérifie notamment le port configuré.");
  process.exitCode = 1;
});
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.close());
}
