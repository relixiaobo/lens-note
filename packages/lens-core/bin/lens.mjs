#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tsx = join(__dirname, '..', 'node_modules', '.bin', 'tsx');
const main = join(__dirname, '..', 'src', 'main.ts');

try {
  execFileSync(tsx, [main, ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: process.env,
  });
} catch (e) {
  process.exit(e.status || 1);
}
