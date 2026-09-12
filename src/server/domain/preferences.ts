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

  const lines = [
    `Salaire minimum : ${preferences.minimumAnnualSalary} EUR brut annuel fixe, hors bonus.`,
  ];

  if (preferences.salaryPriority) {
    lines.push(preferenceMessages.salaryPriority(preferences.salaryPriority));
  }

  return lines;
}

function modeLines(preferences: PreferencesInput) {
  if (preferences.workMode === null) {
    return [];
  }

  const lines = [
    `Mode de travail : ${{ onsite: "présentiel", hybrid: "hybride", remote: "100 % télétravail" }[preferences.workMode]}.`,
  ];

  if (
    preferences.workMode === "hybrid" &&
    preferences.remoteDaysPerWeek !== null
  ) {
    lines.push(
      `Télétravail minimum : ${preferences.remoteDaysPerWeek} jours par semaine.`,
    );
  }

  if (preferences.workModePriority) {
    lines.push(preferenceMessages.modePriority(preferences.workModePriority));
  }

  return lines;
}
