# Notices

Codex 月影灵编是非官方定制项目，**与 OpenAI 无隶属、赞助或背书关系**。

## 软件许可与来源

本目录的软件基于 [Fei-Away/Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin) 的 Windows 实现修改，基线 commit 为 `568469a4`。MIT License 见 `LICENSE`；修改内容包括原创月影主题、参数化主题配置、稳定安装目录、官方 Store 运行时发现与进程/CDP 安全校验。

MIT License 仅适用于脚本、CSS、注入器和软件文档，不授予下列内容的权利：

- OpenAI、Codex 或 ChatGPT 的商标、名称、标识或产品外观
- 官方 Codex / ChatGPT 应用二进制、Microsoft Store 包或 `app.asar`
- 用户自行替换的图片或其他第三方素材

## 原创演示图片

`assets/dream-reference.png` 是本发布包的原创 AI 生成月影灵兽插画，来源副本为站点素材 `public/skins/moon-spirit-hero.png`。SHA-256：

`700b4976b2356d6b971e4fc1dd7b918c80d304836bd6a8cb11bd24d01b80fc21`

Windows 的 `assets/dream-reference.png` 与 macOS 的 `assets/portal-hero.png` 内容及 SHA-256 完全相同。该图片不属于 MIT 软件授权；Beta 客户许可模板见 `ARTWORK-LICENSE.md`。将本软件用于正式销售前，请由发布者补全并审阅该模板，同时自行确认图片及品牌名称的商业使用权与适用平台规则。

## 运行时与安全

本项目不重新分发 Node.js。运行时优先使用用户官方 Codex Store 包随附的 Node.js；无法找到时才使用用户已安装的系统 Node.js。皮肤通过仅绑定 `127.0.0.1` 的 CDP 工作，且不修改官方应用文件。
