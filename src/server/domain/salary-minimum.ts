const OPEN_MINIMUM =
  /^(?:[-*•]\s*)?(?:salaire|rémunération)\s*:\s*(?:minimum|au moins|à partir de|supérieur à)\s*\d+(?:[ .]\d{3})*\s*(?:EUR|€)\s+(?:(?:brut|net)\s+)?(?:par an|annuel)(?: fixe)?\.?$/iu;

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasOpenAnnualEuroMinimum(parsed: unknown) {
  if (!record(parsed) || parsed.currency !== "EUR" || !record(parsed.value)) {
    return false;
  }

  const value = parsed.value;

  return (
    value.unitText === "YEAR" &&
    typeof value.minValue === "number" &&
    Number.isFinite(value.minValue) &&
    value.minValue > 0 &&
    !("maxValue" in value)
  );
}

export function isOpenSalaryMinimum(quote: string): boolean {
  if (OPEN_MINIMUM.test(quote)) {
    return true;
  }

  if (!/^baseSalary\s*:/iu.test(quote)) {
    return false;
  }

  try {
    return hasOpenAnnualEuroMinimum(
      JSON.parse(quote.slice(quote.indexOf(":") + 1)) as unknown,
    );
  } catch {
    return false;
  }
}
