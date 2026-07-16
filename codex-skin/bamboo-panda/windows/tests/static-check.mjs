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
  maxBuffer: 8 * 1024 * 1024,
});
assert.equal(payloadCheck.status, 0, payloadCheck.stderr);
const payload = JSON.parse(payloadCheck.stdout);
assert.equal(payload.theme.id, "bamboo-panda-2026");
assert.equal(payload.theme.name, "竹影熊猫");
assert.equal(payload.theme.image, "panda-reference.png");
assert.equal(payload.version, "1.2.0-bamboo-panda-beta.1");
assert.ok(payload.imageBytes > 100_000);
assert.ok(payload.imageBytes <= 16 * 1024 * 1024);
assert.ok(payload.payloadBytes > payload.imageBytes);
assert.equal((await read("VERSION")).trim(), payload.version);

const theme = JSON.parse(await read("assets/theme.json"));
assert.equal(path.basename(theme.image), theme.image);
assert.deepEqual(theme.colors, {
  background: "#F7F3E8",
  panel: "#FFFDF6",
  panelAlt: "#EEF0D7",
  accent: "#3F5B2A",
  accentAlt: "#6F8C3D",
  secondary: "#A8B77B",
  highlight: "#C58C45",
  text: "#24351D",
  muted: "#6F7563",
  line: "rgba(72, 97, 48, .24)",
});
const art = await fs.readFile(path.join(root, "assets", theme.image));
assert.equal(
  crypto.createHash("sha256").update(art).digest("hex"),
  "2a00c2e66579fc67271789af9c2b0da2aaae01e46a8ea0babdae834959879637",
);

const [common, install, start, verify, restore, injector, renderer, css, build, buildSh] = await Promise.all([
  read("scripts/common-dream-skin.ps1"),
  read("scripts/install-dream-skin.ps1"),
  read("scripts/start-dream-skin.ps1"),
  read("scripts/verify-dream-skin.ps1"),
  read("scripts/restore-dream-skin.ps1"),
  read("scripts/injector.mjs"),
  read("assets/renderer-inject.js"),
  read("assets/dream-skin.css"),
  read("scripts/build-release.ps1"),
  read("scripts/build-release.sh"),
]);

assert.match(common, /Get-AppxPackage -Name 'OpenAI\.Codex'/);
assert.match(common, /major>=22/);
assert.match(common, /typeof WebSocket/);
assert.match(common, /injectorStartedAt/);
assert.match(common, /function Stop-RecordedDreamSkinInjector/);
assert.match(start, /--remote-debugging-address=127\.0\.0\.1/);
assert.match(start, /Test-ProcessExecutablePath \$process\.Id \$exe/);
assert.match(start, /themeId = 'bamboo-panda-2026'/);
assert.match(start, /skinVersion = '1\.2\.0-bamboo-panda-beta\.1'/);
assert.match(start, /Stop-RecordedDreamSkinInjector \$failedState \$Injector/);
assert.match(verify, /Test-CodexDebugPort \$Port \$exe/);
assert.match(restore, /Stop-RecordedDreamSkinInjector/);
assert.match(restore, /Test-CodexDebugPort \$Port \$exe/);
assert.match(injector, /url\.hostname !== "127\.0\.0\.1"/);
assert.match(injector, /Rejected app:\/\/ target without Codex renderer shell/);
assert.match(injector, /themeId === 'bamboo-panda-2026'/);
assert.match(injector, /stateArtUrl\.startsWith\('blob:'\)/);
assert.match(injector, /rootArt\.includes\(stateArtUrl\)/);
assert.match(injector, /heroBackground\.includes\(stateArtUrl\)/);
assert.match(injector, /homeVerification: home \? 'checked' : 'not-visible'/);
assert.match(injector, /result\.hero\.width >= 240/);

