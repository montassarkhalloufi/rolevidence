import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { CaseFileData } from "../../../shared/case-files.ts";
import type { MemberDraft } from "./CampaignMemberInput.tsx";
import { workflowApi } from "./api.ts";
import { api } from "../../shared/api/client.ts";

export const emptyMember = (): MemberDraft => ({
  id: crypto.randomUUID(),
  title: "",
  text: "",
});

export function useCampaignCreate(
  base: CaseFileData,
  onOpen: (id: string) => void,
) {
  const [title, setTitle] = useState("");

  const [members, setMembers] = useState<MemberDraft[]>([
    emptyMember(),
    emptyMember(),
  ]);

  const [id] = useState(() => crypto.randomUUID());

  const create = useMutation({
    mutationFn: () =>
      workflowApi.create(id, {
        title,
        baseId: base.id,
        baseRevision: base.revision,
        members: members.map(({ title, text }) => ({ title, text })),
      }),
    onSuccess: (campaign) => onOpen(campaign.id),
  });

  const importing = useMutation({
    mutationFn: async ({
      memberId,
      file,
    }: {
      memberId: string;
      file: File;
    }) => ({ memberId, ...(await api.importCv(file)) }),
    onSuccess: ({ memberId, text }) =>
      setMembers((members) =>
        members.map((item) =>
          item.id === memberId ? { ...item, text } : item,
        ),
      ),
  });

  return { title, setTitle, members, setMembers, create, importing };
}
