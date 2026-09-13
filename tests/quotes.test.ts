import test from "node:test";
import assert from "node:assert/strict";
import { resolveQuote } from "../src/server/domain/quotes.ts";
import { classifyRequirements } from "../src/server/domain/classify.ts";

await test("PDF quotations tolerate whitespace, line breaks and typographic quotation marks", () => {
  const source =
    "Stack : TypeScript, Node.js,\nPostgreSQL.\nDéveloppement d’applications.";

  assert.equal(
    resolveQuote(source, '"Stack : TypeScript, Node.js, PostgreSQL."'),
    "Stack : TypeScript, Node.js,\nPostgreSQL.",
  );
  assert.equal(
    resolveQuote(source, "Développement d'applications."),
    "Développement d’applications.",
  );
  assert.equal(
    resolveQuote("Node.js\u00a0et\u202fTypeScript", "Node.js et TypeScript"),
    "Node.js\u00a0et\u202fTypeScript",
  );
});
await test("Reject quotations that invent technologies, omit negations or join separate passages", () => {
  assert.equal(
    resolveQuote("Node.js et TypeScript", "Java et TypeScript"),
    null,
  );
  assert.equal(
    resolveQuote("Je ne maîtrise pas Java.", "Je maîtrise Java."),
    null,
  );
  assert.equal(
    resolveQuote("TypeScript. Aucun Java. Node.js.", "TypeScript. Node.js."),
    null,
  );
});
await test("A match survives PDF quotation reformatting", () => {
  const result = classifyRequirements(
    {
      requirements: [
        {
          subject: "TypeScript",
          explanation: "Utilisation déclarée.",
          interpretation: {
            describedPractice: "TypeScript déclaré",
            relation: "equivalence",
            justification: "Utilisation déclarée",
          },
          candidateInformation: "provided",
          candidateSource: "profile",
          profileQuote: "Stack : TypeScript, Node.js, PostgreSQL.",
          jobQuote: "TypeScript requis.",
          preferencesQuote: null,
        },
      ],
    },
    {
      profile: "Stack : TypeScript, Node.js,\nPostgreSQL.",
      job: "TypeScript requis.",
    },
  );

  assert.equal(result.matches.length, 1);
  assert.equal(result.needsReview.length, 0);
  assert.match(result.matches[0]?.profileQuote ?? "", /\n/);
});
