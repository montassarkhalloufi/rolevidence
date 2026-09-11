import { Badge } from "../shared/ui/badge.tsx";
import type { ReactNode } from "react";
import { fr } from "../shared/i18n/fr.ts";

export function PageLayout({
  children,
  model,
}: {
  children: ReactNode;
  model: string;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
      <header className="flex min-h-20 flex-wrap items-center justify-between gap-3 border-b border-border py-4">
        <a
          className="flex shrink-0 items-center gap-2 font-editorial text-xl font-bold no-underline sm:text-2xl"
          href="/"
          aria-label={fr.homeLabel}
        >
          <span
            className="text-4xl leading-none text-primary"
            aria-hidden="true"
          >
            ◭
          </span>{" "}
          Rolevidence
        </a>
        <div className="flex items-center gap-5">
          <Badge tone="outline">
            <span
              aria-hidden="true"
              className="size-2 rounded-full bg-primary"
            />
            {fr.applicationMode}
            <span className="text-muted-foreground">/</span>
            {fr.versionLabel}
          </Badge>
          <span className="hidden border-l border-border pl-5 font-editorial text-sm italic text-muted-foreground lg:block">
            {fr.mottoFirst}
            <br />
            {fr.mottoSecond}
          </span>
        </div>
      </header>
      <main>
        {" "}
        <div className="py-8 lg:py-10">
          <div className="text-xs font-semibold tracking-widest text-muted-foreground">
            {fr.eyebrow}
          </div>
          <h1 className="my-4 font-editorial text-4xl leading-tight tracking-tight lg:text-5xl">
            {fr.titleFirst} <br className="hidden lg:block" />
            {fr.titleSecond}
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            {fr.introduction}
          </p>
        </div>
        {children}
      </main>{" "}
      <footer className="mt-6 flex flex-col justify-between gap-3 border-t border-border py-6 text-xs leading-relaxed text-muted-foreground sm:flex-row">
        <span>
          <strong>Rolevidence</strong>
          <span className="px-3 text-muted-foreground">/</span>
          {fr.footer}
        </span>
        <span>
          {fr.localApplication} {model}
        </span>
      </footer>
    </div>
  );
}
