// Conservative signatures of response-manipulation instructions. This reduces
// a known attack surface; it is not a complete prompt-injection detector.
const RESPONSE_DIRECTIVES = [
  /\b(?:ignore|oublie|disregard)\b.{0,120}\b(?:instructions|consignes|rules)\b/iu,
  /\b(?:affirme|prétends|claim|pretend)\b.{0,100}\b(?:maîtrise|compétence|experience|expert|proficien)\w*/iu,
  /\b(?:fabrique|invente|fabricate|invent)\b.{0,80}\b(?:citation|quote|preuve|evidence)\b/iu,
];

export function isResponseDirective(text: string): boolean {
  const normalized = text.normalize("NFKC").replace(/\s+/gu, " ");

  return RESPONSE_DIRECTIVES.some((pattern) => pattern.test(normalized));
}
