import { Alert } from "../../../shared/ui/alert.tsx";
import { CodeBlock } from "../../../shared/ui/code-block.tsx";
import { fr } from "../../../shared/i18n/fr.ts";
import { Button } from "../../../shared/ui/button.tsx";

import { useContextPreview } from "../hooks/useContextPreview.ts";
import type { DocumentsInput } from "../../../../shared/analysis.ts";

export function ContextPanel({ documents }: { documents: DocumentsInput }) {
  const preview = useContextPreview();

  const content = preview.isSuccess
    ? JSON.stringify(preview.data, null, 2)
    : "";

  const loading = preview.isPending;

  const error = preview.error?.message;

  const inspect = () => preview.mutate(documents);

  return (
    <details className="group mt-6 rounded-lg border border-border bg-card text-sm">
      <summary className="cursor-pointer p-5 text-primary">
        ▤ <span>{fr.contextTitle}</span>
        <span className="ml-3 hidden text-xs text-muted-foreground sm:inline">
          {fr.noModelCall}
        </span>
      </summary>
      <div className="space-y-4 px-5 pb-5 [&>p]:leading-relaxed [&>p]:text-muted-foreground">
        <p>{fr.contextDescription}</p>
        <Button
          variant="outline"
          size="sm"
          type="button"
          disabled={loading}
          onClick={() => void inspect()}
        >
          {loading ? fr.preparing : fr.preview}
        </Button>
        {error && (
          <Alert asChild>
            <p role="alert">{error}</p>
          </Alert>
        )}
        {content && <CodeBlock>{content}</CodeBlock>}
      </div>
    </details>
  );
}
