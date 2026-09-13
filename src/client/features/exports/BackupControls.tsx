import { useMutation } from "@tanstack/react-query";
import { caseFileApi } from "../case-files/api.ts";
import { Backup, BACKUP_MAX_BYTES } from "../../../shared/case-files.ts";
import { fr } from "../../shared/i18n/fr.ts";
import { Button } from "../../shared/ui/button.tsx";
import { Input } from "../../shared/ui/input.tsx";
import { downloadFile } from "./download.ts";

export function BackupExport({ id }: { id: string }) {
  const exportBackup = useMutation({
    mutationFn: () => caseFileApi.backup(id),
    onSuccess: (backup) =>
      downloadFile(
        "rolevidence-backup.json",
        JSON.stringify(backup),
        "application/json",
      ),
  });

  return (
    <div className="my-3">
      <Button
        variant="outline"
        disabled={exportBackup.isPending}
        onClick={() => exportBackup.mutate()}
      >
        {exportBackup.isPending ? fr.backupBusy : fr.backupExport}
      </Button>
      <p className="mt-2 text-xs text-muted-foreground">{fr.backupPrivacy}</p>
      {exportBackup.error && <p role="alert">{exportBackup.error.message}</p>}
    </div>
  );
}

export function BackupRestore({ onOpen }: { onOpen: (id: string) => void }) {
  const restore = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > BACKUP_MAX_BYTES) {
        throw new Error(fr.backupSize);
      }

      const parsed = parseBackup(await file.text());

      if (!parsed.success) {
        throw new Error(fr.backupInvalid);
      }

      return caseFileApi.restore(parsed.data);
    },
    onSuccess: (caseFile) => onOpen(caseFile.id),
  });

  return (
    <details className="my-5 rounded-md border border-border p-4">
      <summary>{fr.backupRestore}</summary>
      <p className="my-3 text-sm">{fr.backupRestoreHelp}</p>
      <label>
        {fr.backupChoose}
        <Input
          type="file"
          accept="application/json,.json"
          disabled={restore.isPending}
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (file) {
              restore.mutate(file);
            }

            event.target.value = "";
          }}
        />
      </label>
      {restore.isPending && <p role="status">{fr.backupBusy}</p>}
      {restore.error && <p role="alert">{restore.error.message}</p>}
    </details>
  );
}

function parseBackup(text: string) {
  try {
    return Backup.safeParse(JSON.parse(text) as unknown);
  } catch {
    throw new Error(fr.backupInvalid);
  }
}
