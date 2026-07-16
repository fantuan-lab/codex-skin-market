import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const SKIN_VERSION = "1.2.0-bamboo-panda-beta.1";
const MAX_ART_BYTES = 16 * 1024 * 1024;

function parseArgs(argv) {
  const options = { port: 9335, mode: "watch", timeoutMs: 30000, screenshot: null, reload: false, themeDir: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--port") options.port = Number(argv[++i]);
    else if (arg === "--once") options.mode = "once";
    else if (arg === "--watch") options.mode = "watch";
    else if (arg === "--verify") options.mode = "verify";
    else if (arg === "--remove") options.mode = "remove";
    else if (arg === "--check-payload") options.mode = "check";
    else if (arg === "--timeout-ms") options.timeoutMs = Number(argv[++i]);
    else if (arg === "--screenshot") options.screenshot = path.resolve(argv[++i]);
    else if (arg === "--theme-dir") options.themeDir = path.resolve(argv[++i]);
    else if (arg === "--reload") options.reload = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!Number.isInteger(options.port) || options.port < 1024 || options.port > 65535) {
    throw new Error(`Invalid port: ${options.port}`);
  }
  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs < 250 || options.timeoutMs > 120000) {
    throw new Error(`Invalid timeout: ${options.timeoutMs}`);
  }
  return options;
}

function validatedDebuggerUrl(target, port) {
  if (!target?.webSocketDebuggerUrl) throw new Error("CDP target is missing its WebSocket URL");
  const url = new URL(target.webSocketDebuggerUrl);
  if (url.protocol !== "ws:" || url.hostname !== "127.0.0.1" || Number(url.port) !== port) {
    throw new Error(`Rejected CDP WebSocket outside 127.0.0.1:${port}: ${url.href}`);
  }
  return url.href;
}

class CdpSession {
  constructor(target, port) {
    this.target = target;
    this.ws = new WebSocket(validatedDebuggerUrl(target, port));
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.closed = false;
  }

