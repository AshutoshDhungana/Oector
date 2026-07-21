import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const localPath = (path: string) => new URL(path, import.meta.url).pathname;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "react-router-dom": localPath("./node_modules/react-router-dom/dist/index.js"),
      "lucide-react": localPath("./src/components/FigmaIconCompat.tsx"),
      "figma:asset/04cc2b0921090ccb256a5141126ed657a6f7d830.png": localPath("../figma_design_src/assets/04cc2b0921090ccb256a5141126ed657a6f7d830.png"),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
  },
});
