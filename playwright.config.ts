import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  outputDir: "test-results",
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:43172",
    browserName: "chromium",
    channel: "chrome",
    viewport: { width: 1440, height: 1000 },
    colorScheme: "light",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node tests/auth-stub-server.mjs",
      url: "http://127.0.0.1:43173/__test/health",
      reuseExistingServer: false,
      timeout: 30_000,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      // Build and serve the production artifact with only the two public auth
      // values. A successful browser login therefore proves Vinext inlined
      // NEXT_PUBLIC_* without exposing the rest of process.env to the Worker.
      command:
        "NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:43173 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_cleartag_e2e npm run build && NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:43173 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_cleartag_e2e npm run start -- --port 43172",
      url: "http://localhost:43172",
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