  async open() {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("CDP WebSocket open timed out")), 5000);
      this.ws.addEventListener("open", () => { clearTimeout(timeout); resolve(); }, { once: true });
      this.ws.addEventListener("error", () => { clearTimeout(timeout); reject(new Error("CDP WebSocket open failed")); }, { once: true });
    });
    this.ws.addEventListener("message", (event) => this.onMessage(event));
    this.ws.addEventListener("close", () => {
      this.closed = true;
      for (const waiter of this.pending.values()) {
        clearTimeout(waiter.timeout);
        waiter.reject(new Error("CDP socket closed"));
      }
      this.pending.clear();
    });
    await this.send("Runtime.enable");
    await this.send("Page.enable");
    return this;
  }

  onMessage(event) {
    const message = JSON.parse(String(event.data));
    if (message.id) {
      const waiter = this.pending.get(message.id);
      if (!waiter) return;
      clearTimeout(waiter.timeout);
      this.pending.delete(message.id);
      if (message.error) waiter.reject(new Error(`${message.error.message} (${message.error.code})`));
      else waiter.resolve(message.result);
      return;
    }
    for (const listener of this.listeners.get(message.method) ?? []) listener(message.params ?? {});
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) ?? [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }

  send(method, params = {}) {
    if (this.closed) return Promise.reject(new Error("CDP session is closed"));
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP command timed out: ${method}`));
      }, 10000);
      this.pending.set(id, { resolve, reject, timeout });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: false,
    });
    if (result.exceptionDetails) {
      const detail = result.exceptionDetails.exception?.description ?? result.exceptionDetails.text;
      throw new Error(`Renderer evaluation failed: ${detail}`);
    }
    return result.result?.value;
  }

  close() {
    if (!this.closed) this.ws.close();
    this.closed = true;
  }
}

async function waitForTargets(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const targets = await response.json();
      const appPages = targets.filter((item) => item.type === "page" && item.url?.startsWith("app://"));
      const pages = appPages.filter((item) => {
        try {
          validatedDebuggerUrl(item, port);
          return true;
        } catch (error) {
          lastError = error;
          return false;
        }
      });
      if (pages.length) return pages;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  throw new Error(`No Codex renderer target on 127.0.0.1:${port}: ${lastError?.message ?? "timed out"}`);
}

async function loadTheme(themeDir) {
  const assetsRoot = themeDir || path.join(root, "assets");
  const configPath = path.join(assetsRoot, "theme.json");
  const raw = JSON.parse(await fs.readFile(configPath, "utf8"));
  if (raw.schemaVersion !== 1 || typeof raw.image !== "string" || !raw.image) {
    throw new Error(`${configPath} has an unsupported schema or image field`);
  }
  if (path.basename(raw.image) !== raw.image) throw new Error("Theme image must stay inside its theme directory");
  const text = (value, fallback, max) => typeof value === "string" && value.trim()
    ? value.trim().slice(0, max) : fallback;
  const color = (value, fallback) => {
    if (typeof value !== "string") return fallback;
    const normalized = value.trim();
    return /^#[0-9a-f]{6}$/i.test(normalized) || /^rgba?\([0-9., %]+\)$/i.test(normalized)
      ? normalized : fallback;
  };
  const theme = {
    schemaVersion: 1,
    id: text(raw.id, "bamboo-panda-2026", 80),
    name: text(raw.name, "竹影熊猫", 80),
    brandSubtitle: text(raw.brandSubtitle, "BAMBOO PANDA CODEX SKIN", 80),
    tagline: text(raw.tagline, "跟着熊猫一起，把灵感、代码与效率慢慢做好。", 160),
    projectPrefix: text(raw.projectPrefix, "今天啃这个 · ", 80),
    projectLabel: text(raw.projectLabel, "🐼  选择项目", 80),
    statusText: text(raw.statusText, "PANDA FOCUS +1", 80),
    quote: text(raw.quote, "今天先把项目啃下来", 80),
    image: raw.image,
    colors: {
      background: color(raw.colors?.background, "#F7F3E8"),
      panel: color(raw.colors?.panel, "#FFFDF6"),
      panelAlt: color(raw.colors?.panelAlt, "#EEF0D7"),
      accent: color(raw.colors?.accent, "#3F5B2A"),
      accentAlt: color(raw.colors?.accentAlt, "#6F8C3D"),
      secondary: color(raw.colors?.secondary, "#A8B77B"),
      highlight: color(raw.colors?.highlight, "#C58C45"),
      text: color(raw.colors?.text, "#24351D"),
      muted: color(raw.colors?.muted, "#6F7563"),
      line: color(raw.colors?.line, "rgba(72, 97, 48, .24)"),
    },
  };
  const imagePath = path.join(assetsRoot, theme.image);
  const imageStat = await fs.stat(imagePath);
  if (!imageStat.isFile() || imageStat.size < 1 || imageStat.size > MAX_ART_BYTES) {
    throw new Error(`Theme image must be a non-empty file no larger than ${MAX_ART_BYTES} bytes`);
  }
  const extension = path.extname(theme.image).toLowerCase();
  if (![".png", ".jpg", ".jpeg", ".webp"].includes(extension)) {
    throw new Error(`Unsupported theme image format: ${extension || "missing"}`);
  }
  return { imagePath, theme };
}

async function loadPayload(themeDir) {
  const [css, template, loaded] = await Promise.all([
    fs.readFile(path.join(root, "assets", "dream-skin.css"), "utf8"),
    fs.readFile(path.join(root, "assets", "renderer-inject.js"), "utf8"),
    loadTheme(themeDir),
  ]);
  const art = await fs.readFile(loaded.imagePath);
  const extension = path.extname(loaded.imagePath).toLowerCase();
  const mime = extension === ".jpg" || extension === ".jpeg" ? "image/jpeg"
    : extension === ".webp" ? "image/webp" : "image/png";
  const artDataUrl = `data:${mime};base64,${art.toString("base64")}`;
  const payload = template
    .replace("__DREAM_CSS_JSON__", JSON.stringify(css))
    .replace("__DREAM_ART_JSON__", JSON.stringify(artDataUrl))
    .replace("__DREAM_THEME_JSON__", JSON.stringify(loaded.theme))
    .replace("__DREAM_VERSION_JSON__", JSON.stringify(SKIN_VERSION));
  if (/__DREAM_[A-Z_]+__/.test(payload)) throw new Error("Renderer payload still contains an unresolved placeholder");
  return { imageBytes: art.length, payload, theme: loaded.theme };
}

async function probeCodexRenderer(session) {
  return session.evaluate(`(() => {
    const markers = {
      shell: Boolean(document.querySelector('main.main-surface')),
      sidebar: Boolean(document.querySelector('aside.app-shell-left-panel')),
      composer: Boolean(document.querySelector('.composer-surface-chrome')),
      main: Boolean(document.querySelector('[role="main"]')),
    };
    return {
      href: location.href,
      protocol: location.protocol,
      markers,
      codex: location.protocol === 'app:' && markers.shell && markers.sidebar && (markers.composer || markers.main),
    };
  })()`);
}

async function connectTarget(target, port, timeoutMs) {
  const session = await new CdpSession(target, port).open();
  const deadline = Date.now() + Math.min(timeoutMs, 15000);
  let probe;
  while (Date.now() < deadline) {
    probe = await probeCodexRenderer(session);
    if (probe?.codex) return session;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  session.close();
  throw new Error(`Rejected app:// target without Codex renderer shell: ${JSON.stringify(probe)}`);
}

