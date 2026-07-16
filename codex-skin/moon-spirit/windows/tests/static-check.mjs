import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (relative) => fs.readFile(path.join(root, relative), "utf8");

for (const relative of ["scripts/injector.mjs", "assets/renderer-inject.js"]) {
  const result = spawnSync(process.execPath, ["--check", path.join(root, relative)], { encoding: "utf8" });
  assert.equal(result.status, 0, `${relative} syntax failed: ${result.stderr}`);
}

const payloadCheck = spawnSync(process.execPath, [path.join(root, "scripts/injector.mjs"), "--check-payload"], {
  encoding: "utf8",
  maxBuffer: 4 * 1024 * 1024,
});
assert.equal(payloadCheck.status, 0, payloadCheck.stderr);
const payload = JSON.parse(payloadCheck.stdout);
assert.equal(payload.theme.id, "moon-spirit-2026");
assert.equal(payload.version, "1.1.0-moon-spirit");
assert.ok(payload.imageBytes > 100_000);
assert.ok(payload.payloadBytes > payload.imageBytes);

const theme = JSON.parse(await read("assets/theme.json"));
assert.equal(path.basename(theme.image), theme.image);
const art = await fs.readFile(path.join(root, "assets", theme.image));
assert.equal(
  crypto.createHash("sha256").update(art).digest("hex"),
  "700b4976b2356d6b971e4fc1dd7b918c80d304836bd6a8cb11bd24d01b80fc21",
);

const [common, install, start, verify, restore, injector] = await Promise.all([
  read("scripts/common-dream-skin.ps1"),
  read("scripts/install-dream-skin.ps1"),
  read("scripts/start-dream-skin.ps1"),
  read("scripts/verify-dream-skin.ps1"),
  read("scripts/restore-dream-skin.ps1"),
  read("scripts/injector.mjs"),
]);
assert.match(common, /Get-AppxPackage -Name 'OpenAI\.Codex'/);
assert.match(common, /major>=22/);
assert.match(common, /typeof WebSocket/);
assert.match(common, /injectorStartedAt/);
assert.match(start, /--remote-debugging-address=127\.0\.0\.1/);
assert.match(start, /Test-ProcessExecutablePath \$process\.Id \$exe/);
assert.match(start, /injectorStartedAt = \$daemon\.StartTime/);
assert.match(start, /Stop-RecordedMoonSpiritInjector \$failedState \$Injector/);
assert.match(verify, /Test-CodexDebugPort \$Port \$exe/);
assert.match(restore, /Stop-RecordedMoonSpiritInjector/);
assert.match(restore, /Test-CodexDebugPort \$Port \$exe/);
assert.doesNotMatch(install, /appearanceTheme\s*=/);
assert.match(injector, /url\.hostname !== "127\.0\.0\.1"/);
assert.match(injector, /Rejected app:\/\/ target without Codex renderer shell/);
assert.match(injector, /themeId === 'moon-spirit-2026'/);

for (const relative of [
  "Install Moon Spirit.cmd",
  "Start Moon Spirit.cmd",
  "Verify Moon Spirit.cmd",
  "Restore Moon Spirit.cmd",
  "README.md",
  "LICENSE",
  "NOTICE.md",
  "SOURCE.md",
  "ARTWORK-LICENSE.md",
]) {
  const stat = await fs.stat(path.join(root, relative));
  assert.ok(stat.isFile(), `${relative} is missing`);
}

for (const relative of ["Start Moon Spirit.cmd", "Verify Moon Spirit.cmd", "Restore Moon Spirit.cmd"]) {
  const launcher = await read(relative);
  assert.match(launcher, /%LOCALAPPDATA%\\CodexMoonSpirit\\app\\scripts\\/);
  assert.match(launcher, /if not exist "%MOON_SCRIPT%"/);
  assert.doesNotMatch(launcher, /%~dp0scripts\\/);
}

assert.match(install, /'ARTWORK-LICENSE\.md'/);

console.log("Windows Moon Spirit static checks: passed");
