# Stable local URLs with portless

[portless](https://portless.sh) gives `meme ui` a stable, named URL — `https://meme.localhost` — instead of `http://localhost:<random port>`. It is an optional convenience layer; nothing in meme-maker requires it.

## Install

portless is a devDependency, so `npm install` in the repo root is enough — `npx portless` and `npm run ui:portless` will use the local copy. To use it outside this repo, install it globally:

```sh
npm install -g portless
```

Or run it ad hoc without installing:

```sh
npx portless
```

## Run

From the repo root (after `npm run build`), run portless on a non-privileged proxy port:

```sh
PORTLESS_PORT=8443 npx portless   # -> https://meme.localhost:8443 (no sudo)
```

Equivalent npm script (sets `PORTLESS_PORT=8443` for you, works on Linux/macOS/Windows):

```sh
npm run ui:portless   # node scripts/portless.js -> https://meme.localhost:8443
```

`PORTLESS_PORT` picks the port the portless proxy listens on. The default is 443, which gives the cleanest URL (`https://meme.localhost`, no port suffix) but is a privileged port on macOS/Linux: portless has to elevate with sudo, and the elevated run can leave root-owned files in `~/.portless` that break later non-sudo runs (see Troubleshooting). Ports above 1024 like 8443 need no elevation at all.

If you still want the port-less URL:

```sh
npx portless          # -> https://meme.localhost (prompts for sudo on macOS/Linux)
```

`portless.json` at the repo root sets the app name (`meme`) and the script to run (`ui`, which starts `meme ui`). On first run, portless generates a local CA and asks to trust it (this one step may prompt for sudo). Use `portless --no-tls` for plain HTTP.

## Troubleshooting

**HTTPS fails after a sudo run (0-byte certificate, root-owned files).** If portless was ever run with sudo (e.g. to bind port 443), files under `~/.portless` — especially `ca.srl` — can end up owned by root. Later non-sudo runs then can't write to them and generate a broken (0-byte) certificate. Fix the ownership and re-run on a non-privileged port:

```sh
sudo chown -R $(whoami) ~/.portless
PORTLESS_PORT=8443 npx portless
```

## How it works

portless assigns a free port via the `PORT` environment variable and proxies `https://meme.localhost` to it. `meme ui` honors `PORT` when `--port` is not given, and when `PORTLESS_URL` is set it prints that stable URL in its output (both the machine-readable first stdout line and the human-readable stderr line).

## Public URL

portless can share the UI beyond your machine:

```sh
npx portless --funnel   # public URL via Tailscale Funnel (https://<node>.<tailnet>.ts.net)
npx portless --ngrok    # public URL via ngrok (https://<id>.ngrok.app)
```

`--funnel` requires the Tailscale CLI connected (`tailscale up`) with HTTPS certificates and Funnel enabled for the tailnet. `--ngrok` requires the ngrok CLI installed and authenticated (`ngrok config add-authtoken <token>`). In both cases the local `https://meme.localhost` URL keeps working, `portless list` shows both URLs, and the tunnel is cleaned up when `meme ui` exits.

## Without portless

Nothing changes:

```sh
meme ui              # auto-picks a free port, prints http://127.0.0.1:<port>
meme ui --port 8787  # pin a port
```

If portless is not installed, `npx portless` will offer to fetch it; `npm run ui:portless` fails with a "portless: not found" style error — just fall back to `meme ui`.
