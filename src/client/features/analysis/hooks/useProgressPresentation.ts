import { useEffect, useRef, useState } from "react";

const TICK_MS = 1000;

export function useProgressPresentation() {
  const container = useRef<HTMLDivElement>(null);

  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const start = Date.now();

    container.current?.focus({ preventScroll: true });
    container.current?.scrollIntoView?.({
      block: "center",
      behavior: "instant",
    });
    const timer = window.setInterval(() => {
      setSeconds(Math.floor((Date.now() - start) / TICK_MS));
    }, TICK_MS);

    return () => window.clearInterval(timer);
  }, []);

  return { container, seconds };
}
