import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { crx } from "@crxjs/vite-plugin"
import path from "path"
import manifest from "./public/manifest.json" with { type: "json" }

export default defineConfig({
  plugins: [react(), tailwindcss(), crx({ manifest })],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    // Booking.com is the primary platform and always https in production;
    // starting jsdom there lets relative history.replaceState() calls resolve
    // to https URLs, matching the httpsOrNull filter in booking/adapter.ts.
    environmentOptions: {
      jsdom: { url: "https://www.booking.com/" },
    },
    setupFiles: ["./tests/setup.ts"],
    fileParallelism: false,
  },
  build: {
    target: "esnext",
    sourcemap: true,
    rollupOptions: {
      input: {
        sidepanel: "src/sidepanel/index.html",
        popup: "src/popup/index.html",
      },
    },
  },
})
