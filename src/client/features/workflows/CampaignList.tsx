import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { workflowApi } from "./api.ts";
import { workflowsFr as t } from "../../shared/i18n/workflows-fr.ts";
import { Button } from "../../shared/ui/button.tsx";
import { Card } from "../../shared/ui/card.tsx";

export function CampaignList({ onOpen }: { onOpen: (id: string) => void }) {
  const [offset, setOffset] = useState(0);

  const query = useQuery({
    queryKey: ["campaigns", offset],
    queryFn: ({ signal }) => workflowApi.campaigns(offset, signal),
  });

  return (
    <Card className="mt-6">
      <h2 className="text-xl font-semibold">{t.campaigns}</h2>
      {query.isPending && <p role="status">{t.loading}</p>}
      {query.error && <p role="alert">{query.error.message}</p>}
      {query.data?.items.length === 0 && <p>{t.empty}</p>}
      <ul className="divide-y divide-border">
        {query.data?.items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap justify-between gap-3 py-4"
          >
            <span>{item.title}</span>
            <Button onClick={() => onOpen(item.id)}>{t.open}</Button>
          </li>
        ))}
      </ul>
      <div className="flex gap-3">
        <Button
          variant="outline"
          disabled={offset === 0}
          onClick={() => setOffset(Math.max(0, offset - 20))}
        >
          {t.previous}
        </Button>
        <Button
          variant="outline"
          disabled={!query.data || offset + 20 >= query.data.total}
          onClick={() => setOffset(offset + 20)}
        >
          {t.next}
        </Button>
      </div>
    </Card>
  );
}