async function applyToSession(session, payload) {
  return session.evaluate(payload);
}

async function removeFromSession(session) {
  return session.evaluate(`(() => {
    window.__CODEX_DREAM_SKIN_DISABLED__ = true;
    const state = window.__CODEX_DREAM_SKIN_STATE__;
    if (state?.cleanup) return state.cleanup();
    document.documentElement?.classList.remove('codex-dream-skin');
    document.documentElement?.style.removeProperty('--dream-art');
    for (const variable of [
      '--panda-background', '--panda-panel', '--panda-panel-alt', '--panda-accent',
      '--panda-accent-alt', '--panda-secondary', '--panda-highlight', '--panda-text',
      '--panda-muted', '--panda-line', '--dream-skin-tagline', '--dream-skin-project-prefix',
      '--dream-skin-project-label'
    ]) document.documentElement?.style.removeProperty(variable);
    document.getElementById('codex-dream-skin-style')?.remove();
    document.getElementById('codex-dream-skin-chrome')?.remove();
    return true;
  })()`);
}

async function verifySession(session) {
  return session.evaluate(`(() => {
    const box = (node) => {
      if (!node) return null;
      const r = node.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
    };
    const home = document.querySelector('.dream-home');
    const heroNode = home?.firstElementChild?.firstElementChild?.firstElementChild ?? null;
    const suggestions = home?.querySelector('.group\\\\/home-suggestions') ?? null;
    const cards = suggestions ? [...suggestions.querySelectorAll('button')].map(box) : [];
    const stateArtUrl = window.__CODEX_DREAM_SKIN_STATE__?.artUrl ?? '';
    const rootArt = document.documentElement.style.getPropertyValue('--dream-art');
    const heroBackground = heroNode ? getComputedStyle(heroNode).backgroundImage : '';
    const result = {
      installed: document.documentElement.classList.contains('codex-dream-skin'),
      version: window.__CODEX_DREAM_SKIN_STATE__?.version ?? null,
      themeId: window.__CODEX_DREAM_SKIN_STATE__?.themeId ?? null,
      stylePresent: Boolean(document.getElementById('codex-dream-skin-style')),
      chromePresent: Boolean(document.getElementById('codex-dream-skin-chrome')),
      chromePointerEvents: getComputedStyle(document.getElementById('codex-dream-skin-chrome') || document.body).pointerEvents,
      homePresent: Boolean(home),
      artPresent: stateArtUrl.startsWith('blob:') && rootArt.includes(stateArtUrl),
      suggestionsPresent: Boolean(suggestions),
      hero: box(heroNode),
      heroArtPresent: Boolean(stateArtUrl) && heroBackground.includes(stateArtUrl),
      homeVerification: home ? 'checked' : 'not-visible',
      cards,
      composer: box(document.querySelector('.composer-surface-chrome')),
      sidebar: box(document.querySelector('aside.app-shell-left-panel')),
      viewport: { width: innerWidth, height: innerHeight },
      documentOverflow: {
        x: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        y: document.documentElement.scrollHeight > document.documentElement.clientHeight,
      },
    };
    result.pass = result.installed && result.version === ${JSON.stringify(SKIN_VERSION)} &&
      result.themeId === 'bamboo-panda-2026' && result.stylePresent && result.chromePresent && result.artPresent &&
      result.chromePointerEvents === 'none' && Boolean(result.composer) && Boolean(result.sidebar) &&
      (!result.homePresent || (Boolean(result.hero) && result.hero.width >= 240 && result.hero.height >= 120 && result.heroArtPresent &&
        (!result.suggestionsPresent || (result.cards.length >= 1 && result.cards.length <= 6))));
    return result;
  })()`);
}

