import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Codex Skin Lab beta landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Codex 皮肤｜月影灵编 macOS \/ Windows Beta<\/title>/i);
  assert.match(html, /给 Codex 桌面端/);
  assert.match(html, /下载 macOS Beta/);
  assert.match(html, /下载 Windows Beta/);
  assert.match(html, /中转站合作/);
  assert.match(html, /非 OpenAI 官方/);
  assert.match(html, /公开 Beta/);
  assert.match(html, /codex-moon-spirit-macos-beta1\.zip/);
  assert.match(html, /codex-moon-spirit-windows-beta1\.zip/);
  assert.doesNotMatch(html, /立即购买|6 款可选|本周主推|人气推荐/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});
