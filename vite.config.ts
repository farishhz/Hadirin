import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  resolve: {
    alias: {
      "@": decodeURIComponent(new URL("./src", import.meta.url).pathname)
    }
  },
  server: {
    strictPort: true,
    host: "127.0.0.1",
    port: 1420
  },
  test: {
    environment: "node",
    globals: true
  }
});
