# Home Directory — Calvin Thurman

This is the root of your macOS home folder. It is organized into a small set of clearly-named top-level directories. The goal is to keep this root minimal so everything is findable at a glance.

## Folder Layout

| Folder | Purpose |
|---|---|
| `Downloads/` | All downloaded files, organized into numbered category subfolders (01–09). See Downloads/README.md. |
| `Documents/` | Personal and professional documents, organized semantically by area. See Documents/README.md. |
| `Code/` | Active code projects, clones, and dev tools (MennuBarApp, homebase-openclaw, x402-wallet-auth-service, ollama-memory, etc.). |
| `Fooocus/` | Local install of the Fooocus AI image generation tool. Do not modify internals. |
| `miniconda3/` | Miniconda Python environment manager. System-level install — do not move. |
| `Backups/` | Manual backups of files and data. |
| `_To_Review/` | Items that were loose at the root and need a decision: old installers, logs, SD configs, and a malformed file. Review and delete or relocate manually. |

## macOS Standard Folders (leave as-is)
`Applications`, `Desktop`, `Library`, `Movies`, `Music`, `OneDrive`, `Pictures`, `Public`, `Sites`

## Notes
- `_To_Review/` at this root contains: `Miniconda3-latest-MacOSX-arm64.sh` (121 MB installer — safe to delete if Miniconda is already installed), `firebase-debug.log` (2.5 MB), `error.log`, `configs/` (stable-diffusion controlnet presets), `outputs/` (AI conditioning/tensor outputs), `style_presets/`, `workflow_thumbnails/`, `databases/`, and a malformed zero-byte `shared-intel.md"`.
- Last cleaned: 2026-02-27 by Claude (Cowork).

## Change History
- 2026-03-03: Doctor run + runtime fixes. VPS accounting-pain-solver crash loop resolved (orphan process on port 3001 killed, PM2 restarted). VPS openclaw-gateway restart loop fixed (653 restarts) — orphan process cleared, systemd now properly tracks gateway (NRestarts=0). Local: orphan Tyrell session transcript removed. Local memory search enabled with local embedding provider (nomic-embed-text model).
- 2026-03-02: OpenClaw agent config hardening. Sandbox mode → gateway exec on Mac and VPS. Heartbeat model switched from ollama/qwen3:8b to openrouter/google/gemini-2.5-flash. Model fallbacks added to all agents. Discord heartbeat targeting enabled. Tiana TOOLS.md trimmed (31KB→3.6KB). BOOTSTRAP.md removed. Discord bindings added for Tyrone/LeeLee.
- 2026-03-01: Memory API wiring, VPS autonomy, ollama-memory setup.
- 2026-02-27: Initial cleanup. Replaced placeholder content. Moved loose dev projects into Code/, loose logs/installers into _To_Review/, intel MDs into Documents/Reference/.
