# src/cli

Command-line entry points for generation, daily production, QA and scheduler
preview/smoke testing. Commands must translate arguments and exit status; domain
work remains in workflows and QA modules.

Remote mutation commands are explicit:

- `youtube:auth` performs the one-time Desktop OAuth loopback flow and writes
  credentials only to the git-ignored `.env` file.
- `youtube:check` uploads one video with private visibility.
- `youtube:playlist-check` ensures topic/level private playlists and inserts one
  existing video duplicate-safely.

Neither command is called by `generate`, `daily` or scheduler workflows.
