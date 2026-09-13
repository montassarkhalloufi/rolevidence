import { workspaceFr as t } from "../../shared/i18n/workspace-fr.ts";
import { Button } from "../../shared/ui/button.tsx";

export function CaseFileNavigation({
  busy,
  dirty,
  onBack,
}: {
  busy: boolean;
  dirty: boolean;
  onBack: () => void;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <Button
        variant="outline"
        disabled={busy}
        onClick={() => {
          if (!dirty || window.confirm(t.leave)) {
            onBack();
          }
        }}
      >
        {t.back}
      </Button>
      <span role="status" className="text-sm">
        {dirty ? t.unsaved : t.saved}
      </span>
    </div>
  );
}
