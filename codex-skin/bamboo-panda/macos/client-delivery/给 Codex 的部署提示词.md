# 竹影熊猫｜macOS 客户部署提示词

我随消息上传了 `竹影熊猫-Codex皮肤-macOS.zip`。请在本机完成安装、验证与可恢复性检查：

1. 完整解压 ZIP，不要删除隐藏目录 `.codex-dream-skin-studio`。
2. 阅读 `使用说明.txt`、`ARTWORK-LICENSE.md` 和隐藏引擎中的 `README.md`、`NOTICE.md`、`LICENSE`。
3. 运行 `安装竹影熊猫.command`；Gatekeeper 阻止时只提示我在 Finder 右键选择“打开”，不得关闭系统安全机制。
4. 确认安装器先把旧活动主题保存到 `~/Library/Application Support/CodexDreamSkinStudio/themes/pre-panda-*`，再激活 `bamboo-panda-2026`。
5. 确认引擎位于 `~/.codex/codex-dream-skin-studio`，只使用 Codex 内置签名 Node.js 和 `127.0.0.1` 回环 CDP，不修改官方应用或 `app.asar`。
6. 运行 doctor 和 live verify，并把截图保存到 `$HOME/Desktop/竹影熊猫 Codex 验证.png`。
7. 检查桌面存在启动、定制、验证、恢复四个竹影熊猫入口。
8. 验证“恢复”能移除在线皮肤、恢复安装前 Codex 外观配置并正常重启。

最后回报引擎/Codex 版本、签名状态、活动主题 id/name、实际端口、截图、旧主题备份和恢复结果。不要用“预计已生效”代替真实验收。
