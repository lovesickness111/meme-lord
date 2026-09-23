import { existsSync, lstatSync, mkdirSync } from 'node:fs';
import { dirname, isAbsolute, resolve, sep } from 'node:path';
import { MemeError } from './spec.js';

/**
 * Path confinement (DESIGN-v2 §3.5).
 *
 * - `permissive` (local CLI default): paths are used as given, unless
 *   MEME_INPUT_ROOT / MEME_OUTPUT_ROOT are set, in which case they confine.
 * - `confined` (MCP/HTTP default): inputs must resolve under MEME_INPUT_ROOT
 *   (default cwd), outputs under the output root (default `./.memes/`);
 *   absolute paths, `..`, and symlinks are rejected; filesystem reads of
 *   arbitrary images require MEME_ALLOW_FS=1.
 *
 * Overwriting an existing output file is refused everywhere unless
 * `--force` / `output.overwrite` is given.
 */
export type PathPolicy = 'permissive' | 'confined';

let policy: PathPolicy = 'permissive';

export function setPathPolicy(p: PathPolicy): void {
  policy = p;
}

export function getPathPolicy(): PathPolicy {
  return policy;
}

/** Default output root: MEME_OUTPUT_ROOT > SYNARA_ARTIFACTS_DIR > ./.memes */
export function outputRootDir(): string {
  return process.env.MEME_OUTPUT_ROOT ?? process.env.SYNARA_ARTIFACTS_DIR ?? './.memes';
}

function inputRootDir(): string | undefined {
  if (process.env.MEME_INPUT_ROOT) return process.env.MEME_INPUT_ROOT;
  return policy === 'confined' ? process.cwd() : undefined;
}

function assertNoSymlink(target: string, root: string): void {
  let current = target;
  const stop = resolve(root);
  for (;;) {
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) {
      throw new MemeError('PATH_DENIED', `symlink not allowed: "${current}"`, {
        path: current,
        root,
      });
    }
    if (current === stop) break;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
}

function confine(p: string, root: string): string {
  if (isAbsolute(p)) {
    throw new MemeError('PATH_DENIED', `absolute path not allowed: "${p}"`, { path: p, root });
  }
  if (p.split(/[\\/]/).includes('..')) {
    throw new MemeError('PATH_DENIED', `".." not allowed in path: "${p}"`, { path: p, root });
  }
  const resolvedRoot = resolve(root);
  const resolved = resolve(resolvedRoot, p);
  if (resolved !== resolvedRoot && !resolved.startsWith(resolvedRoot + sep)) {
    throw new MemeError('PATH_DENIED', `path escapes root: "${p}"`, { path: p, root });
  }
  assertNoSymlink(resolved, resolvedRoot);
  return resolved;
}

/** Resolve an input image path (base.path / cells[].image) under the policy. */
export function resolveInputPath(p: string): string {
  if (policy === 'confined' && process.env.MEME_ALLOW_FS !== '1') {
    throw new MemeError(
      'PATH_DENIED',
      'filesystem image reads are disabled on this surface; use a template id, or set MEME_ALLOW_FS=1',
      { path: p },
    );
  }
  const root = inputRootDir();
  return root ? confine(p, root) : p;
}

/**
 * Confine an output path under the root. Paths that already resolve inside
 * the root (e.g. names from `defaultOutputName`, which prefix the root) are
 * accepted as-is instead of being re-prefixed or rejected as absolute.
 */
function confineOutput(p: string, root: string): string {
  const resolvedRoot = resolve(root);
  const resolved = resolve(p);
  if (resolved === resolvedRoot || resolved.startsWith(resolvedRoot + sep)) {
    assertNoSymlink(resolved, resolvedRoot);
    return resolved;
  }
  return confine(p, root);
}

/**
 * Resolve an output path under the policy, refuse overwrite unless allowed,
 * and create the parent directory.
 */
export function resolveOutputPath(p: string, overwrite: boolean): string {
  const root =
    policy === 'confined' || process.env.MEME_OUTPUT_ROOT || process.env.SYNARA_ARTIFACTS_DIR
      ? outputRootDir()
      : undefined;
  const resolved = root ? confineOutput(p, root) : resolve(p);
  if (!overwrite && existsSync(resolved)) {
    throw new MemeError(
      'PATH_DENIED',
      `refusing to overwrite existing file "${p}" (pass --force / output.overwrite)`,
      { path: p },
    );
  }
  mkdirSync(dirname(resolved), { recursive: true });
  return resolved;
}
