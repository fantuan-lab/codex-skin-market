# Notices

竹影熊猫 Codex 皮肤是非官方定制项目，与 OpenAI 无隶属、赞助或背书关系。Codex 与 OpenAI 名称及相关商标归其权利人所有。

## Upstream software

本 macOS 发行包基于 [Fei-Away/Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin) commit `568469a4`。上游 MIT License 保留在 `LICENSE`；竹影熊猫更换了主题配置、配色、可见文案、安装入口和图片，并保留上游的 CDP 注入、校验与恢复架构。

MIT 许可覆盖本仓库中的软件代码，但不自动覆盖：

- OpenAI/Codex 名称、商标或官方应用素材；
- `assets/panda-hero.png`；
- 用户自行导入的图片；
- 第三方应用或服务。

## Bundled artwork

`assets/panda-hero.png` 是为“竹影熊猫”发布包准备的生成式主题图片，用作默认横幅与任务背景。它不是 OpenAI 或 Codex 官方素材，也不得因软件采用 MIT License 而被单独提取、转售或重新授权。具体使用范围见 `ARTWORK-LICENSE.md`。

## Runtime

本项目不分发 Node.js。运行时只使用用户官方 Codex Desktop 内已签名的 Node.js，并在连接前验证应用签名、Node 签名、Team ID 与本机架构。
