import assert from "node:assert/strict";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

function assertBrandIcons(html) {
  assert.match(html, /href="\/cleartag-mark-v2\.svg"[^>]+sizes="any"/i);
  assert.match(html, /href="\/favicon-32-v2\.png"[^>]+sizes="32x32"/i);
  assert.match(html, /href="\/favicon-16-v2\.png"[^>]+sizes="16x16"/i);
  assert.match(html, /rel="shortcut icon"[^>]+href="\/favicon\.ico"/i);
  assert.match(html, /rel="apple-touch-icon"[^>]+href="\/apple-touch-icon-v2\.png"/i);
  assert.doesNotMatch(html, /href="\/favicon\.svg"/i);
}

function assertLandingOrder(html) {
  const markers = [
    'class="hero"',
    'class="confidence-strip"',
    'class="audience-section"',
    'class="workflow-section"',
    'class="product-proof-section"',
    'class="scope-section"',
    'class="standards-section"',
    'class="security-section"',
    'class="pricing-section"',
    'class="final-boundary"',
    'class="analyzer-section"',
  ];
  const positions = markers.map((marker) => html.indexOf(marker));
  assert.ok(positions.every((position) => position >= 0), `missing landing marker: ${positions}`);
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
}

test("server-renders the English ClearTag landing page and local analyzer", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html[^>]+lang="en"/i);
  assert.match(html, /<title>ClearTag · Guided PDF remediation<\/title>/i);
  assert.match(html, /Turn accessibility findings into reviewable fixes and defensible evidence/);
  assert.match(html, /Illustrative UI example · not scan output/);
  assert.match(html, /Choose or drop a PDF/);
  assert.match(html, /aria-label="Language"/);
  assert.match(html, /href="\/zh"/i);
  assert.match(html, /hrefLang="zh-CN"/i);
  assert.match(html, /Evidence mapping/);
  assert.match(html, /WCAG 2\.1 AA/);
  assert.match(html, /Section 508/);
  assert.match(html, /PDF\/UA-1/);
  assert.match(html, /EN 301 549/);
  assert.match(html, /No server-side PDF retention/);
  assert.match(html, /Not yet offered/);
  assert.match(html, /See the issue\. Record the judgment\. Deliver the evidence\./);
  assert.match(html, /src="\/landing\/standards-books\.png"/i);
  assert.match(html, /src="\/landing\/cta-desk\.png"/i);
  assert.match(html, /Footer navigation/);
  assert.match(html, /Mobile section navigation/);
  assert.match(html, /Skip to main content/);
  assertLandingOrder(html);
  assertBrandIcons(html);
  assert.doesNotMatch(html, /all PDFs (?:must|need to) be remediated/i);
  assert.doesNotMatch(html, /automatically certif|guaranteed compliant|100% compliant/i);
  assert.doesNotMatch(html, /cleartag\.invalid/i);
  assert.doesNotMatch(html, /Codex Skin Lab|竹影熊猫|月影灵编/);
});

test("server-renders a complete Chinese route with the correct document language", async () => {
  const response = await render("/zh");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html[^>]+lang="zh-CN"/i);
  assert.match(html, /<title>ClearTag · 引导式 PDF 无障碍修复<\/title>/i);
  assert.match(html, /把无障碍问题转化为可复核的修复和可追溯的证据/);
  assert.match(html, /界面示意 · 并非扫描结果/);
  assert.match(html, /选择或拖入 PDF/);
  assert.match(html, /aria-label="语言"/);
  assert.match(html, /href="\/"/i);
  assert.match(html, /hrefLang="en"/i);
  assert.match(html, /WCAG 2\.1 AA/);
  assert.match(html, /Section 508/);
  assert.match(html, /PDF\/UA-1/);
  assert.match(html, /EN 301 549/);
  assert.match(html, /此版本不在服务器端留存 PDF/);
  assert.match(html, /不承诺一键合规/);
  assert.match(html, /看见问题，记录判断，交付证据/);
  assert.match(html, /src="\/landing\/standards-books\.png"/i);
  assert.match(html, /aria-label="页脚导航"/);
  assert.match(html, /aria-label="移动端章节导航"/);
  assertLandingOrder(html);
  assertBrandIcons(html);
  assert.doesNotMatch(html, /一键(?:实现|完成)合规|自动获得认证|保证所有 PDF 符合|100% 合规/i);
});
