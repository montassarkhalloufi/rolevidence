import { errorMessages } from "../../application/locales/errors-fr.ts";
import { AppError } from "../../application/errors.ts";

function corruptedString(value: string) {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);

    return (
      (code < 32 && ![9, 10, 13].includes(code)) ||
      code === 127 ||
      code === 65533
    );
  });
}

export function assertOutputIntegrity(value: unknown): void {
  if (typeof value === "string" && corruptedString(value)) {
    throw new AppError("INVALID_OUTPUT", errorMessages.corruptModelOutput);
  }

  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      assertOutputIntegrity(key);
      assertOutputIntegrity(child);
    }
  }
}
