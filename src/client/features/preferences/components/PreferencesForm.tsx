import { PreferencePriority } from "./PreferencePriority.tsx";
import { fr } from "../../../shared/i18n/fr.ts";
import { NativeSelect } from "../../../shared/ui/native-select.tsx";
import { Input } from "../../../shared/ui/input.tsx";
import type { PreferencesInput } from "../../../../shared/analysis.ts";

type Props = {
  value: PreferencesInput;
  disabled: boolean;
  onChange: (value: PreferencesInput) => void;
};

export function PreferencesForm({ value, disabled, onChange }: Props) {
  return (
    <fieldset
      className="my-4 min-w-0 border-t border-border py-5 [&>legend]:pr-3 [&>legend]:text-sm [&>legend]:font-semibold [&>legend>span]:ml-2 [&>legend>span]:text-xs [&>legend>span]:font-normal [&>legend>span]:text-muted-foreground [&>p]:mb-4 [&>p]:text-sm [&>p]:text-muted-foreground"
      disabled={disabled}
    >
      <legend>
        {fr.preferencesTitle}
        <span>{fr.optional}</span>
      </legend>
      <p>{fr.preferencesDescription}</p>
      <div className="grid gap-4 sm:grid-cols-2 [&>label]:flex [&>label]:min-w-0 [&>label]:flex-col [&>label]:gap-2 [&>label]:text-sm [&_small]:text-xs [&_small]:text-muted-foreground">
        <label htmlFor="salary">
          {fr.salaryLabel}
          <Input
            id="salary"
            type="number"
            min="1"
            max="1000000"
            step="1"
            placeholder="Ex. 60000"
            value={value.minimumAnnualSalary ?? ""}
            aria-describedby="salary-help"
            onChange={(event) =>
              onChange({
                ...value,
                minimumAnnualSalary:
                  event.target.value === "" ? null : event.target.valueAsNumber,
              })
            }
          />
          <small id="salary-help">{fr.salaryUnit}</small>
        </label>
        <label htmlFor="work-mode">
          {fr.workMode}
          <NativeSelect
            id="work-mode"
            value={value.workMode ?? ""}
            onChange={(event) => {
              const workMode = event.target.value as
                PreferencesInput["workMode"] | "";

              onChange({
                ...value,
                workMode: workMode || null,
                remoteDaysPerWeek:
                  workMode === "hybrid" ? value.remoteDaysPerWeek : null,
              });
            }}
          >
            <option value="">{fr.unspecified}</option>
            <option value="onsite">{fr.onsite}</option>
            <option value="hybrid">{fr.hybrid}</option>
            <option value="remote">{fr.remote}</option>
          </NativeSelect>
        </label>
        {value.workMode === "hybrid" && (
          <label htmlFor="remote-days">
            {fr.remoteDays}
            <NativeSelect
              id="remote-days"
              value={value.remoteDaysPerWeek ?? ""}
              onChange={(event) =>
                onChange({
                  ...value,
                  remoteDaysPerWeek: event.target.value
                    ? Number(event.target.value)
                    : null,
                })
              }
            >
              <option value="">{fr.unspecified}</option>
              {[1, 2, 3, 4].map((days) => (
                <option key={days} value={days}>
                  {days}
                  {fr.day}
                  {days > 1 ? "s" : ""}
                </option>
              ))}
            </NativeSelect>
          </label>
        )}
      </div>
      <PreferencePriorities value={value} onChange={onChange} />
    </fieldset>
  );
}

function PreferencePriorities({
  value,
  onChange,
}: Pick<Props, "value" | "onChange">) {
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 [&>label]:flex [&>label]:flex-col [&>label]:gap-2 [&>label]:text-sm">
      <PreferencePriority
        id="salary-priority"
        label={fr.salaryPriority}
        value={value.salaryPriority}
        onChange={(salaryPriority) => onChange({ ...value, salaryPriority })}
      />
      <PreferencePriority
        id="mode-priority"
        label={fr.workModePriority}
        value={value.workModePriority}
        onChange={(workModePriority) =>
          onChange({ ...value, workModePriority })
        }
      />
    </div>
  );
}
