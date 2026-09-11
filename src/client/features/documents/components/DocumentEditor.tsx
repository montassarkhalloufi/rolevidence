import { Alert } from "../../../shared/ui/alert.tsx";
import { DOCUMENT_MAX_CHARACTERS } from "../../../../shared/limits.ts";
import { fr } from "../../../shared/i18n/fr.ts";
import { Input } from "../../../shared/ui/input.tsx";
import { Textarea } from "../../../shared/ui/textarea.tsx";
import { Button } from "../../../shared/ui/button.tsx";
import { useRef } from "react";
import { useDocumentEditor } from "../hooks/useDocumentEditor.ts";
import type { DocumentsInput } from "../../../../shared/analysis.ts";

type Props = {
  documents: DocumentsInput;
  disabled: boolean;
  onChange: (value: DocumentsInput) => void;
  onReset: () => void;
  onImporting: (value: boolean) => void;
};

export function DocumentEditor({
  documents,
  disabled,
  onChange,
  onReset,
  onImporting,
}: Props) {
  const input = useRef<HTMLInputElement>(null);

  const { active, setActive, notice, setNotice, error, setError, importFile } =
    useDocumentEditor(documents, onChange, onImporting);

  return (
    <>
      <DocumentSwitch active={active} onChange={setActive} />
      {active === "profile" && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed border-input bg-muted p-4 [&_strong]:text-sm [&_p]:mt-1 [&_p]:text-xs [&_p]:text-muted-foreground">
          <div>
            <strong>{fr.uploadTitle}</strong>
            <p>{fr.uploadFormats}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => input.current?.click()}
          >
            {fr.upload}
          </Button>
          <Input
            ref={input}
            hidden
            type="file"
            accept=".pdf,.docx,.txt"
            aria-label={fr.chooseResume}
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                void importFile(file);
              }

              event.target.value = "";
            }}
          />
        </div>
      )}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <label htmlFor="document">
          {active === "profile" ? fr.profileEditor : fr.jobEditor}
        </label>
        <span>{documents[active].length.toLocaleString("fr-FR")} / 16 000</span>
      </div>
      <Textarea
        id="document"
        className="h-80 font-mono text-base leading-relaxed sm:text-sm"
        spellCheck={false}
        disabled={disabled}
        maxLength={DOCUMENT_MAX_CHARACTERS}
        value={documents[active]}
        onChange={(event) =>
          onChange({ ...documents, [active]: event.target.value })
        }
      />
      <div className="my-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground [&>span]:min-w-0 [&>span]:break-words">
        <span role="status">{notice}</span>
        <Button
          type="button"
          disabled={disabled}
          variant="ghost"
          size="sm"
          onClick={() => {
            onReset();
            setError("");
            setNotice(fr.exampleReset);
          }}
        >
          {fr.reset}
        </Button>
      </div>
      {error && (
        <Alert asChild>
          <p role="alert">{error}</p>
        </Alert>
      )}
    </>
  );
}

function DocumentSwitch({
  active,
  onChange,
}: {
  active: "profile" | "job";
  onChange: (value: "profile" | "job") => void;
}) {
  return (
    <div
      className="mb-4 flex overflow-hidden rounded-md border border-border bg-muted"
      aria-label={fr.chooseDocument}
    >
      <Button
        variant="toggle"
        className="flex-1"
        type="button"
        aria-pressed={active === "profile"}
        onClick={() => onChange("profile")}
      >
        ♙ <span>{fr.candidate}</span>
      </Button>
      <Button
        variant="toggle"
        className="flex-1"
        type="button"
        aria-pressed={active === "job"}
        onClick={() => onChange("job")}
      >
        ▤ <span>{fr.jobOffer}</span>
      </Button>
    </div>
  );
}
