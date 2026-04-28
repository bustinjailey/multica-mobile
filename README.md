# multica-mobile

Tiny mobile-friendly PWA for [Multica](https://github.com/multica-ai/multica). Talks directly to the Multica HTTP API using a Personal Access Token. Single static HTML file, no build step.

## Features

- 📥 Inbox with unread badge
- 📋 Issue list (filter open / mine / all)
- ✏️ Change issue status and assignee inline
- ➕ Create new issue (title, description, status, priority, assignee)
- 💬 Comment on issues with `@`-mention picker for agents and members (auto-triggers agent tasks server-side)
- 📲 Installable to home screen on iOS/Android (PWA)

## How it works

The app is a single static HTML file in `public/` that calls the Multica REST API directly. Auth is via a Personal Access Token created in the Multica web app (Settings → Personal Access Tokens). The token is stored in `localStorage`. Same-origin deployment means no CORS configuration is required.

Mention syntax follows Multica's wire format: `[@Name](mention://agent/<uuid>)` for agents, `mention://member/<uuid>` for members, `mention://all/all` for everyone. Mentioning an agent in a top-level comment automatically enqueues a task for that agent.

## Deploy

The app is intended to live at `https://multica.bustinjailey.org/m/`, served by the existing Caddy that fronts the Multica server.

1. **Copy static files into LXC 102 (`caddy-primary`)**:

   ```sh
   # From eagle:
   pct exec 102 -- mkdir -p /var/www/multica-mobile
   pct push 102 public/index.html /var/www/multica-mobile/index.html
   pct push 102 public/manifest.webmanifest /var/www/multica-mobile/manifest.webmanifest
   # icon files when you add them:
   # pct push 102 public/icon-192.png /var/www/multica-mobile/icon-192.png
   # pct push 102 public/icon-512.png /var/www/multica-mobile/icon-512.png
   ```

   For repeat deploys, prefer `git clone` + `git pull` inside LXC 102 (e.g. into `/opt/multica-mobile/`) and point Caddy's root at `/opt/multica-mobile/public`.

2. **Add the Caddy snippet** from `deploy/Caddyfile.snippet` to the existing `multica.bustinjailey.org` block in `/etc/caddy/Caddyfile` (must come before the catch-all `handle { ... }` for Next.js).

3. **Validate and reload**:

   ```sh
   caddy validate --config /etc/caddy/Caddyfile
   systemctl reload caddy
   ```

4. **First-time use**:
   - Open `https://multica.bustinjailey.org/m/` on your phone.
   - In the Multica web app on a desktop, create a Personal Access Token (Settings → Personal Access Tokens).
   - Paste the token into the mobile app, choose your workspace.
   - Tap the share icon in Safari/Chrome and "Add to Home Screen" for the PWA experience.

## Notes / limitations (V1)

- No realtime updates — the app refreshes the inbox on focus. WebSocket support could be added later (the server's `/ws` accepts the same PAT).
- Status enum is hard-coded to `backlog | todo | in_progress | in_review | done | cancelled` — matches `server/internal/handler/issue.go` as of 2026-04-27. If Multica adds new statuses, update `STATUSES` in `index.html`.
- Assignee dropdown lists agents and members fetched at app startup. "Reload agents/members" in Settings forces a refresh.
- Inbox endpoint shape is best-guess based on the router; the renderer is defensive about missing fields. Adjust `renderInboxItem` if the upstream payload diverges.

## Updating

Edit `public/index.html`, commit, push, then re-run the deploy step on LXC 102.
