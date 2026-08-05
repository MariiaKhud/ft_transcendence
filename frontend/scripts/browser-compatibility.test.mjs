import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cssPath = path.resolve(__dirname, '../src/index.css');
const css = readFileSync(cssPath, 'utf8');

test('shared stylesheet provides safe fallback colors for older browsers', () => {
  assert.match(css, /--background:\s*#fff;/);
  assert.match(css, /--foreground:\s*#111827;/);
  assert.match(css, /--border:\s*#e5e7eb;/);
  assert.match(css, /@supports \(color: oklch\(1 0 0\)\)/);
});
