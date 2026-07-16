# Upstream engine acceptance reference — 2026-07-15

This file records historical validation of the shared CDP engine before the Bamboo Panda theme was created. It is not evidence that Bamboo Panda `1.2.0-beta.1` has completed its final live-device release signoff.

The upstream engine was exercised on an arm64 Mac with Codex `26.707.72221`, OpenAI Team ID `2DC432GLL2`, bundled Node.js `v24.14.0`, and loopback port `9341`. The official app signature remained valid and `app.asar` was not modified.

For Bamboo Panda, `tests/run-tests.sh` covers payload identity, image limits, shared-slot theme backup/activation, duplicate-backup prevention, temporary light appearance plus exact restore, custom themes, syntax, signature and doctor checks. A release signoff still requires a fresh live install → verify → screenshot → restore cycle.

Reproduce the live evidence on the target Mac:

```bash
~/.codex/codex-dream-skin-studio/scripts/doctor-macos.sh --require-live
~/.codex/codex-dream-skin-studio/scripts/verify-dream-skin-macos.sh \
  --reload --screenshot "$HOME/Desktop/竹影熊猫 Codex 验证.png"
```
