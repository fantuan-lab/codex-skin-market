# Notices

Codex 竹影熊猫是非官方定制项目，**与 OpenAI 无隶属、赞助或背书关系**。

## 软件许可与来源

本目录的软件基于 [Fei-Away/Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin) 的 Windows 实现修改，基线 commit 为 `568469a4`。MIT License 见 `LICENSE`；修改内容包括原创竹影熊猫主题、参数化主题配置、稳定安装目录、浅色桌面主题备份/恢复、官方 Store 运行时发现与进程/CDP 安全校验。

MIT License 仅适用于脚本、CSS、注入器和软件文档，不授予下列内容的权利：

- OpenAI、Codex 或 ChatGPT 的商标、名称、标识或产品外观
- 官方 Codex / ChatGPT 应用二进制、Microsoft Store 包或 `app.asar`
- 用户自行替换的图片或其他第三方素材

## 原创演示图片

`assets/panda-reference.png` 是为本主题准备的原创 AI 生成熊猫竹林横幅。SHA-256：

`2a00c2e66579fc67271789af9c2b0da2aaae01e46a8ea0babdae834959879637`

该图片不属于 MIT 软件授权；Beta 客户许可模板见 `ARTWORK-LICENSE.md`。正式销售前，请由发布者补全并审阅该模板，同时自行确认图片、熊猫形象、地点文字及品牌名称的商业使用权与适用平台规则。

## 运行时与安全

本项目不重新分发 Node.js。运行时优先使用用户官方 Codex Store 包随附的 Node.js；无法找到时才使用用户已安装的兼容系统 Node.js。皮肤通过仅绑定 `127.0.0.1` 的 CDP 工作，且不修改官方应用文件。
