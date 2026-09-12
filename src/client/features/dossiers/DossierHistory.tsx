import { BackupExport } from "../exports/BackupControls.tsx";
import { renderReport } from "../exports/report.ts";
import { downloadFile } from "../exports/download.ts";
import { fr } from "../../shared/i18n/fr.ts";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { dossierApi } from "./api.ts";
import { workspaceFr as t } from "../../shared/i18n/workspace-fr.ts";
import { Button } from "../../shared/ui/button.tsx";
import { Card } from "../../shared/ui/card.tsx";
import { CodeBlock } from "../../shared/ui/code-block.tsx";
import { ResultsPanel } from "../analysis/components/ResultsPanel.tsx";
import type { SavedAnalysisData } from "../../../shared/dossiers.ts";

export function DossierHistory({
  id,
  generation,
}: {
  id: string;
  generation: number | string;
}) {
  const [offset, setOffset] = useState(0);

  const [selected, setSelected] = useState<SavedAnalysisData | null>(null);

  const history = useQuery({
    queryKey: ["history", id, generation, offset],
    queryFn: ({ signal }) => dossierApi.history(id, offset, signal),
  });

  return (
    <Card>
      <h2 className="font-editorial text-2xl">{t.history}</h2>
      <BackupExport id={id} />
      {history.error && <p role="alert">{history.error.message}</p>}
      {history.isPending && <p role="status">{t.loading}</p>}
      {history.data?.total === 0 && <p className="my-3">{t.noHistory}</p>}
      <ul className="my-3 space-y-2">
        {history.data?.items.map((item) => (
          <li key={item.id}>
            <Button variant="outline" onClick={() => setSelected(item)}>
              {new Date(item.createdAt).toLocaleString("fr-FR")} ·{" "}
              {item.result.metadata.provider} · {item.result.metadata.model}
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          disabled={offset === 0}
          onClick={() => setOffset(Math.max(0, offset - 10))}
        >
          {t.previous}
        </Button>
        <Button
          variant="ghost"
          disabled={!history.data || offset + 10 >= history.data.total}
          onClick={() => setOffset(offset + 10)}
        >
          {t.next}
        </Button>
      </div>
      {selected && (
        <div className="mt-4 space-y-4">
          <Button variant="outline" onClick={() => setSelected(null)}>
            {t.current}
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              downloadFile(
                "rolevidence-report.html",
                renderReport(selected),
                "text/html",
              )
            }
          >
            {fr.reportExport}
          </Button>
          <details>
            <summary>{t.snapshot}</summary>
            <CodeBlock>{JSON.stringify(selected.snapshot, null, 2)}</CodeBlock>
          </details>
          <ResultsPanel result={selected.result} loading={false} />
        </div>
      )}
    </Card>
  );
}
