import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => {
  const { PORT = "3001" } = loadEnv(mode, process.cwd(), "PORT");
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src/client", import.meta.url)) },
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: { "/api": `http://127.0.0.1:${PORT}` },
    },
    build: { outDir: "dist/client" },
  };
});
