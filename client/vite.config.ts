import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig({
  plugins: [solidPlugin(), tailwindcss(), wasm(), topLevelAwait()],
  server: {
    // port: 3000,
  },
  build: {
    target: "esnext",
  },
});
