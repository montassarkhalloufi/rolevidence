import { useQuery } from "@tanstack/react-query";
import { caseFileApi } from "./api.ts";
import type { BootstrapData } from "../../../shared/analysis.ts";
import { workspaceFr as t } from "../../shared/i18n/workspace-fr.ts";
import { Button } from "../../shared/ui/button.tsx";
import { CaseFileEditor } from "./CaseFileEditor.tsx";

export function CaseFileWorkspace({
  id,
  bootstrap,
  onBack,
  onCampaign,
}: {
  id: string;
  bootstrap: BootstrapData;
  onBack: () => void;
  onCampaign: (id: string) => void;
}) {
  const caseFile = useQuery({
    queryKey: ["dossier", id],
    queryFn: ({ signal }) => caseFileApi.get(id, signal),
  });

  if (caseFile.isPending) {
    return <p role="status">{t.loading}</p>;
  }

  if (caseFile.error) {
    return (
      <div role="alert">
        {caseFile.error.message}
        <Button onClick={onBack}>{t.back}</Button>
      </div>
    );
  }

  return (
    <CaseFileEditor
      initial={caseFile.data}
      bootstrap={bootstrap}
      onBack={onBack}
      onCampaign={onCampaign}
    />
  );
}
