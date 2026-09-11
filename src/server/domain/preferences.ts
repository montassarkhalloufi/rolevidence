import type { PreferencesInput } from "./models.ts";

export function preferencesText(preferences?: PreferencesInput): string {
  if (!preferences) {
    return "";
  }

  const lines: string[] = [];

  if (preferences.minimumAnnualSalary !== null) {
    lines.push(
      `Salaire minimum : ${preferences.minimumAnnualSalary} EUR brut annuel fixe, hors bonus.`,
    );
  }

  if (preferences.workMode !== null) {
    lines.push(
      `Mode de travail : ${{ onsite: "présentiel", hybrid: "hybride", remote: "100 % télétravail" }[preferences.workMode]}.`,
    );
  }

  if (
    preferences.workMode === "hybrid" &&
    preferences.remoteDaysPerWeek !== null
  ) {
    lines.push(
      `Télétravail minimum : ${preferences.remoteDaysPerWeek} jours par semaine.`,
    );
  }

  return lines.join("\n");
}
