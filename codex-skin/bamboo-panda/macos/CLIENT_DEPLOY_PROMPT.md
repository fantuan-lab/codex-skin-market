# 竹影熊猫｜macOS 客户部署提示词

使用方法：把完整的 `竹影熊猫-Codex皮肤-macOS.zip` 和下面整段提示词发送给客户自己的 macOS Codex。不要提前删除 ZIP 内的隐藏目录。

---

我随消息上传了 `竹影熊猫-Codex皮肤-macOS.zip`。请在本机完成安装、验证与可恢复性检查。

要求：

1. 找到 ZIP 的绝对路径，完整解压到不会被中途清理的目录；正确引用中文或空格路径。
2. 阅读 `使用说明.txt`、`ARTWORK-LICENSE.md`、隐藏引擎内的 `README.md`、`NOTICE.md` 与 `LICENSE`。
3. 运行 `安装竹影熊猫.command`。如果 Gatekeeper 阻止，提示我在 Finder 中右键该文件选择“打开”；不得关闭 Gatekeeper。
4. 确认引擎安装到 `~/.codex/codex-dream-skin-studio`。安装器应先把旧活动主题备份到 `~/Library/Application Support/CodexDreamSkinStudio/themes/pre-panda-*`，再激活 `bamboo-panda-2026`。
5. 确认安装期间 Codex 临时使用浅色外观，但恢复入口能写回安装前的原配置。
6. 不得修改 Codex 官方应用、`app.asar`、签名或系统安全设置；只允许使用经校验的 Codex 内置 Node.js 与 `127.0.0.1` 回环 CDP。
7. 运行：
   - `~/.codex/codex-dream-skin-studio/scripts/doctor-macos.sh --require-live`
   - `~/.codex/codex-dream-skin-studio/scripts/verify-dream-skin-macos.sh --reload --screenshot "$HOME/Desktop/竹影熊猫 Codex 验证.png"`
8. 检查桌面存在：
   - `竹影熊猫 Codex.command`
   - `竹影熊猫 Codex - 定制.command`
   - `竹影熊猫 Codex - 验证.command`
   - `竹影熊猫 Codex - 恢复.command`
9. 验收截图必须看到真实 Codex 侧边栏、输入框和熊猫横幅；装饰层不得遮挡或伪造可点击功能。
10. 若失败，读取 `~/Library/Application Support/CodexDreamSkinStudio/` 下日志继续修复，不得用“应该已经生效”代替真实验证。

最后回报引擎与 Codex 版本、签名状态、活动主题 id/name、实际 CDP 端口、截图路径、旧主题备份路径、四个桌面入口以及恢复测试结果。
