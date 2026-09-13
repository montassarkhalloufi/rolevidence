import type { PreferencesInput } from "./models.ts";
import { preferenceMessages } from "./locales/fr.ts";

export function preferencesText(preferences?: PreferencesInput): string {
  return preferences
    ? [...salaryLines(preferences), ...modeLines(preferences)].join("\n")
    : "";
}

function salaryLines(preferences: PreferencesInput) {
  if (preferences.minimumAnnualSalary === null) {
    return [];
  }

  return [
    preferenceMessages.salary(preferences.minimumAnnualSalary),
    ...(preferences.salaryPriority
      ? [preferenceMessages.salaryPriority(preferences.salaryPriority)]
      : []),
  ];
}

function modeLines(preferences: PreferencesInput) {
  if (preferences.workMode === null) {
    return [];
  }

  return [
    preferenceMessages.mode(preferences.workMode),
    ...(preferences.workMode === "hybrid" &&
    preferences.remoteDaysPerWeek !== null
      ? [preferenceMessages.remoteDays(preferences.remoteDaysPerWeek)]
      : []),
    ...(preferences.workModePriority
      ? [preferenceMessages.modePriority(preferences.workModePriority)]
      : []),
  ];
}
