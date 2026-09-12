import { useEffect, useRef } from "react";

export function useJobFocus(id: string | undefined, running: boolean) {
  const container = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!id || !running) {
      return;
    }

    container.current?.focus({ preventScroll: true });
    container.current?.scrollIntoView?.({
      block: "center",
      behavior: "instant",
    });
  }, [id, running]);

  return container;
}
