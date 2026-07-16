((cssText, artDataUrl, themeConfig) => {
  const STATE_KEY = "__CODEX_DREAM_SKIN_STATE__";
  const STYLE_ID = "codex-dream-skin-style";
  const CHROME_ID = "codex-dream-skin-chrome";
  const VERSION = __DREAM_VERSION_JSON__;
  const THEME = themeConfig && typeof themeConfig === "object" ? themeConfig : {};
  const THEME_VARIABLES = [
    "--moon-background", "--moon-panel", "--moon-panel-alt", "--moon-accent",
    "--moon-accent-alt", "--moon-secondary", "--moon-highlight", "--moon-text",
    "--moon-muted", "--moon-line", "--dream-skin-tagline", "--dream-skin-project-prefix",
    "--dream-skin-project-label",
  ];
  window.__CODEX_DREAM_SKIN_DISABLED__ = false;

  const previous = window[STATE_KEY];
  if (previous?.observer) previous.observer.disconnect();
  if (previous?.timer) clearInterval(previous.timer);
  if (previous?.scheduler?.timeout) clearTimeout(previous.scheduler.timeout);
  if (previous?.artUrl) URL.revokeObjectURL(previous.artUrl);
  document.getElementById(CHROME_ID)?.removeAttribute("data-dream-version");
  const artUrl = (() => {
    const comma = artDataUrl.indexOf(",");
    const binary = atob(artDataUrl.slice(comma + 1));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return URL.createObjectURL(new Blob([bytes], { type: "image/png" }));
  })();
  const existingStyle = document.getElementById(STYLE_ID);
  if (existingStyle) {
    existingStyle.textContent = cssText;
    existingStyle.dataset.dreamVersion = VERSION;
  }

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
  const cssString = (value) => JSON.stringify(String(value ?? ""));
  const renderChrome = (chrome) => {
    chrome.innerHTML = `
      <div class="dream-brand"><span class="dream-note">☾</span><span><b>${escapeHtml(THEME.name || "月影灵编")}</b><small>${escapeHtml(THEME.brandSubtitle || "MOON SPIRIT CODEX SKIN")}</small></span></div>
      <div class="dream-signature">${escapeHtml(THEME.statusText || "MOONLIGHT ONLINE")} ✦</div>
      <div class="dream-sparkles"><i></i><i></i><i></i><i></i><i></i><i></i></div>
      <div class="dream-ribbon"><span>✦</span>☾<span>✦</span></div>
      <div class="dream-polaroid" title="${escapeHtml(THEME.quote || "灵光落笔，万象成章")}"></div>`;
    chrome.dataset.dreamVersion = VERSION;
  };

  const ensure = () => {
    if (window.__CODEX_DREAM_SKIN_DISABLED__) return;
    const root = document.documentElement;
    if (!root) return;
    root.classList.add("codex-dream-skin");
    root.style.setProperty("--dream-art", `url("${artUrl}")`);
    const colors = THEME.colors || {};
    const variables = {
      "--moon-background": colors.background || "#0A102C",
      "--moon-panel": colors.panel || "#111A46",
      "--moon-panel-alt": colors.panelAlt || "#1A2458",
      "--moon-accent": colors.accent || "#8B84FF",
      "--moon-accent-alt": colors.accentAlt || "#D3CCFF",
      "--moon-secondary": colors.secondary || "#67E8FF",
      "--moon-highlight": colors.highlight || "#F3CC8B",
      "--moon-text": colors.text || "#F7F6FF",
      "--moon-muted": colors.muted || "#B4B0D6",
      "--moon-line": colors.line || "rgba(139, 132, 255, .28)",
      "--dream-skin-tagline": cssString(THEME.tagline || "月下灵光，陪你把灵感写成代码。"),
      "--dream-skin-project-prefix": cssString(THEME.projectPrefix || "选择项目 · "),
      "--dream-skin-project-label": cssString(THEME.projectLabel || "☾  选择项目"),
    };
    for (const [name, value] of Object.entries(variables)) root.style.setProperty(name, value);

    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      (document.head || root).appendChild(style);
    }
    if (style.dataset.dreamVersion !== VERSION) {
      style.textContent = cssText;
      style.dataset.dreamVersion = VERSION;
    }

    const shellMain = document.querySelector("main.main-surface") || document.querySelector("main");
    const home = document.querySelector('[role="main"]:has([data-testid="home-icon"])');
    for (const candidate of document.querySelectorAll('[role="main"].dream-home')) {
      if (candidate !== home) candidate.classList.remove("dream-home");
    }
    if (home) home.classList.add("dream-home");

    if (!shellMain || !document.body) return;
    shellMain.classList.toggle("dream-home-shell", Boolean(home));
    let chrome = document.getElementById(CHROME_ID);
    if (!chrome || chrome.parentElement !== document.body) {
      chrome?.remove();
      chrome = document.createElement("div");
      chrome.id = CHROME_ID;
      chrome.setAttribute("aria-hidden", "true");
      document.body.appendChild(chrome);
    }
    if (chrome.dataset.dreamVersion !== VERSION) renderChrome(chrome);
    const shellBox = shellMain.getBoundingClientRect();
    chrome.style.left = `${Math.round(shellBox.left)}px`;
    chrome.style.top = `${Math.round(shellBox.top)}px`;
    chrome.style.width = `${Math.round(shellBox.width)}px`;
    chrome.style.height = `${Math.round(shellBox.height)}px`;
    chrome.classList.toggle("dream-home-shell", Boolean(home));
  };

  const cleanup = () => {
    window.__CODEX_DREAM_SKIN_DISABLED__ = true;
    document.documentElement?.classList.remove("codex-dream-skin");
    document.documentElement?.style.removeProperty("--dream-art");
    for (const variable of THEME_VARIABLES) document.documentElement?.style.removeProperty(variable);
    document.querySelectorAll(".dream-home").forEach((node) => node.classList.remove("dream-home"));
    document.querySelectorAll(".dream-home-shell").forEach((node) => node.classList.remove("dream-home-shell"));
    document.getElementById(STYLE_ID)?.remove();
    document.getElementById(CHROME_ID)?.remove();
    const state = window[STATE_KEY];
    state?.observer?.disconnect();
    if (state?.timer) clearInterval(state.timer);
    if (state?.scheduler?.timeout) clearTimeout(state.scheduler.timeout);
    if (state?.artUrl) URL.revokeObjectURL(state.artUrl);
    delete window[STATE_KEY];
    return true;
  };

  const scheduler = { timeout: null };
  const scheduleEnsure = () => {
    if (scheduler.timeout) clearTimeout(scheduler.timeout);
    scheduler.timeout = setTimeout(() => {
      scheduler.timeout = null;
      ensure();
    }, 180);
  };
  const observer = new MutationObserver(scheduleEnsure);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  const timer = setInterval(ensure, 5000);
  window[STATE_KEY] = { ensure, cleanup, observer, timer, scheduler, artUrl, version: VERSION, themeId: THEME.id || null };
  ensure();
  return { installed: true, version: VERSION, themeId: THEME.id || null };
})(__DREAM_CSS_JSON__, __DREAM_ART_JSON__, __DREAM_THEME_JSON__)
