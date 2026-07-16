# Notices

Codex Dream Skin Studio is an **unofficial** customization project and is **not affiliated with, endorsed by, or sponsored by OpenAI**.

## Upstream source

This customized macOS distribution is based on [Fei-Away/Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin), commit `568469a4`. The upstream MIT license is preserved in `LICENSE`. The bundled theme name, copy, palette, and artwork were replaced for the original “月影灵编” edition; the upstream CDP injection, verification, and restore architecture remains intact.

## Software license

The MIT License in `LICENSE` applies to the **software source code** in this repository (scripts, CSS, injectors, and software documentation). It does not by itself license the bundled original theme artwork.

It does **not** grant rights to:

- OpenAI or Codex trademarks, product names, logos, or trade dress
- Official Codex / ChatGPT application binaries, `.app` bundles, or `app.asar`
- The bundled original `assets/portal-hero.png` artwork, except as allowed by the separate skin-package terms supplied by its publisher
- Any user-supplied images or third-party artwork you drop into a theme
- Character likenesses, franchise art, or celebrity imagery

## Demo artwork

`assets/portal-hero.png` is original generated artwork created for the “月影灵编” theme distribution. It depicts a moonlit coding spirit and is the bundled default theme image. It is not an OpenAI or Codex asset, and the upstream MIT software license does not grant a separate right to extract, resell, or relicense it.

Customer use of the bundled artwork is governed separately by `ARTWORK-LICENSE.md`. That file is a conservative beta template for one purchaser's own devices; the publisher must customize and review the final commercial terms before sale.

## Runtime

This project does not redistribute Node.js. At runtime it validates and uses the Node.js executable already signed and bundled inside the user's official Codex desktop application.

## Security model

Themes are applied through Chromium DevTools Protocol on **loopback only**. While a themed session is running, treat the local debugging port as sensitive: do not run untrusted local software that could attach to it. Use the Restore launcher to tear down the themed session and debugging port.
