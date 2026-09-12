import { workflowsFr as t } from "../../shared/i18n/workflows-fr.ts";
import { Button } from "../../shared/ui/button.tsx";
import { Input } from "../../shared/ui/input.tsx";
import { Textarea } from "../../shared/ui/textarea.tsx";

export type MemberDraft = { id: string; title: string; text: string };

export function CampaignMemberInput({
  member,
  index,
  recruiting,
  canRemove,
  onChange,
  onRemove,
  onImport,
}: {
  member: MemberDraft;
  index: number;
  recruiting: boolean;
  canRemove: boolean;
  onChange: (member: MemberDraft) => void;
  onRemove: () => void;
  onImport: (file: File) => void;
}) {
  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <label className="block">
        {t.memberTitle} {index + 1}
        <Input
          required
          maxLength={120}
          value={member.title}
          onChange={(event) =>
            onChange({ ...member, title: event.target.value })
          }
        />
      </label>
      <label className="block">
        {recruiting ? t.profileText : t.jobText} {index + 1}
        <Textarea
          aria-label={`${recruiting ? t.profileText : t.jobText} ${index + 1}`}
          required
          rows={5}
          maxLength={16000}
          value={member.text}
          onChange={(event) =>
            onChange({ ...member, text: event.target.value })
          }
        />
      </label>
      {recruiting && (
        <label className="block">
          {t.importCv} {index + 1}
          <Input
            aria-label={`${t.importCv} ${index + 1}`}
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                onImport(file);
              }

              event.target.value = "";
            }}
          />
          <span className="text-xs text-muted-foreground">{t.importHelp}</span>
        </label>
      )}
      <Button variant="ghost" disabled={!canRemove} onClick={onRemove}>
        {t.remove}
      </Button>
    </div>
  );
}
