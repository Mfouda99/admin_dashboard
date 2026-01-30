import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    proxy: {
      // Existing main API
      "/api": {
        target: "https://api.kentbusinesscollege.net",
        changeOrigin: true,
        secure: false,
      },

      // Local Django tasks API
      "/tasks-api": {
        target: "http://127.0.0.1:8003",
        changeOrigin: true,
      },
    },
  },
});
