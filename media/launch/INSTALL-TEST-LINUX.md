# Linux Install Test — curl installer (v0.3.1)

Date: 2026-07-21 · Tester: Devin (fresh Docker containers) · Verdict: **PASS**

Install command tested (exact, no npm):

```
curl -fsSL https://raw.githubusercontent.com/kartikkabadi/meme-maker/main/install.sh | sh
```

## Results

| # | Step | Environment | Result |
|---|------|-------------|--------|
| 1 | Install on bare `ubuntu:24.04` (curl/tar only, no Node) | ubuntu:24.04 | EXPECTED FAIL — installer exits cleanly with "Node.js is required" (install.sh:55) and points to install instructions. Documented behavior (Node >= 20 required, no npm). |
| 2 | Install on `node:20` | node:20 (Node v20.20.2) | PASS — installed to `/root/.meme-maker`, symlinked `meme` and `meme-maker-mcp` into `/usr/local/bin`, used pre-built linux-x64 release tarball |
| 3 | `meme --version` | node:20 | PASS — `0.3.1` |
| 4 | `meme templates list \| wc -l` | node:20 | PASS — `609` |
| 5 | Render: `meme render --template drake --text no="MANUAL" --text yes="AGENT" -o /tmp/test-meme.png` | node:20 | PASS — `wrote /tmp/test-meme.png (1200x1200 png, 1323154 bytes)`; `file` confirms `PNG image data, 1200 x 1200, 8-bit/color RGBA` |
| 6 | MCP server initialize (JSON-RPC over stdin) | node:20 | PASS — response: `{"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{"listChanged":true}},"serverInfo":{"name":"meme-maker","version":"0.3.1"}},"jsonrpc":"2.0","id":1}` |
| 7 | Custom prefix: `PREFIX=/tmp/meme-test sh` | node:20 | PASS — `meme` and `meme-maker-mcp` in `/tmp/meme-test/bin`, `--version` returns `0.3.1` |

## Notes

- Node >= 20 is a hard prerequisite; the installer detects its absence and fails
  with a clear, actionable error (not a bug).
- Installer output includes correct get-started and uninstall instructions,
  including the custom PREFIX path when used.
- No errors or warnings observed in any passing step.
