import { configureProviders } from "./infrastructure/providers.ts";
import { openDatabase } from "./infrastructure/persistence/database.ts";
import { createDossierRepository } from "./infrastructure/persistence/dossiers.ts";
import { loadConfig } from "./infrastructure/config.ts";
import { readExampleDocuments } from "./infrastructure/documents.ts";
import { createApp } from "./infrastructure/http/app.ts";

const config = loadConfig();

const { providers, extractOffer, fallback } = configureProviders(config);

if (!fallback) {
  throw new Error("No provider adapters available");
}

const database = openDatabase(config.DATABASE_PATH);

const dossiers = createDossierRepository(database);

const app = createApp({
  service: fallback,
  providers,
  extractOffer,
  dossiers,
  observe: (event) => console.log(JSON.stringify(event)),
  readDocuments: readExampleDocuments,
  model: config.OPENAI_MODEL,
  configured: providers.options.some((option) => option.configured),
});

const server = app.listen(config.PORT, "127.0.0.1", () =>
  console.log(`Rolevidence : http://127.0.0.1:${config.PORT}`),
);

server.on("error", () => {
  console.error("Serveur indisponible : vérifie notamment le port configuré.");
  process.exitCode = 1;
});
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.close(() => database.close()));
}
