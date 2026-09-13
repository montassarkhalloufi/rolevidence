import { TITLE_MAX_CHARACTERS } from "../../../shared/limits.ts";
import { useCampaignCreate, emptyMember } from "./useCampaignCreate.ts";
import { CampaignMemberInput } from "./CampaignMemberInput.tsx";
import type { CaseFileData } from "../../../shared/case-files.ts";
import { CAMPAIGN_MAX_MEMBERS } from "../../../shared/workflows.ts";
import { workflowsFr as t } from "../../shared/i18n/workflows-fr.ts";
import { Button } from "../../shared/ui/button.tsx";
import { Input } from "../../shared/ui/input.tsx";

export function CampaignCreate({
  base,
  disabled,
  onOpen,
}: {
  base: CaseFileData;
  disabled: boolean;
  onOpen: (id: string) => void;
}) {
  const { title, setTitle, members, setMembers, create, importing } =
    useCampaignCreate(base, onOpen);

  return (
    <details className="rounded-md border border-border bg-card p-4">
      <summary className="font-semibold">
        {base.purpose === "job_search" ? t.jobSearch : t.recruiting}
      </summary>
      <p className="my-3 text-sm text-muted-foreground">{t.campaignHelp}</p>
      {disabled && <p>{t.sourceRequired}</p>}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate();
        }}
      >
        <fieldset
          disabled={disabled || create.isPending || importing.isPending}
          className="space-y-4"
        >
          <label className="block">
            {t.title}
            <Input
              required
              maxLength={TITLE_MAX_CHARACTERS}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          {members.map((member, index) => (
            <CampaignMemberInput
              key={member.id}
              member={member}
              onImport={(file) =>
                importing.mutate({ memberId: member.id, file })
              }
              index={index}
              recruiting={base.purpose === "recruiting"}
              canRemove={members.length > 2}
              onChange={(value) =>
                setMembers((members) =>
                  members.map((item) => (item.id === member.id ? value : item)),
                )
              }
              onRemove={() =>
                setMembers(members.filter((item) => item.id !== member.id))
              }
            />
          ))}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              disabled={members.length >= CAMPAIGN_MAX_MEMBERS}
              onClick={() => setMembers([...members, emptyMember()])}
            >
              {t.add}
            </Button>
            <Button type="submit">
              {create.isPending ? t.loading : t.create}
            </Button>
          </div>
        </fieldset>
        {create.error && <p role="alert">{create.error.message}</p>}
        {importing.isPending && <p role="status">{t.importing}</p>}
        {importing.error && <p role="alert">{importing.error.message}</p>}
      </form>
    </details>
  );
}
