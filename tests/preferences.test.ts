import test from "node:test";
import assert from "node:assert/strict";
import { Documents, emptyPreferences } from "../src/shared/analysis.ts";
import { createAnalysisRequest } from "../src/server/adapters/openai/request.ts";

await test("Preferences validate missing values, bounds and remote-work consistency", () => {
  const base = { profile: "CV fictif", job: "Offre fictive" };

  assert.equal(Documents.safeParse(base).success, true);
  assert.equal(
    Documents.safeParse({ ...base, preferences: emptyPreferences }).success,
    true,
  );
  for (const minimumAnnualSalary of [-1, 0, 60000.5, 1000001]) {
    assert.equal(
      Documents.safeParse({
        ...base,
        preferences: { ...emptyPreferences, minimumAnnualSalary },
      }).success,
      false,
    );
  }

  assert.equal(
    Documents.safeParse({
      ...base,
      preferences: {
        ...emptyPreferences,
        workMode: "remote",
        remoteDaysPerWeek: 2,
      },
    }).success,
    false,
  );
  assert.equal(
    Documents.safeParse({
      ...base,
      preferences: {
        ...emptyPreferences,
        workMode: "hybrid",
        remoteDaysPerWeek: 5,
      },
    }).success,
    false,
  );
});

await test("Preview keeps the CV, job and preferences separate without a model call", () => {
  const preferences = {
    minimumAnnualSalary: 60000,
    workMode: "hybrid" as const,
    remoteDaysPerWeek: 2,
  };

  const request = createAnalysisRequest(
    { profile: "CV fictif", job: "Offre fictive", preferences },
    "test",
  );

  const message = request.input[1];

  assert.ok(message);
  const payload = JSON.parse(message.content);

  assert.deepEqual(payload.preferences, preferences);
  assert.deepEqual(payload.profile, [{ id: "P1", text: "CV fictif" }]);
  assert.deepEqual(payload.job, [{ id: "J1", text: "Offre fictive" }]);
  const omitted = createAnalysisRequest(
    { profile: "CV", job: "Offre" },
    "test",
  );

  const omittedMessage = omitted.input[1];

  assert.ok(omittedMessage);
  assert.deepEqual(
    JSON.parse(omittedMessage.content).preferences,
    emptyPreferences,
  );
});
