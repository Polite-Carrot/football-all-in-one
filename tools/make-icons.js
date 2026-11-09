#!/usr/bin/env node
/* make-icons.js — draw the app icon and write every native size.
 *
 *   node tools/make-icons.js
 *
 * The icon is drawn here as SVG (a ball on a floodlit centre circle), then
 * rendered by headless Chrome and resized with Python's Pillow into the iOS
 * and Android icon sets. The native splash is plain black, matching the
 * Polite Carrot boot lockup the web layer shows next. */

'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const C = 512, CY = 528, R = 250;

function polygon(cx, cy, r, rot) {
  const pts = [];
  for (let i = 0; i < 5; i++) {
    const a = (rot + i * 72) * Math.PI / 180;
    pts.push((cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1));
  }
  return pts.join(' ');
}

function ball(cx, cy, r) {
  const k = r / 250;
  const inner = 84 * k;
  let patches = '<polygon points="' + polygon(cx, cy, inner, -90) + '"/>';
  let seams = '';
  for (let i = 0; i < 5; i++) {
    const a = -90 + 36 + i * 72;
    const ox = cx + 222 * k * Math.cos(a * Math.PI / 180);
    const oy = cy + 222 * k * Math.sin(a * Math.PI / 180);
    patches += '<polygon points="' + polygon(ox, oy, 84 * k, a + 180) + '"/>';
    const v = (-90 + i * 72) * Math.PI / 180;
    seams += '<line x1="' + (cx + inner * Math.cos(v)).toFixed(1) + '" y1="' + (cy + inner * Math.sin(v)).toFixed(1) +
      '" x2="' + (cx + 158 * k * Math.cos(v)).toFixed(1) + '" y2="' + (cy + 158 * k * Math.sin(v)).toFixed(1) + '"/>';
  }
  return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="url(#ballShade)"/>' +
    '<g clip-path="url(#ballClip)"><g fill="#121c16">' + patches + '</g>' +
    '<g stroke="#121c16" stroke-width="' + (10 * k).toFixed(1) + '" stroke-linecap="round">' + seams + '</g></g>' +
    '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="#0b130e" stroke-opacity=".35" stroke-width="' + (6 * k).toFixed(1) + '"/>';
}

const DEFS = (r) => '<defs>' +
  '<radialGradient id="turf" cx="50%" cy="28%" r="80%"><stop offset="0" stop-color="#23753f"/><stop offset=".5" stop-color="#0e321c"/><stop offset="1" stop-color="#04110a"/></radialGradient>' +
  '<pattern id="stripes" width="1024" height="128" patternUnits="userSpaceOnUse"><rect width="1024" height="64" fill="#fff" fill-opacity=".04"/></pattern>' +
  '<radialGradient id="ballShade" cx="36%" cy="30%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset=".62" stop-color="#e6eee8"/><stop offset="1" stop-color="#a9b9ae"/></radialGradient>' +
  '<radialGradient id="halo" cx="50%" cy="50%" r="50%"><stop offset=".55" stop-color="#c8f03c" stop-opacity=".45"/><stop offset="1" stop-color="#c8f03c" stop-opacity="0"/></radialGradient>' +
  '<clipPath id="ballClip"><circle cx="' + C + '" cy="' + CY + '" r="' + r + '"/></clipPath></defs>';

function fullIcon() {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">' + DEFS(R) +
    '<rect width="1024" height="1024" fill="url(#turf)"/><rect width="1024" height="1024" fill="url(#stripes)"/>' +
    '<g fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="12"><circle cx="' + C + '" cy="' + CY + '" r="380"/>' +
    '<line x1="0" y1="' + CY + '" x2="1024" y2="' + CY + '"/></g>' +
    '<circle cx="' + C + '" cy="' + CY + '" r="330" fill="url(#halo)"/>' +
    '<circle cx="' + C + '" cy="' + CY + '" r="292" fill="none" stroke="#c8f03c" stroke-width="20"/>' +
    ball(C, CY, R) + '</svg>';
}

/* Android adaptive foreground: the ball and its ring inside the 66% safe zone. */
function foreground() {
  const r = 190;
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">' + DEFS(r).replace('cy="' + CY + '"', 'cy="512"') +
    '<circle cx="512" cy="512" r="222" fill="none" stroke="#c8f03c" stroke-width="16"/>' +
    ball(512, 512, r).replace(/url\(#ballClip\)/, 'url(#ballClip)') + '</svg>';
}

function render(svg, out, transparent) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'icon-'));
  const html = path.join(dir, 'i.html');
  fs.writeFileSync(html, '<!doctype html><html><head><style>html,body{margin:0;background:transparent}svg{display:block}</style></head><body>' + svg + '</body></html>');
  const args = ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--window-size=1024,1024', '--screenshot=' + out];
  if (transparent) args.push('--default-background-color=00000000');
  args.push('file://' + html);
  execFileSync(CHROME, args, { stdio: 'ignore' });
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'icons-'));
fs.mkdirSync(path.join(ROOT, 'resources'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'resources/icon.svg'), fullIcon());
fs.writeFileSync(path.join(ROOT, 'resources/icon-foreground.svg'), foreground());
fs.writeFileSync(path.join(ROOT, 'assets/app-icon.svg'), fullIcon());
render(fullIcon(), path.join(tmp, 'full.png'), false);
render(foreground(), path.join(tmp, 'fg.png'), true);
fs.copyFileSync(path.join(tmp, 'full.png'), path.join(ROOT, 'resources/icon-1024.png'));

const py = `
import sys
from PIL import Image, ImageDraw
root, tmp = sys.argv[1], sys.argv[2]
full = Image.open(tmp + '/full.png').convert('RGB')
fg = Image.open(tmp + '/fg.png').convert('RGBA')
res = root + '/android/app/src/main/res/'
full.save(root + '/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png')
def rounded(img, size, radius):
    im = img.resize((size, size), Image.LANCZOS).convert('RGBA')
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    im.putalpha(mask)
    return im
def round_(img, size):
    im = img.resize((size, size), Image.LANCZOS).convert('RGBA')
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, size - 1, size - 1], fill=255)
    im.putalpha(mask)
    return im
for d, s in [('mdpi', 48), ('hdpi', 72), ('xhdpi', 96), ('xxhdpi', 144), ('xxxhdpi', 192)]:
    rounded(full, s, int(s * 0.18)).save(res + 'mipmap-' + d + '/ic_launcher.png')
    round_(full, s).save(res + 'mipmap-' + d + '/ic_launcher_round.png')
    fg.resize((int(s * 2.25), int(s * 2.25)), Image.LANCZOS).save(res + 'mipmap-' + d + '/ic_launcher_foreground.png')
black = (0, 0, 0)
splashes = {'drawable': (480, 320)}
for d, (w, h) in [('mdpi', (320, 480)), ('hdpi', (480, 800)), ('xhdpi', (720, 1280)), ('xxhdpi', (960, 1600)), ('xxxhdpi', (1280, 1920))]:
    splashes['drawable-port-' + d] = (w, h)
    splashes['drawable-land-' + d] = (h, w)
for folder, size in splashes.items():
    Image.new('RGB', size, black).save(res + folder + '/splash.png')
for name in ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']:
    Image.new('RGB', (2732, 2732), black).save(root + '/ios/App/App/Assets.xcassets/Splash.imageset/' + name)
print('icons and splashes written')
`;
execFileSync('python3', ['-c', py, ROOT, tmp], { stdio: 'inherit' });
