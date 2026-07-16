---
name: codex-bamboo-panda-skin
description: Install, customize, launch, verify, repair, update, or restore the Bamboo Panda Codex skin on macOS while preserving the native interface and shared single-skin runtime slot.
compatibility: macOS, official Codex Desktop app, signed bundled Node.js 20 or newer
---

# 竹影熊猫 Codex Skin

This file is an optional Codex capability entry. The delivery is a complete standalone project; users do not need to install it as a Skill.

## Workflow

1. Run `安装竹影熊猫.command` from the complete project folder.
2. Confirm the installer preserved the previous active theme and activated `bamboo-panda-2026`.
3. Run `定制竹影熊猫.command` only when the user wants a personal replacement image.
4. Verify the live result with `验证竹影熊猫.command`. A pass requires a visible native sidebar and composer, no horizontal overflow, non-interactive decoration, and—on the home route—a real panda banner, native cards, and project selector.
5. Restore the official appearance and previous Codex appearance setting with `恢复竹影熊猫.command`.

## Guardrails

- Never modify the official `.app`, `app.asar`, or its code signature.
- Use the official Codex app's signed Node.js runtime only after validating its signature, Team ID, architecture, and minimum version.
- Bind CDP to loopback, verify that the listener belongs to Codex, and reject non-Codex renderer targets.
- Preserve all native cards, navigation, project selectors, task content, composer controls, and keyboard focus.
- Keep decoration at `pointer-events: none`.
- Require explicit authorization before restarting an already-running Codex instance.
- Stop an injector only when its recorded PID, executable, command line, and start time all match.

## Key resources

- `README.md`: user installation and customization guide.
- `scripts/injector.mjs`: CDP connection, injection, removal, verification, and screenshots.
- `assets/dream-skin.css`: live native interface styling.
- `assets/renderer-inject.js`: idempotent DOM integration and cleanup.
- `scripts/doctor-macos.sh`: signed-runtime, payload, and optional live-session self-check.
- `references/qa-inventory.md`: release and visual acceptance criteria.
