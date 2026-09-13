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
  salaryOpenMinimum:
    "Compatibilité possible, budget à confirmer : l’offre annonce un minimum, pas un plafond. Le montant souhaité n’est donc pas exclu, mais il n’est pas confirmé. La base brut/net et la part fixe restent aussi à vérifier si elles ne sont pas précisées.",
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

export const preferenceMessages = {
  salary: (amount: number) =>
    `Salaire minimum : ${amount} EUR brut annuel fixe, hors bonus.`,
  mode: (mode: "onsite" | "hybrid" | "remote") =>
    `Mode de travail : ${{ onsite: "présentiel", hybrid: "hybride", remote: "100 % télétravail" }[mode]}.`,
  remoteDays: (days: number) =>
    `Télétravail minimum : ${days} jours par semaine.`,
  salaryPriority: (priority: "required" | "preferred") =>
    `Priorité salaire : ${priority === "preferred" ? "souhait négociable" : "contrainte obligatoire"}.`,
  modePriority: (priority: "required" | "preferred") =>
    `Priorité mode de travail et jours : ${priority === "preferred" ? "souhait négociable" : "contrainte obligatoire"}.`,
  negotiable: (explanation: string) =>
    `Souhait négociable : cette préférence n’est pas une condition éliminatoire. Les modalités acceptables restent à discuter. ${explanation}`,
};

export const educationMessages = {
  incomplete:
    "Le passage décrit un cursus en cours ou un diplôme non obtenu. Il ne permet pas d’attribuer un niveau de diplôme achevé. La qualification effectivement obtenue reste à préciser.",
  declaredGap: (candidate: number, required: number) =>
    `Le diplôme présenté est interprété comme un niveau Bac+${candidate}, face à un niveau Bac+${required} demandé. Écart sur la formation déclarée ; l’acceptation d’une équivalence ou de l’expérience reste à confirmer. Cela n’établit ni l’absence d’un autre diplôme ni une décision de recrutement.`,
};
