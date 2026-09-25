// Renders the brand mark (icons.ts `logo`) into store/app icons with headless Chrome, so the icon
// always matches the web favicon and the Android adaptive icon:
//   apps/ios/Padel/Resources/Assets.xcassets/AppIcon.appiconset/icon-1024.png   (App Store + device)
//   store/android/play-icon-512.png, store/android/feature-graphic.png           (Play Console)
// Run: npm run app-icons -w @padel/design
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { iconSvgColored } from '../icons.ts';

const root = new URL('../../../', import.meta.url);
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FG = '#FAFAFA';
const BG = '#0A0A0A';

function render(html: string, width: number, height: number, out: URL) {
  const dir = mkdtempSync(join(tmpdir(), 'padel-icon-'));
  const file = join(dir, 'page.html');
  const font = new URL('packages/design/fonts/Geist.ttf', root).href;
  writeFileSync(file, `<!doctype html><html><head><style>@font-face{font-family:Geist;src:url(${font});font-weight:100 900}html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden;background:${BG}}</style></head><body>${html}</body></html>`);
  mkdirSync(new URL('.', out), { recursive: true });
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', `--window-size=${width},${height}`, `--screenshot=${out.pathname}`, `file://${file}`], { stdio: 'ignore' });
  console.log(`  ${out.pathname.replace(root.pathname, '')} (${width}×${height})`);
}

const mark = (size: number) => iconSvgColored('logo', FG, size);

// Full-bleed square; iOS applies its own corner mask. Mark at ~62% like the adaptive icon inset.
const icon = (size: number) =>
  `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center">${mark(Math.round(size * 0.62))}</div>`;

render(icon(1024), 1024, 1024, new URL('apps/ios/Padel/Resources/Assets.xcassets/AppIcon.appiconset/icon-1024.png', root));
render(icon(512), 512, 512, new URL('store/android/play-icon-512.png', root));
render(
  `<div style="width:1024px;height:500px;display:flex;align-items:center;gap:40px;padding:0 90px;box-sizing:border-box;font-family:Geist,-apple-system,Helvetica,sans-serif;color:${FG}">
     ${mark(200)}
     <div><div style="font-size:68px;font-weight:700;letter-spacing:-1px">Padel</div>
     <div style="font-size:30px;color:#A3A3A3;margin-top:12px;line-height:1.3">Americano, Mexicano &amp; more.<br>Fair rotations. Live scores.</div></div>
   </div>`,
  1024,
  500,
  new URL('store/android/feature-graphic.png', root),
);
