import "./shared/styles/tokens.css";
import { Providers } from "./app/providers.tsx";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import "./styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Racine React introuvable.");
}

createRoot(root).render(
  <StrictMode>
    <Providers>
      <App />
    </Providers>
  </StrictMode>,
);
