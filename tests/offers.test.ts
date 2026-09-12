import test from "node:test";
import assert from "node:assert/strict";
import {
  publicUrl,
  isPublicAddress,
  publicAddresses,
} from "../src/server/infrastructure/offers/public-url.ts";
import { fetchPublicPage } from "../src/server/infrastructure/offers/fetch-page.ts";
import { extractJobText } from "../src/server/infrastructure/offers/html.ts";
import { createJobExtractor } from "../src/server/adapters/models/job-extraction.ts";

await test("public URL guard rejects credentials, protocols, ports and private address families", async () => {
  for (const value of [
    "file:///etc/passwd",
    "ftp://example.com",
    "https://user:pass@example.com",
    "http://example.com:8080",
  ]) {
    assert.throws(() => publicUrl(value));
  }

  for (const address of [
    "127.0.0.1",
    "10.1.1.1",
    "169.254.169.254",
    "192.168.1.1",
    "100.64.0.1",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
    "fe80::1",
    "0.0.0.0",
    "192.0.2.1",
  ]) {
    assert.equal(isPublicAddress(address), false, address);
  }

  assert.equal(isPublicAddress("8.8.8.8"), true);
  await assert.rejects(publicAddresses(new URL("http://127.0.0.1")), {
    code: "FORBIDDEN",
  });
  await assert.rejects(fetchPublicPage("http://127.0.0.1"), {
    code: "FORBIDDEN",
  });
});
await test("redirects are bounded and revalidated; inaccessible pages never become empty offers", async () => {
  let calls = 0;

  await assert.rejects(
    fetchPublicPage("https://example.com", async () => {
      calls++;

      return { status: 302, location: "https://example.com/again", html: "" };
    }),
    { code: "IMPORT_FAILED" },
  );
  assert.equal(calls, 4);
  await assert.rejects(
    fetchPublicPage("https://example.com", async () => ({
      status: 302,
      location: "file:///etc/passwd",
      html: "",
    })),
    { code: "INVALID_INPUT" },
  );
  await assert.rejects(
    fetchPublicPage("https://example.com", async () => ({
      status: 403,
      location: undefined,
      html: "blocked",
    })),
    { code: "IMPORT_FAILED" },
  );
});
await test("HTML extraction prefers JobPosting, strips scripts and rejects ambiguous job lists", () => {
  const job = {
    "@type": "JobPosting",
    title: "Backend Engineer",
    description: "<p>TypeScript et Node.js requis.</p>",
    baseSalary: "65000",
  };

  const html = `<script type="application/ld+json">${JSON.stringify(job)}</script><nav>Noise</nav>`;

  const text = extractJobText(html);

  assert.match(text, /65000/);
  assert.doesNotMatch(text, /EUR|annuel|Noise/);
  assert.match(
    extractJobText(
      "<main><h1>Développeur backend</h1><p>TypeScript et PostgreSQL en production.</p><script>steal()</script></main>",
    ),
    /PostgreSQL/,
  );
  assert.throws(
    () =>
      extractJobText(
        `<script type="application/ld+json">${JSON.stringify([job, job])}</script>`,
      ),
    { code: "IMPORT_FAILED" },
  );
});
await test("job extraction discards invented quotes independently of model schema", async () => {
  const extract = createJobExtractor(async () => ({
    value: {
      fields: [
        { name: "skills", value: "TypeScript", quote: "TypeScript requis." },
        { name: "salary", value: "65000 EUR", quote: "invented" },
      ],
    },
    metadata: {
      model: "fake",
      responseId: "fake",
      durationMs: 0,
      inputTokens: 0,
      outputTokens: 0,
    },
  }));

  const result = await extract("TypeScript requis.", {
    provider: "openai",
    model: "fake",
  });

  assert.equal(result.fields.length, 1);
  assert.equal(result.rejectedFields, 1);
});

await test("JobPosting technical metadata never becomes candidate criteria", () => {
  const text = extractJobText(
    `<script type="application/ld+json">${JSON.stringify({ "@type": "JobPosting", title: "Développeur TypeScript", description: "Notre entreprise conçoit des solutions. Vous devez écrire des tests unitaires.", datePosted: "2026-09-01", validThrough: "2026-12-01", identifier: { value: "tracking-id" }, hiringOrganization: { logo: "https://example.com/logo.png" }, baseSalary: "65000", experienceRequirements: "4 ans" })}</script>`,
  );

  assert.match(text, /tests unitaires/);
  assert.match(text, /4 ans/);
  assert.match(text, /65000/);
  assert.doesNotMatch(text, /datePosted|validThrough|tracking-id|logo.png/);
});
