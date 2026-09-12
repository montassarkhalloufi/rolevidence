import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { workflowApi } from "./api.ts";
import { workflowsFr as t } from "../../shared/i18n/workflows-fr.ts";
import { PageLayout } from "../../app/PageLayout.tsx";
import { Button } from "../../shared/ui/button.tsx";
import { Card } from "../../shared/ui/card.tsx";
import { ResultsPanel } from "../analysis/components/ResultsPanel.tsx";

export function CampaignWorkspace({
  id,
  onBack,
  onDossier,
}: {
  id: string;
  onBack: () => void;
  onDossier: (id: string) => void;
}) {
  const [confirm, setConfirm] = useState(false);

  const query = useQuery({
    queryKey: ["campaign", id],
    queryFn: ({ signal }) => workflowApi.campaign(id, signal),
  });

  const remove = useMutation({
    mutationFn: () => workflowApi.remove(id),
    onSuccess: onBack,
  });

  if (query.isPending) {
    return <p role="status">{t.loading}</p>;
  }

  if (query.error) {
    return (
      <p role="alert">
        {query.error.message}
        <Button onClick={onBack}>{t.back}</Button>
      </p>
    );
  }

  return (
    <PageLayout model="" title={query.data.title}>
      <Button variant="outline" onClick={onBack}>
        {t.back}
      </Button>
      <p className="my-4 text-muted-foreground">{t.compareHelp}</p>
      <p className="my-4 text-sm">{t.startHelp}</p>
      {query.data.members.length < 2 && <p role="status">{t.missingMember}</p>}
      <div className="grid items-start gap-5 xl:grid-cols-2">
        {query.data.members.map(({ dossier, latest }) => (
          <Card key={dossier.id} className="min-w-0 p-3 sm:p-6">
            <h2 className="text-xl font-semibold">{dossier.title}</h2>
            <p className="my-2 text-sm">
              {t.status} : {t.statuses[dossier.tracking?.status ?? "preparing"]}
            </p>
            <Button className="my-3" onClick={() => onDossier(dossier.id)}>
              {t.open}
            </Button>
            {latest && latest.snapshot.revision !== dossier.revision && (
              <p role="status">{t.stale}</p>
            )}
            {latest ? (
              <ResultsPanel loading={false} result={latest.result} />
            ) : (
              <p>{t.notAnalyzed}</p>
            )}
          </Card>
        ))}
      </div>
      <div className="my-6 space-y-3">
        <p>{t.keepDossiers}</p>
        <Button variant="outline" onClick={() => setConfirm(true)}>
          {t.delete}
        </Button>
        {confirm && (
          <Button disabled={remove.isPending} onClick={() => remove.mutate()}>
            {t.confirmDelete}
          </Button>
        )}
        {remove.error && <p role="alert">{remove.error.message}</p>}
      </div>
    </PageLayout>
  );
}
