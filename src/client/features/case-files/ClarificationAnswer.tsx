import { useState } from "react";
import { fr } from "../../shared/i18n/fr.ts";
import { Button } from "../../shared/ui/button.tsx";
import { Textarea } from "../../shared/ui/textarea.tsx";
import { NativeSelect } from "../../shared/ui/native-select.tsx";

export function ClarificationAnswer({
  subject,
  onAnswer,
}: {
  subject: string;
  onAnswer: (text: string) => void;
}) {
  const [answer, setAnswer] = useState("");

  const [author, setAuthor] = useState("candidate");

  return (
    <details className="mt-5 rounded-md border border-border p-4">
      <summary>{fr.clarifyAction}</summary>
      <p className="my-3 text-sm">
        {fr.clarifyQuestion} « {subject} » ?
      </p>
      <label className="block text-sm">
        {fr.clarifyAuthor}
        <NativeSelect
          value={author}
          onChange={(event) => setAuthor(event.target.value)}
        >
          <option value="candidate">{fr.clarifyCandidate}</option>
          <option value="recruiter">{fr.clarifyRecruiter}</option>
        </NativeSelect>
      </label>
      <label className="my-3 block text-sm">
        {fr.clarifyAnswer}
        <Textarea
          rows={4}
          maxLength={2000}
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
        />
      </label>
      <Button
        disabled={!answer.trim()}
        onClick={() =>
          onAnswer(
            `[${new Date().toISOString()} · ${author === "candidate" ? fr.clarifyCandidate : fr.clarifyRecruiter}] ${subject} : ${answer.trim()}`,
          )
        }
      >
        {fr.clarifySave}
      </Button>
      <p className="mt-2 text-xs text-muted-foreground">{fr.clarifyNext}</p>
    </details>
  );
}
