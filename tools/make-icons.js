#!/usr/bin/env node
/* make-icons.js — draw the app icon and write every native size.
 *
 *   node tools/make-icons.js
 *
 * The icon is drawn here as SVG (a question mark whose dot is a football), then
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

/* "?" is Barlow Condensed ExtraBold (SIL OFL), the app's title face,
   without its dot: the football takes the dot's place. Glyph units, y down. */
const STEM = 'M122 469V445Q122 407 134 379.5Q146 352 163 334.5Q180 317 208 294Q239 269 253 251.5Q267 234 267 209Q267 182 254.5 166.5Q242 151 220 151Q195 151 180.5 168.5Q166 186 166 214V225Q166 236 154 236L12 230Q7 230 3.5 226Q0 222 0 217V214Q0 151 28 102.5Q56 54 107 27Q158 0 224 0Q320 0 377.5 55Q435 110 435 201Q435 245 422 277Q409 309 391 328.5Q373 348 344 372Q315 394 301 412Q287 430 287 455V469Q287 474 283.5 477.5Q280 481 275 481H134Q129 481 125.5 477.5Q122 474 122 469Z';
const INK = '#08150d';

function polygon(cx, cy, r, rot) {
  const pts = [];
  for (let i = 0; i < 5; i++) {
    const a = (rot + i * 72) * Math.PI / 180;
    pts.push((cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1));
  }
  return pts.join(' ');
}

/* Classic black-and-white ball: a centre pentagon, seams, and pentagons clipped by the rim. */
function ball(cx, cy, r) {
  let patches = '<polygon points="' + polygon(0, 0, 78, -90) + '"/>';
  let seams = '';
  for (let i = 0; i < 5; i++) {
    const a = -90 + i * 72, rad = a * Math.PI / 180;
    patches += '<polygon points="' + polygon(264 * Math.cos(rad), 264 * Math.sin(rad), 72, a + 180) + '"/>';
    seams += '<line x1="' + (78 * Math.cos(rad)).toFixed(1) + '" y1="' + (78 * Math.sin(rad)).toFixed(1) +
      '" x2="' + (192 * Math.cos(rad)).toFixed(1) + '" y2="' + (192 * Math.sin(rad)).toFixed(1) + '"/>';
  }
  return '<g transform="translate(' + cx + ' ' + cy + ') scale(' + (r / 256) + ')">' +
    '<defs><clipPath id="ballClip"><circle r="256"/></clipPath></defs>' +
    '<circle r="256" fill="#fff"/>' +
    '<g clip-path="url(#ballClip)"><g fill="' + INK + '" stroke="' + INK + '" stroke-width="8" stroke-linejoin="round">' + patches + '</g>' +
    '<g stroke="' + INK + '" stroke-width="14" stroke-linecap="round">' + seams + '</g></g>' +
    '<circle r="256" fill="none" stroke="' + INK + '" stroke-width="14"/></g>';
}

const TURF = '#c8f03c';
const MOWN = '#c1ea35';
const LINE = '#a1cc1b';

/* Pitch from above: mown stripes, halfway line, centre circle, and a penalty box and six-yard box at each end. */
function pitch() {
  let stripes = '';
  for (let y = -1024; y < 2048; y += 256) stripes += '<rect x="-1100" y="' + y + '" width="3300" height="128" fill="' + MOWN + '"/>';
  const end = '<rect x="192" y="-300" width="640" height="450"/><rect x="352" y="-300" width="320" height="330"/>';
  return stripes + '<g fill="none" stroke="' + LINE + '" stroke-width="12">' +
    '<line x1="-1100" y1="512" x2="2200" y2="512"/><circle cx="512" cy="512" r="250"/>' +
    '<g>' + end + '</g><g transform="translate(0 1024) scale(1 -1)">' + end + '</g></g>';
}

function emblem() {
  return '<g transform="translate(280 102.3) scale(1.1)"><path d="' + STEM + '" fill="' + INK + '"/>' + ball(204.5, 627, 118) + '</g>';
}

function fullIcon() {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">' +
    '<rect width="1024" height="1024" fill="' + TURF + '"/>' + pitch() + emblem() + '</svg>';
}

/* Android adaptive foreground: keep the complete mark inside the 66dp safe circle. */
function foreground() {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">' +
    '<g transform="translate(512 512) scale(.7) translate(-512 -512)">' + emblem() + '</g></svg>';
}

/* Android adaptive background: the pitch at the same 70% scale as the foreground, since only the middle shows. */
function background() {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">' +
    '<rect width="1024" height="1024" fill="' + TURF + '"/>' +
    '<g transform="translate(512 512) scale(.7) translate(-512 -512)">' + pitch() + '</g></svg>';
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
render(background(), path.join(tmp, 'bg.png'), false);
fs.copyFileSync(path.join(tmp, 'full.png'), path.join(ROOT, 'resources/icon-1024.png'));

const py = `
import sys
from PIL import Image, ImageDraw
root, tmp = sys.argv[1], sys.argv[2]
full = Image.open(tmp + '/full.png').convert('RGB')
fg = Image.open(tmp + '/fg.png').convert('RGBA')
bg = Image.open(tmp + '/bg.png').convert('RGB')
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
    bg.resize((int(s * 2.25), int(s * 2.25)), Image.LANCZOS).save(res + 'mipmap-' + d + '/ic_launcher_background.png')
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
