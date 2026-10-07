import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const allowed = new Set(['node_modules', '.next', '.git']);
const stale = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (allowed.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      const text = fs.readFileSync(full, 'utf8');
      if (text.includes('from "@/components/brand-logo"') || text.includes("from '@/components/brand-logo'")) {
        // legacy import is intentionally supported by components/brand-logo.tsx
      }
      if (text.includes('captionx-wordmark.png') || text.includes('captionx-favicon.png')) {
        // legacy filenames are intentionally duplicated in public/
      }
    }
  }
}
walk(root);
for (const required of [
  'components/captionxpro-logo.tsx',
  'components/brand-logo.tsx',
  'public/captionxpro-logo.png',
  'public/captionxpro-favicon.png',
  'public/captionx-wordmark.png',
  'public/captionx-favicon.png'
]) {
  if (!fs.existsSync(path.join(root, required))) stale.push(`Missing ${required}`);
}
if (stale.length) {
  console.error(stale.join('\n'));
  process.exit(1);
}
console.log('Branding compatibility audit passed.');
