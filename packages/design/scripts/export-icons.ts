// Writes every icon to svg/<name>.svg for the native apps and design tools.
import { mkdirSync, writeFileSync } from 'node:fs';
import { ICONS, iconSvg, type IconName } from '../icons.ts';

const out = new URL('../svg/', import.meta.url);
mkdirSync(out, { recursive: true });
for (const name of Object.keys(ICONS) as IconName[]) {
  writeFileSync(new URL(`${name}.svg`, out), iconSvg(name) + '\n');
}
console.log(`Exported ${Object.keys(ICONS).length} icons to svg/`);
