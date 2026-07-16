((cssText, artDataUrl, themeConfig) => {
  const STATE_KEY = "__CODEX_DREAM_SKIN_STATE__";
  const STYLE_ID = "codex-dream-skin-style";
  const CHROME_ID = "codex-dream-skin-chrome";
  const VERSION = __DREAM_VERSION_JSON__;
  const THEME = themeConfig && typeof themeConfig === "object" ? themeConfig : {};
  const THEME_VARIABLES = [
    "--panda-background", "--panda-panel", "--panda-panel-alt", "--panda-accent",
    "--panda-accent-alt", "--panda-secondary", "--panda-highlight", "--panda-text",
    "--panda-muted", "--panda-line", "--dream-skin-tagline", "--dream-skin-project-prefix",
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
      <div class="dream-brand"><span class="dream-note">🐼</span><span><b>${escapeHtml(THEME.name || "竹影熊猫")}</b><small>${escapeHtml(THEME.brandSubtitle || "BAMBOO PANDA CODEX SKIN")}</small></span></div>
      <div class="dream-signature">${escapeHtml(THEME.statusText || "PANDA FOCUS +1")} 🌿</div>
      <div class="dream-sparkles"><i></i><i></i><i></i><i></i><i></i><i></i></div>
      <div class="dream-ribbon"><span>❧</span>🐾<span>❧</span></div>
      <div class="dream-polaroid" title="${escapeHtml(THEME.quote || "今天先把项目啃下来")}"></div>`;
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
      "--panda-background": colors.background || "#F7F3E8",
      "--panda-panel": colors.panel || "#FFFDF6",
      "--panda-panel-alt": colors.panelAlt || "#EEF0D7",
      "--panda-accent": colors.accent || "#3F5B2A",
      "--panda-accent-alt": colors.accentAlt || "#6F8C3D",
      "--panda-secondary": colors.secondary || "#A8B77B",
      "--panda-highlight": colors.highlight || "#C58C45",
      "--panda-text": colors.text || "#24351D",
      "--panda-muted": colors.muted || "#6F7563",
      "--panda-line": colors.line || "rgba(72, 97, 48, .24)",
      "--dream-skin-tagline": cssString(THEME.tagline || "跟着熊猫一起，把灵感、代码与效率慢慢做好。"),
      "--dream-skin-project-prefix": cssString(THEME.projectPrefix || "今天啃这个 · "),
      "--dream-skin-project-label": cssString(THEME.projectLabel || "🐼  选择项目"),
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
