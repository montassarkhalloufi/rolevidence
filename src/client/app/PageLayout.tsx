import type { ReactNode } from "react";
import { fr } from "../shared/i18n/fr.ts";

export function PageLayout({
  children,
  model,
  title,
}: {
  children: ReactNode;
  model: string;
  title?: string;
}) {
  return (
    <div>
      <header className="bg-navigation text-navigation-foreground">
        <div className="mx-auto flex min-h-16 max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <a
            href="/"
            aria-label={fr.homeLabel}
            className="flex items-center gap-3 text-xl font-bold no-underline"
          >
            <span aria-hidden="true" className="text-2xl">
              ◈
            </span>
            Rolevidence
          </a>
          <span className="text-xs">
            {fr.localStorage} · {fr.versionLabel}
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-8">
        <div className="mb-6">
          <p className="mb-3 text-xs text-muted-foreground">
            {fr.dossiersLink}
            {title && ` / ${title}`}
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {title ?? `${fr.titleFirst} ${fr.titleSecond}`}
          </h1>
          {!title && (
            <p className="mt-3 text-muted-foreground">{fr.introduction}</p>
          )}
        </div>
        {children}
        <footer className="mt-8 flex flex-wrap justify-between gap-3 border-t border-border py-5 text-xs text-muted-foreground">
          <span>{fr.footer}</span>
          <span>
            {fr.localApplication} {model}
          </span>
        </footer>
      </main>
    </div>
  );
}
