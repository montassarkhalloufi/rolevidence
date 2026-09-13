import type { BootstrapData } from "../../../shared/analysis.ts";
import type { ModelSelectionData } from "../../../shared/providers.ts";
import { NativeSelect } from "../../shared/ui/native-select.tsx";
import { workspaceFr as t } from "../../shared/i18n/workspace-fr.ts";

export function ProviderSelect({
  options,
  value,
  onChange,
  disabled,
}: {
  options: NonNullable<BootstrapData["providers"]>;
  value: ModelSelectionData;
  onChange: (value: ModelSelectionData) => void;
  disabled: boolean;
}) {
  return (
    <label className="block space-y-2 text-sm">
      {t.provider}
      <NativeSelect
        disabled={disabled}
        value={`${value.provider}:${value.model}`}
        onChange={(event) => {
          const selected = options.find(
            (option) =>
              `${option.provider}:${option.model}` === event.target.value,
          );

          if (selected) {
            onChange({ provider: selected.provider, model: selected.model });
          }
        }}
      >
        {options.map((option) => (
          <option
            key={`${option.provider}:${option.model}`}
            value={`${option.provider}:${option.model}`}
            disabled={!option.configured}
          >
            {option.provider} · {option.model}
            {option.configured ? "" : ` — ${t.unavailable}`}
          </option>
        ))}
      </NativeSelect>
      <span className="block text-xs text-muted-foreground">{t.recipient}</span>
    </label>
  );
}