assert.match(install, /Join-Path \$env:LOCALAPPDATA 'CodexMoonSpirit'/);
assert.match(install, /Stop-RecordedDreamSkinInjector \$oldState \$InstalledInjector/);
assert.match(install, /app\.installing\.\$PID/);
assert.match(install, /app\.previous\.\$PID/);
assert.match(install, /--check-payload/);
assert.match(install, /Move-Item -LiteralPath \$StagingRoot -Destination \$InstallRoot/);
assert.match(install, /Move-Item -LiteralPath \$PreviousRoot -Destination \$InstallRoot/);
assert.match(install, /config\.before-dream-skin\.toml/);
assert.match(install, /appearanceTheme = `"light`"/);
assert.match(install, /restart-required\.flag/);
assert.match(install, /Codex 竹影熊猫\.lnk/);
assert.match(install, /-RestoreBaseTheme/);
assert.match(install, /-RestartCodex/);
assert.match(start, /requiresThemeRestart/);
assert.match(start, /Remove-Item -LiteralPath \$RestartFlag/);
assert.match(restore, /Remove-Item -LiteralPath \$backup -Force/);
assert.match(restore, /\[switch\]\$RestartCodex/);
assert.match(restore, /Start-Process -FilePath \$exe/);
assert.match(renderer, /--panda-accent/);
assert.doesNotMatch(renderer, /--moon-/);
assert.match(css, /--panda-accent/);
assert.match(css, /content: "🐼"/);
assert.doesNotMatch(css, /--moon-/);

for (const relative of [
  "Install Bamboo Panda.cmd",
  "Start Bamboo Panda.cmd",
  "Verify Bamboo Panda.cmd",
  "Restore Bamboo Panda.cmd",
  "README.md",
  "LICENSE",
  "NOTICE.md",
  "SOURCE.md",
  "ARTWORK-LICENSE.md",
  "SKILL.md",
  "scripts/build-release.ps1",
  "scripts/build-release.sh",
]) {
  const stat = await fs.stat(path.join(root, relative));
  assert.ok(stat.isFile(), `${relative} is missing`);
}

for (const relative of ["Start Bamboo Panda.cmd", "Verify Bamboo Panda.cmd", "Restore Bamboo Panda.cmd"]) {
  const launcher = await read(relative);
  assert.match(launcher, /%LOCALAPPDATA%\\CodexMoonSpirit\\app\\scripts\\/);
  assert.match(launcher, /if not exist "%PANDA_SCRIPT%"/);
  assert.doesNotMatch(launcher, /%~dp0scripts\\/);
}
assert.match(await read("Install Bamboo Panda.cmd"), /%~dp0scripts\\install-dream-skin\.ps1/);
assert.match(await read("Restore Bamboo Panda.cmd"), /-RestoreBaseTheme/);
assert.match(await read("Restore Bamboo Panda.cmd"), /-RestartCodex/);
assert.match(install, /'ARTWORK-LICENSE\.md'/);
assert.match(build, /Codex-Bamboo-Panda-Windows-\$Version/);
assert.match(build, /Compress-Archive/);
assert.match(build, /Get-FileHash/);
assert.match(buildSh, /zip -X -qry/);
assert.match(buildSh, /unzip -t/);

const customerTextFiles = [
  "Install Bamboo Panda.cmd", "Start Bamboo Panda.cmd", "Verify Bamboo Panda.cmd", "Restore Bamboo Panda.cmd",
  "README.md", "NOTICE.md", "SOURCE.md", "ARTWORK-LICENSE.md", "SKILL.md",
  "assets/theme.json", "assets/renderer-inject.js", "assets/dream-skin.css",
  "scripts/start-dream-skin.ps1", "scripts/verify-dream-skin.ps1", "scripts/injector.mjs",
];
const customerText = (await Promise.all(customerTextFiles.map(read))).join("\n");
assert.doesNotMatch(customerText, /月影灵编|MOON SPIRIT|MOONLIGHT ONLINE|moon-spirit-2026|dream-reference\.png|Install Moon Spirit|Start Moon Spirit|Verify Moon Spirit|Restore Moon Spirit/);

console.log("Windows Bamboo Panda static checks: passed");
