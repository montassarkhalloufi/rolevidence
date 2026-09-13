export const schemaMessages = {
  describedPracticeDescription:
    "Pratique réellement décrite dans la source, sans inventer d'expérience.",
  justificationDescription:
    "Explique pourquoi la pratique répond ou non à cette exigence précise, en distinguant niveau et contexte.",
  profileQuoteDescription: "Citation exacte ou null si absente.",
  preferencesQuoteDescription:
    "Valeur des préférences utilisée, ou null. Jamais une citation du CV.",
  jobQuoteDescription: "Citation exacte ou null si absente.",
  subjectDescription:
    "Libellé en français. Une exigence atomique, une technologie par ligne.",
  profileEvidenceIdDescription:
    "Select the exact supporting profile passage, or null. Never invent a quote.",
  profileEvidenceQuoteDescription:
    "Court extrait EXACT et contigu du CV qui soutient cette exigence précise. Copier sans ellipse ni reformulation. Null si aucune preuve candidate. Un extrait sur l'ancienneté générale ne soutient pas une technologie.",
  jobEvidenceIdDescription:
    "Select the entire original job passage, including a shared technology list. Required for every requirement.",
  educationComparisonDescription:
    "Only for formal education criteria. Interpret the highest COMPLETED relevant qualification explicitly presented, using the education system and country when known. Recognized licence/LMD may mean Bac+3; never infer a completed degree from dates alone, attendance or an incomplete course. Use uncertain for ambiguous foreign credentials/equivalence. Do not infer this is the candidate's maximum possible education. Null for non-education criteria or missing qualification.",
  experienceComparisonDescription:
    "Required for duration requirements. A plus sign or at least means lower_bound, never exact. Null for other criteria.",
  comparableScopeDescription:
    "True only when both durations measure the same kind of experience; fullstack total is not backend duration.",
  hybridDaysOnly:
    "Les jours de télétravail concernent uniquement le mode hybride.",
} as const;
