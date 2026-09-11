import type { Requirement } from "./models.ts";

const LOWER_BOUND_YEARS =
  /(?:\b\d+(?:[.,]\d+)?\s*\+\s*(?:ans?|years?)\b|\b(?:au moins|plus de|at least|more than)\s+\d+(?:[.,]\d+)?\s*(?:ans?|years?)\b)/iu;

export function hasIncomparableExperience(requirement: Requirement): boolean {
  const comparison = requirement.experienceComparison;

  if (comparison && !comparison.comparableScope) {
    return true;
  }

  if (requirement.interpretation.relation !== "contradiction") {
    return false;
  }

  // A declared lower bound cannot alone establish an upper bound below a minimum.
  // This guard detects duration notation, not skills or professional proficiency.
  return (
    comparison?.candidateDuration === "lower_bound" ||
    comparison?.candidateDuration === "unknown" ||
    LOWER_BOUND_YEARS.test(requirement.profileQuote ?? "")
  );
}
