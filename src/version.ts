import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json');

/** Package version, read from package.json so all surfaces stay in sync. */
export const VERSION = (JSON.parse(readFileSync(pkgPath, 'utf8')) as { version: string }).version;
