import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy /api/* to local Azure Functions (func start runs on 7071)
      "/api": {
        target: "http://localhost:7071",
        changeOrigin: true,
      },
    },
  },
});
