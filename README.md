# multica-mobile

Tiny mobile-friendly PWA for [Multica](https://github.com/multica-ai/multica). Talks directly to the Multica HTTP API using a Personal Access Token. Single static HTML file, no build step.

Live at **https://multica.bustinjailey.org/m/** on this self-hosted instance.

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

## Deploy (this Multica instance)

Deployment is fully automatic via `caddy-sync.sh` running on each Caddy node:

- **caddy-primary** (LXC 102 on eagle) and **caddy-secondary** (LXC 150 on proxmox) run a periodic sync that fast-forwards `/etc/caddy/multica-mobile/` from this repo's `main` branch.
- Caddy serves the contents of `/etc/caddy/multica-mobile/public` at `https://multica.bustinjailey.org/m/` via the `multica.bustinjailey.org` block in `bustinjailey/bustinlab-infra` (`caddy/Caddyfile`).

To ship a change:

1. Edit `public/index.html`
2. Commit + push to `main`
3. The next `caddy-sync.sh` run on each Caddy node fast-forwards the checkout. No reload needed (Caddy reads files at request time).

To trigger immediately:

```sh
ssh root@eagle.bustinjailey.org "pct exec 102 -- bash /etc/caddy/infra/caddy/caddy-sync.sh"
ssh root@proxmox.bustinjailey.org "pct exec 150 -- bash /etc/caddy/infra/caddy/caddy-sync.sh"
```

## First-time use

1. Open `https://multica.bustinjailey.org/m/` on your phone
2. In the Multica web app on a desktop, create a Personal Access Token (Settings → Personal Access Tokens)
3. Paste the token into the mobile app's setup screen and choose your workspace
4. In Safari/Chrome, tap the share icon and "Add to Home Screen" for the PWA experience

## Deploy on a different Multica instance

The app is same-origin: serve `public/index.html` from any path on the same hostname as your Multica server (so the relative API calls hit `/api/*` correctly). Example Caddy snippet:

```caddy
your-multica.example.com {
    handle /api/*   { reverse_proxy multica-backend:8080 }
    handle /ws      { reverse_proxy multica-backend:8080 }

    @m_bare path /m
    redir @m_bare /m/ 308
    handle_path /m/* {
        root * /path/to/multica-mobile/public
        file_server
        try_files {path} /index.html
    }

    handle           { reverse_proxy multica-frontend:3000 }
}
```

If you want to host the PWA on a *different* origin, the Multica backend's `CORS_ALLOWED_ORIGINS` env must include that origin.

## Notes / limitations (V1)

- No realtime updates — the app refreshes the inbox on focus. WebSocket support could be added later (the server's `/ws` accepts the same PAT).
- Status enum is hard-coded to `backlog | todo | in_progress | in_review | done | cancelled`. If Multica adds new statuses, update `STATUSES` in `index.html`.
- Assignee dropdown lists agents and members fetched at app startup. "Reload agents/members" in Settings forces a refresh.
- Icon files (`icon-192.png`, `icon-512.png`) are referenced by the PWA manifest but not yet generated; "Add to Home Screen" will fall back to a generic icon.
