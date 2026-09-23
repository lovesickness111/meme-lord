# Docker

Run meme-maker in a container: the `meme` CLI, the MCP server, and the local web UI.

## Build

```sh
scripts/docker-build.sh            # builds meme-maker:latest
scripts/docker-build.sh my/tag:v1  # custom tag
```

The image is a multi-stage Node 20 build: dependencies and the TypeScript/Vite
build run in a builder stage; the runtime stage contains only production
dependencies, `dist/`, and `assets/`.

## CLI

The image's entrypoint is `meme`, so pass subcommands directly:

```sh
docker run --rm meme-maker templates list
docker run --rm -v "$PWD:/work" -e MEME_OUTPUT_ROOT=/work -w /work \
  meme-maker render --template drake --text no="old" --text yes="new" --out out.png
```

Note: rendered output must go to a mounted volume. The output root is
confined, so pass `--out` as a path relative to `MEME_OUTPUT_ROOT`
(absolute paths are rejected with `PATH_DENIED`).

## Web UI

```sh
docker run --rm -p 3456:3456 meme-maker
# then open http://127.0.0.1:3456
```

The container sets `MEME_UI_HOST=0.0.0.0` so the server is reachable through
Docker's port mapping (outside a container the UI binds `127.0.0.1` only).
Render history is stored in `/home/node/.meme-maker`.

## docker-compose

```sh
docker compose up --build
```

Starts the UI on port 3456 with a named volume (`meme-history`) persisting
render history across restarts.

## MCP server

The MCP server speaks JSON-RPC over stdio:

```sh
docker run --rm -i --entrypoint meme-maker-mcp meme-maker
```

## Environment variables

All `MEME_*` limits and path variables work as documented in DESIGN-v2
(e.g. `MEME_ALLOW_FS`, `MEME_INPUT_ROOT`, `MEME_OUTPUT_ROOT`,
`MEME_HISTORY_DIR`, `MEME_MAX_*`). Pass them with `-e` / compose `environment`.
