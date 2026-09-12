import { afterEach, test } from "vitest";
import assert from "node:assert/strict";
import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useState } from "react";
import { PreferencesForm } from "../../src/client/features/preferences/components/PreferencesForm.tsx";
import { EvidenceCard } from "../../src/client/features/analysis/components/EvidenceCard.tsx";
import type { PreferencesInput } from "../../src/shared/analysis.ts";

afterEach(cleanup);

function Form() {
  const [value, setValue] = useState<PreferencesInput>({
    minimumAnnualSalary: 60000,
    workMode: "hybrid",
    remoteDaysPerWeek: 3,
  });

  return (
    <>
      <PreferencesForm value={value} disabled={false} onChange={setValue} />
      <output aria-label="Priorités">{JSON.stringify(value)}</output>
    </>
  );
}

test("users explicitly choose negotiable preferences without losing their desired amount or days", async () => {
  render(<Form />);
  await userEvent.selectOptions(
    screen.getByLabelText("Importance du salaire souhaité"),
    "preferred",
  );
  await userEvent.selectOptions(
    screen.getByLabelText("Importance du mode et des jours de télétravail"),
    "preferred",
  );
  const value = JSON.parse(
    screen.getByLabelText("Priorités").textContent ?? "{}",
  ) as PreferencesInput;

  assert.equal(value.minimumAnnualSalary, 60000);
  assert.equal(value.remoteDaysPerWeek, 3);
  assert.equal(value.salaryPriority, "preferred");
  assert.equal(value.workModePriority, "preferred");
});

test("the visible summary explains uncertainty and displays the qualified status", () => {
  render(
    <EvidenceCard
      group={{ tone: "neutral", symbol: "?", singular: "Inconnue" }}
      finding={{
        subject: "Salaire",
        explanation: "baseSalary",
        assessment: "possible_compatibility",
        interpretation: {
          relation: "insufficient_information",
          describedPractice: "Minimum souhaité",
          justification:
            "Le minimum annoncé ne prouve pas un plafond. Budget à confirmer.",
        },
        evidenceState: "insufficient_information",
        verification: null,
        profileQuote: null,
        jobQuote: "Minimum 35000 EUR",
        preferencesQuote: "60000 EUR souhaités",
      }}
    />,
  );
  assert.ok(screen.getByText("Budget à confirmer"));
  assert.ok(
    screen.getByText(
      "Le minimum annoncé ne prouve pas un plafond. Budget à confirmer.",
    ),
  );
});
