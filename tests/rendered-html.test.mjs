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

test("server-renders the ClearTag landing page and local analyzer", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html[^>]+lang="en"/i);
  assert.match(html, /<title>ClearTag · Guided PDF accessibility remediation<\/title>/i);
  assert.match(html, /Turn accessibility findings into reviewable fixes and defensible evidence/);
  assert.match(html, /Choose or drop a PDF/);
  assert.match(html, /Evidence mapping/);
  assert.match(html, /WCAG 2\.1 AA/);
  assert.match(html, /Section 508/);
  assert.match(html, /PDF\/UA-1/);
  assert.match(html, /EN 301 549/);
  assert.match(html, /No server-side PDF retention/);
  assert.match(html, /Not yet offered/);
  assert.match(html, /Skip to main content/);
  assert.doesNotMatch(html, /all PDFs (?:must|need to) be remediated/i);
  assert.doesNotMatch(html, /automatically certif|guaranteed compliant|100% compliant/i);
  assert.doesNotMatch(html, /Codex Skin Lab|竹影熊猫|月影灵编/);
});
