import test from "node:test";
import assert from "node:assert/strict";
import { configureProviders } from "../src/server/infrastructure/providers.ts";
import {
  loadConfig,
  DEFAULT_OPENAI_MODEL,
  LEGACY_OPENAI_MODEL,
} from "../src/server/infrastructure/config.ts";

await test("new default preserves explicit legacy dossier selection without paid fallback", () => {
  const { providers } = configureProviders({
    ...loadConfig(),
    OPENAI_MODEL: DEFAULT_OPENAI_MODEL,
    OPENAI_API_KEY: undefined,
    ANTHROPIC_API_KEY: undefined,
    ROLEVIDENCE_TELEMETRY: false,
  });

  assert.equal(providers.options[0]?.model, "gpt-5.4");
  assert.equal(
    providers.options.filter(({ model }) => model === LEGACY_OPENAI_MODEL)
      .length,
    1,
  );
  assert.ok(
    providers.resolve(
      { provider: "openai", model: LEGACY_OPENAI_MODEL },
      false,
    ),
  );
  assert.throws(
    () =>
      providers.resolve({ provider: "openai", model: "unsupported" }, false),
    /pas pris en charge/,
  );
});
