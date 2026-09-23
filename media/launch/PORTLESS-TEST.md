# Portless no-sudo test report

Verifies that `meme ui` behind [portless](https://portless.sh) works without sudo and without leaving root-owned files in `~/.portless`, using a non-privileged proxy port (`PORTLESS_PORT=8443`).

## Root cause

portless binds port 443 by default. 443 is a privileged port on macOS/Linux, so portless elevates with sudo. Files that the elevated process creates or updates under `~/.portless` (notably `ca.srl`, the CA serial file) end up owned by root. A later non-sudo run cannot write to them and silently generates a broken (0-byte) host certificate, so HTTPS fails.

Running the proxy on a port above 1024 (`PORTLESS_PORT=8443`) removes the need for elevation entirely, so all state files stay owned by the user. The only step that may still ask for sudo is the one-time CA trust into the system store, which does not touch the per-user cert state (on Linux it leaves only a harmless root-owned `ca.trusted` marker).

## Linux (fresh `node:20` Docker container, non-root `node` user)

Setup: `git clone` + `npm ci` + `npm run build` in `node:20`, running as the unprivileged `node` user.

1. Documented default flow, port 443:

   ```
   $ npx portless
   Proxy is not running and no TTY is available for sudo.
   Option 1: start the proxy in a terminal (will prompt for sudo):
     sudo portless proxy start --https
   Option 2: use an unprivileged port (no sudo needed, URLs will include :1355):
     portless proxy start --port 1355 --https
   ```

   Reproduced: port 443 requires root/sudo; without it portless cannot start.

2. Non-privileged port:

   ```
   $ PORTLESS_PORT=8443 npx portless
   HTTPS/2 proxy started on port 8443
     -> https://meme.localhost:8443
   meme ui listening at https://meme.localhost:8443 (Ctrl+C to stop)
   ```

   * `curl -sk https://meme.localhost:8443/` -> **HTTP 200**
   * `curl -sk https://meme.localhost:8443/api/templates` -> **200**, template JSON array
   * `POST /api/render` with `{"base":{"kind":"template","id":"afraid-to-ask-andy"},"texts":[...]}` -> **200**, rendered image payload
   * `find ~/.portless -user root` -> only `ca.trusted` (marker written by the one-time CA-trust step; harmless). All cert/state files (`ca.srl`, `ca-key.pem`, `server.pem`, ...) owned by the user.

   Note: `npm run ui:portless` (the new `scripts/portless.js` launcher) produced the same result.

## Windows (GitHub Actions, `windows-latest`, Node 20)

Workflow: `.github/workflows/portless-test.yml` (run [29833901210](https://github.com/kartikkabadi/meme-maker/actions/runs/29833901210)).

* `npm ci` + `npm run build` -> OK
* `npx portless proxy start --port 8443 --https --foreground` -> `HTTPS/2 proxy listening on 127.0.0.1:8443` (~18 s to first response; CA generation + Windows cert store)
* `PORTLESS_PORT=8443 npx portless` -> `meme ui` started with `PORT=4445`, printed `-> https://meme.localhost:8443`
* `curl -k https://meme.localhost:8443/` -> **HTTP 200**
* `curl -k https://meme.localhost:8443/api/templates` -> **200**, template JSON array

Windows caveat found in CI: the plain `PORTLESS_PORT=8443 npx portless` one-liner failed on a cold machine because it takes portless ~15-30 s to generate the CA and start the proxy, and the CLI's auto-start wait timed out on the slow runner. Starting the proxy first (`npx portless proxy start --port 8443 --https`) and then running `npx portless` is reliable. On a normal dev machine the one-liner works.

## Fix

* `docs/PORTLESS.md`: the recommended command is now `PORTLESS_PORT=8443 npx portless` (no sudo). Port 443 is still documented but marked as requiring sudo and potentially leaving root-owned files. A Troubleshooting section covers the recovery: `sudo chown -R $(whoami) ~/.portless`, then re-run with `PORTLESS_PORT=8443`.
* `scripts/portless.js`: tiny cross-platform Node launcher that defaults `PORTLESS_PORT` to 8443 and spawns `npx portless --script ui`. No new dependencies.
* `package.json`: `ui:portless` now runs `node scripts/portless.js`.
