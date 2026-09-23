import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { MemeError } from './spec.js';

const REPO = 'kartikkabadi/meme-maker';

/** Default install dir for fetched templates (used when no assets are bundled). */
export function defaultFetchDir(): string {
  const base = process.env.XDG_CACHE_HOME ?? join(homedir(), '.cache');
  return join(base, 'meme-maker', 'templates');
}

/**
 * Download the template pack (assets/templates) from GitHub and install it
 * into `dest`. Used by slim installs that do not bundle templates in npm.
 */
export async function fetchTemplates(opts: { dest?: string; ref?: string } = {}): Promise<string> {
  const dest = opts.dest ?? defaultFetchDir();
  const ref = opts.ref ?? 'main';
  const url = `https://codeload.github.com/${REPO}/tar.gz/${ref}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new MemeError('IO_ERROR', `template download failed: ${res.status} ${res.statusText}`, {
      url,
    });
  }
  const tarball = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(dest), { recursive: true });
  const work = mkdtempSync(join(dirname(dest), '.meme-fetch-'));
  try {
    const file = join(work, 'repo.tgz');
    writeFileSync(file, tarball);
    const tar = spawnSync('tar', ['-xzf', file, '-C', work]);
    if (tar.status !== 0) {
      throw new MemeError('IO_ERROR', `tar extraction failed: ${tar.stderr?.toString() ?? ''}`);
    }
    const top = readdirSync(work, { withFileTypes: true }).find((e) => e.isDirectory());
    if (!top) throw new MemeError('IO_ERROR', 'tarball had no top-level directory');
    const extracted = join(work, top.name, 'assets', 'templates');
    rmSync(dest, { recursive: true, force: true });
    cpSync(extracted, dest, { recursive: true });
    return dest;
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}
