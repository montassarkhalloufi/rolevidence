import { NativeSelect } from "../../../shared/ui/native-select.tsx";
import { fr } from "../../../shared/i18n/fr.ts";

type Priority = "required" | "preferred";

export function PreferencePriority({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: Priority | undefined;
  onChange: (value: Priority) => void;
}) {
  return (
    <label htmlFor={id}>
      {label}
      <NativeSelect
        id={id}
        value={value ?? "required"}
        onChange={(event) =>
          onChange(
            event.target.value === "preferred" ? "preferred" : "required",
          )
        }
      >
        <option value="required">{fr.requiredPreference}</option>
        <option value="preferred">{fr.preferredPreference}</option>
      </NativeSelect>
    </label>
  );
}
