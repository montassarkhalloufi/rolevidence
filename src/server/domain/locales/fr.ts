export const workModeMessages = {
  subject: "Mode de travail",
  daysBelow:
    "Le nombre maximal de jours de télétravail proposé est inférieur au minimum souhaité.",
  daysCompatible:
    "Le mode hybride et le nombre de jours proposés permettent le minimum de télétravail souhaité.",
  missing:
    "La préférence de mode de travail n’est pas renseignée. Elle est à préciser indépendamment du CV.",
  match: "Le mode de travail proposé correspond à la préférence renseignée.",
  gap: "Le mode de travail proposé ne correspond pas à la préférence renseignée.",
  days: "Le mode hybride correspond, mais l’offre ne précise pas le nombre de jours de télétravail requis par la préférence.",
};

export const numericMessages = {
  salaryPreferenceMissing:
    "Le salaire souhaité n’est pas renseigné dans les préférences ; la compatibilité reste à préciser.",
  salaryUncertain:
    "La rémunération ne permet pas une comparaison certaine en EUR brut annuel fixe : préciser le montant, la devise, la période et la part fixe hors bonus.",
  salaryBelow:
    "Le maximum fixe annuel brut annoncé est inférieur au minimum souhaité.",
  salaryCompatible:
    "Le montant ou la fourchette fixe annuelle brute permet le minimum souhaité, sans garantir le salaire qui sera proposé.",
  durationUncertain:
    "La citation ne permet pas de comparer directement une durée backend au minimum demandé. Une ancienneté fullstack ou des périodes de poste ne prouvent pas, à elles seules, cette durée backend.",
  durationLowerBound:
    "La durée citée est une borne inférieure : elle ne permet pas d’affirmer que le minimum demandé n’est pas atteint.",
  durationBelow:
    "La durée backend explicitement déclarée est inférieure au minimum backend demandé.",
  durationCompatible:
    "La durée backend explicitement déclarée atteint le minimum backend demandé.",
};

export const evidenceMessages = {
  directive:
    "Le passage cité contient une instruction visant à manipuler la réponse, pas une preuve de compétence. Cette conclusion reste à confirmer.",
  unsupportedContradiction:
    "La citation ne contient pas de fait négatif explicite permettant d’affirmer cet écart. Le niveau ou le contexte demandé reste à confirmer.",
};
