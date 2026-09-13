import {
  TITLE_MAX_CHARACTERS,
  CASE_FILE_PAGE_SIZE,
} from "../../../shared/limits.ts";
import { CampaignList } from "../workflows/CampaignList.tsx";
import { BackupRestore } from "../exports/BackupControls.tsx";
import { useCaseFileHome } from "./useCaseFileHome.ts";
import type { BootstrapData } from "../../../shared/analysis.ts";
import { workspaceFr as t } from "../../shared/i18n/workspace-fr.ts";
import { PageLayout } from "../../app/PageLayout.tsx";
import { Card } from "../../shared/ui/card.tsx";
import { Input } from "../../shared/ui/input.tsx";
import { Button } from "../../shared/ui/button.tsx";

export function CaseFileHome({
  bootstrap,
  onOpen,
  onCampaign,
}: {
  onCampaign: (id: string) => void;
  bootstrap: BootstrapData;
  onOpen: (id: string) => void;
}) {
  const state = useCaseFileHome(bootstrap, onOpen);

  const { query, setQuery, setOffset, title, setTitle, list, create, remove } =
    state;

  const error = create.error ?? remove.error ?? list.error;

  return (
    <PageLayout model={bootstrap.model}>
      <Card>
        <h2 className="font-editorial text-3xl">{t.title}</h2>
        <p className="my-3 text-muted-foreground">{t.introduction}</p>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate();
          }}
        >
          <label className="grow space-y-2">
            {t.name}
            <Input
              required
              maxLength={TITLE_MAX_CHARACTERS}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <Button type="submit" disabled={!title.trim() || create.isPending}>
            {t.create}
          </Button>
        </form>
        <label className="my-6 block space-y-2">
          {t.search}
          <Input
            value={query}
            maxLength={TITLE_MAX_CHARACTERS}
            onChange={(event) => {
              setQuery(event.target.value);
              setOffset(0);
            }}
          />
        </label>
        {error && <p role="alert">{error.message}</p>}
        {list.isPending && <p role="status">{t.loading}</p>}
        {list.data?.items.length === 0 && <p>{t.empty}</p>}
        <BackupRestore onOpen={onOpen} />
        <CaseFileList state={state} onOpen={onOpen} />
      </Card>
      {bootstrap.workflowsEnabled && <CampaignList onOpen={onCampaign} />}
    </PageLayout>
  );
}

function CaseFileList({
  state,
  onOpen,
}: {
  state: ReturnType<typeof useCaseFileHome>;
  onOpen: (id: string) => void;
}) {
  const { list, offset, setOffset, removing, setRemoving, remove } = state;

  return (
    <>
      <ul className="divide-y divide-border">
        {list.data?.items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-3 py-4"
          >
            <div className="min-w-0 break-words">
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-sm text-muted-foreground">
                {item.purpose === "recruiting" ? t.recruiting : t.jobSearch} ·{" "}
                {new Date(item.updatedAt).toLocaleString("fr-FR")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => onOpen(item.id)}>{t.open}</Button>
              <Button variant="outline" onClick={() => setRemoving(item.id)}>
                {t.remove}
              </Button>
            </div>
            {removing === item.id && (
              <div className="w-full space-x-2">
                <Button
                  disabled={remove.isPending}
                  onClick={() =>
                    remove.mutate({ id: item.id, revision: item.revision })
                  }
                >
                  {t.confirmDelete}
                </Button>
                <Button variant="ghost" onClick={() => setRemoving(null)}>
                  {t.cancel}
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex gap-2">
        <Button
          variant="outline"
          disabled={offset === 0}
          onClick={() => setOffset(Math.max(0, offset - CASE_FILE_PAGE_SIZE))}
        >
          {t.previous}
        </Button>
        <Button
          variant="outline"
          disabled={
            !list.data || offset + CASE_FILE_PAGE_SIZE >= list.data.total
          }
          onClick={() => setOffset(offset + CASE_FILE_PAGE_SIZE)}
        >
          {t.next}
        </Button>
      </div>
    </>
  );
}
