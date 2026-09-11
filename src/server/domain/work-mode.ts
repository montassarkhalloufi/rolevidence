import type {
  DocumentsInput,
  Requirement,
  Relation,
  PreferencesInput,
} from "./models.ts";
import { preferencesText } from "./preferences.ts";
import { resolveQuote } from "./quotes.ts";
import { workModeMessages } from "./locales/fr.ts";

type WorkMode = NonNullable<PreferencesInput["workMode"]>;

const explicitModes: Record<string, WorkMode> = {
  hybride: "hybrid",
  présentiel: "onsite",
  "100 % télétravail": "remote",
  "100% télétravail": "remote",
  "full remote": "remote",
};

type WorkOffer = { modes: WorkMode[]; maximumRemoteDays: number | null };

function explicitOfferMode(quote: string): WorkOffer | null {
  const value =
    /^(?:[-*•]\s*)?(?:télétravail|mode de travail)\s*:\s*([^\n]+?)\.?$/iu
      .exec(quote.trim())?.[1]
      ?.toLocaleLowerCase("fr");

  if (!value) {
    return null;
  }

  const mode = explicitModes[value.trim()];

  if (mode) {
    return { modes: [mode], maximumRemoteDays: null };
  }

  if (value === "hybride ou 100 % télétravail au choix du candidat") {
    return { modes: ["hybrid", "remote"], maximumRemoteDays: null };
  }

  const days =
    /^hybride, ([0-5]) jours? de télétravail par semaine maximum$/u.exec(
      value,
    )?.[1];

  return days ? { modes: ["hybrid"], maximumRemoteDays: Number(days) } : null;
}

function compareMode(offered: WorkOffer, preferences?: PreferencesInput) {
  const desired = preferences?.workMode;

  if (!desired) {
    return {
      relation: "insufficient_information" as const,
      explanation: workModeMessages.missing,
    };
  }

  if (!offered.modes.includes(desired)) {
    return {
      relation: "contradiction" as const,
      explanation: workModeMessages.gap,
    };
  }

  if (
    desired === "hybrid" &&
    preferences?.remoteDaysPerWeek !== null &&
    preferences?.remoteDaysPerWeek !== undefined
  ) {
    return compareDays(
      offered.maximumRemoteDays,
      preferences.remoteDaysPerWeek,
    );
  }

  return {
    relation: "equivalence" as const,
    explanation: workModeMessages.match,
  };
}

export function compareExplicitWorkMode(
  requirement: Requirement,
  documents: DocumentsInput,
): Requirement {
  const jobQuote = resolveQuote(documents.job, requirement.jobQuote);

  const offered = jobQuote ? explicitOfferMode(jobQuote) : null;

  if (!offered) {
    return requirement;
  }

  const preferences = documents.preferences;

  const desired = preferences?.workMode;

  const preferencesQuote = desired
    ? preferencesText({ ...preferences, minimumAnnualSalary: null })
    : null;

  const comparison: { relation: Relation; explanation: string } = compareMode(
    offered,
    preferences,
  );

  return {
    ...requirement,
    subject: workModeMessages.subject,
    explanation: comparison.explanation,
    candidateSource: "preferences",
    candidateInformation: desired ? "provided" : "not_provided",
    profileQuote: null,
    preferencesQuote,
    jobQuote,
    experienceComparison: null,
    interpretation: {
      describedPractice: preferencesQuote,
      relation: comparison.relation,
      justification: comparison.explanation,
    },
  };
}

export function normalizeWorkModes(
  requirements: Requirement[],
  documents: DocumentsInput,
): Requirement[] {
  const seen = new Set<string>();

  const normalized: Requirement[] = [];

  for (const requirement of requirements) {
    const compared = compareExplicitWorkMode(requirement, documents);

    const key = compared.jobQuote;

    if (compared !== requirement && key) {
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
    }

    normalized.push(compared);
  }

  return normalized;
}

function compareDays(maximum: number | null, minimum: number) {
  if (maximum === null) {
    return {
      relation: "insufficient_information" as const,
      explanation: workModeMessages.days,
    };
  }

  return maximum < minimum
    ? {
        relation: "contradiction" as const,
        explanation: workModeMessages.daysBelow,
      }
    : {
        relation: "equivalence" as const,
        explanation: workModeMessages.daysCompatible,
      };
}
