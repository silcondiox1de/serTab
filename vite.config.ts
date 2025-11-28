import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Standard Vite + React app config
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
  },
});
