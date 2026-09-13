import { DOCUMENT_MAX_CHARACTERS } from "../../../shared/limits.ts";
import { useOfferImport } from "./useOfferImport.ts";
import type { ModelSelectionData } from "../../../shared/providers.ts";
import type { OfferSourceData } from "../../../shared/case-files.ts";
import { workspaceFr as t } from "../../shared/i18n/workspace-fr.ts";
import { Input } from "../../shared/ui/input.tsx";
import { Textarea } from "../../shared/ui/textarea.tsx";
import { Button } from "../../shared/ui/button.tsx";
import { Card } from "../../shared/ui/card.tsx";

export function OfferImport({
  selection,
  disabled,
  onAdopt,
  onBusy,
}: {
  selection: ModelSelectionData;
  disabled: boolean;
  onBusy: (value: boolean) => void;
  onAdopt: (source: OfferSourceData, text: string) => void;
}) {
  const { url, setUrl, preview, setPreview, text, setText, reset, mutation } =
    useOfferImport(selection, onBusy);

  return (
    <Card>
      <details>
        <summary className="font-semibold text-primary">{t.url}</summary>
        <p className="my-3 text-sm text-muted-foreground">{t.importHelp}</p>
        <label className="block space-y-2">
          {t.url}
          <Input
            type="url"
            value={url}
            disabled={mutation.isPending}
            onChange={(event) => setUrl(event.target.value)}
            maxLength={2048}
          />
        </label>
        <Button
          className="my-3"
          disabled={disabled || mutation.isPending || !url.trim()}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? t.importing : t.import}
        </Button>
        {mutation.error && (
          <div role="alert">
            <p>{mutation.error.message}</p>
            <Button variant="outline" onClick={reset}>
              {t.newRequest}
            </Button>
          </div>
        )}
        <OfferPreview
          preview={preview}
          setPreview={setPreview}
          text={text}
          setText={setText}
          rejected={mutation.data?.rejectedFields ?? 0}
          disabled={disabled}
          onAdopt={onAdopt}
        />
      </details>
    </Card>
  );
}

function OfferPreview({
  preview,
  setPreview,
  text,
  setText,
  rejected,
  disabled,
  onAdopt,
}: {
  preview: OfferSourceData | null;
  setPreview: (value: OfferSourceData | null) => void;
  text: string;
  setText: (value: string) => void;
  rejected: number;
  disabled: boolean;
  onAdopt: (source: OfferSourceData, text: string) => void;
}) {
  return (
    <>
      {preview && (
        <div className="space-y-3">
          <h3 className="font-semibold">{t.review}</h3>
          <p className="text-sm">{t.sourceNotice}</p>
          {!!rejected && <p role="status">{t.rejected}</p>}
          <p className="break-all text-xs">
            {preview.url} ·{" "}
            {new Date(preview.retrievedAt).toLocaleString("fr-FR")}
          </p>
          {preview.fields.map((field, index) => (
            <div
              className="block space-y-1 text-sm"
              key={`${field.name}-${index}`}
            >
              <label>
                {t.fields[field.name]}
                <Input
                  value={field.value}
                  maxLength={4000}
                  onChange={(event) =>
                    setPreview({
                      ...preview,
                      fields: preview.fields.map((item, i) =>
                        i === index
                          ? { ...item, value: event.target.value }
                          : item,
                      ),
                    })
                  }
                />
              </label>
              <span className="block border-l border-input pl-2 text-muted-foreground">
                {field.quote}
              </span>
            </div>
          ))}
          <label className="block space-y-2">
            {t.source}
            <Textarea
              rows={10}
              maxLength={DOCUMENT_MAX_CHARACTERS}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </label>
          <Button
            disabled={disabled || !text.trim()}
            onClick={() => {
              onAdopt(preview, text);
              setPreview(null);
            }}
          >
            {t.adopt}
          </Button>
        </div>
      )}
    </>
  );
}