async function waitForVerifiedSession(session, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastResult;
  while (Date.now() < deadline) {
    lastResult = await verifySession(session);
    if (lastResult.pass) return lastResult;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return lastResult;
}

async function capture(session, outputPath) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await session.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await session.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  const viewport = await session.evaluate("({ width: innerWidth, height: innerHeight })");
  await session.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: Math.round(viewport.width * 0.64),
    y: Math.round(viewport.height * 0.62),
    button: "none",
  });
  await new Promise((resolve) => setTimeout(resolve, 300));
  const result = await session.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await fs.writeFile(outputPath, Buffer.from(result.data, "base64"));
}

async function runOneShot(options) {
  const targets = await waitForTargets(options.port, options.timeoutMs);
  const loaded = (options.mode === "once" || options.reload) ? await loadPayload(options.themeDir) : null;
  const payload = loaded?.payload ?? null;
  const results = [];
  for (const target of targets) {
    let session;
    try {
      session = await connectTarget(target, options.port, options.timeoutMs);
    } catch (error) {
      console.error(`[bamboo-panda] skipped unverified app target ${target.id}: ${error.message}`);
      continue;
    }
    try {
      if (options.mode === "remove") await removeFromSession(session);
      else if (options.mode === "once") await applyToSession(session, payload);
      if (options.mode === "once") {
        await new Promise((resolve) => setTimeout(resolve, 850));
      }
      if (options.reload) {
        await session.send("Page.reload", { ignoreCache: true });
        await new Promise((resolve) => setTimeout(resolve, 1600));
        if (options.mode !== "remove") await applyToSession(session, payload);
      }
      const verified = options.mode === "remove"
        ? await session.evaluate("!document.documentElement.classList.contains('codex-dream-skin')")
        : (options.reload || options.mode === "once")
          ? await waitForVerifiedSession(session, options.timeoutMs)
          : await verifySession(session);
      results.push({ targetId: target.id, title: target.title, url: target.url, result: verified });
      if (options.screenshot) await capture(session, options.screenshot);
    } finally {
      session.close();
    }
  }
  if (!results.length) throw new Error(`No verified Codex renderer on 127.0.0.1:${options.port}`);
  console.log(JSON.stringify({ mode: options.mode, port: options.port, targets: results }, null, 2));
  if (options.mode === "verify" && results.some((item) => !item.result.pass)) process.exitCode = 2;
}

async function runWatch(options) {
  const { payload } = await loadPayload(options.themeDir);
  const sessions = new Map();
  let stopping = false;
  const stop = () => { stopping = true; };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  while (!stopping) {
    let targets = [];
    try {
      targets = await waitForTargets(options.port, 2000);
    } catch (error) {
      console.error(`[bamboo-panda] ${new Date().toISOString()} ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      continue;
    }

    const activeIds = new Set(targets.map((target) => target.id));
    for (const [id, session] of sessions) {
      if (!activeIds.has(id) || session.closed) {
        session.close();
        sessions.delete(id);
      }
    }

    for (const target of targets) {
      if (sessions.has(target.id)) continue;
      try {
        const session = await connectTarget(target, options.port, options.timeoutMs);
        session.on("Page.loadEventFired", () => {
          setTimeout(() => applyToSession(session, payload).catch((error) => {
            console.error(`[bamboo-panda] reinject failed: ${error.message}`);
          }), 250);
        });
        await applyToSession(session, payload);
        sessions.set(target.id, session);
        console.log(`[bamboo-panda] injected target ${target.id} (${target.title || target.url})`);
      } catch (error) {
        console.error(`[bamboo-panda] inject failed for ${target.id}: ${error.message}`);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 900));
  }

  for (const session of sessions.values()) session.close();
}

const options = parseArgs(process.argv.slice(2));
if (options.mode === "check") {
  const loaded = await loadPayload(options.themeDir);
  console.log(JSON.stringify({
    mode: "check",
    version: SKIN_VERSION,
    theme: loaded.theme,
    imageBytes: loaded.imageBytes,
    payloadBytes: Buffer.byteLength(loaded.payload),
  }, null, 2));
} else if (options.mode === "watch") await runWatch(options);
else await runOneShot(options);
