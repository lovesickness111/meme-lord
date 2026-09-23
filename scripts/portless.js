#!/usr/bin/env node
// Launch portless on a non-privileged proxy port (no sudo, no root-owned
// files in ~/.portless). Override with PORTLESS_PORT=<port>.
import { spawn } from 'node:child_process';
import process from 'node:process';

const port = process.env.PORTLESS_PORT ?? '8443';
const args = ['portless', '--script', 'ui', ...process.argv.slice(2)];

const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', args, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, PORTLESS_PORT: port },
});

child.on('exit', (code) => process.exit(code ?? 1));
