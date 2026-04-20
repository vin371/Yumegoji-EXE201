/**
 * Xóa nền trắng sprite (flood-fill từ mép ảnh) — ghi đè PNG trong src/assets.
 * Chạy: npm install sharp --no-save && node scripts/knockout-sprite-white.mjs
 */
import { Buffer } from 'node:buffer';
import fs from 'node:fs/promises';
import process from 'node:process';
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assets = path.join(__dirname, '../src/assets');

const FILES = [
  'ninja_part_1.png',
  'ninja_part_2.png',
  'ninja_part_3.png',
  'ghost_part_1.png',
  'ghost_part_2.png',
  'ghost_part_3.png',
];

const THRESH = 248;

function at(w, x, y) {
  return (y * w + x) * 4;
}

/** Chuẩn hóa buffer pixel thành RGBA (một số PNG raw từ sharp = 3 kênh). */
function toRgbaBuffer(data, w, h, channels) {
  if (channels === 4) {
    return Buffer.from(data);
  }
  if (channels === 3) {
    const src = Buffer.from(data);
    const out = Buffer.alloc(w * h * 4);
    for (let p = 0; p < w * h; p += 1) {
      const s = p * 3;
      const d = p * 4;
      out[d] = src[s];
      out[d + 1] = src[s + 1];
      out[d + 2] = src[s + 2];
      out[d + 3] = 255;
    }
    return out;
  }
  throw new Error(`Cần ảnh RGB hoặc RGBA (nhận được ${channels} kênh)`);
}

async function knockoutFile(name) {
  const fp = path.join(assets, name);
  const { data, info } = await sharp(fp).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const ch = info.channels;
  const buf = toRgbaBuffer(data, w, h, ch);
  const seen = new Uint8Array(w * h);

  const isNearWhite = (i) => buf[i] >= THRESH && buf[i + 1] >= THRESH && buf[i + 2] >= THRESH;

  const qx = [];
  const qy = [];

  const enqueue = (x, y) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const ti = y * w + x;
    if (seen[ti]) return;
    const i = at(w, x, y);
    if (!isNearWhite(i)) return;
    seen[ti] = 1;
    buf[i + 3] = 0;
    qx.push(x);
    qy.push(y);
  };

  for (let x = 0; x < w; x += 1) {
    enqueue(x, 0);
    enqueue(x, h - 1);
  }
  for (let y = 0; y < h; y += 1) {
    enqueue(0, y);
    enqueue(w - 1, y);
  }

  let head = 0;
  while (head < qx.length) {
    const x = qx[head];
    const y = qy[head];
    head += 1;
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  const pngBuf = await sharp(buf, { raw: { width: w, height: h, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toBuffer();

  await fs.writeFile(fp, pngBuf);

  process.stdout.write(`knockout OK ${name}\n`);
}

async function main() {
  for (const f of FILES) {
    await knockoutFile(f);
  }
}

main().catch((err) => {
  process.stderr.write(`${err.stack || err}\n`);
  process.exit(1);
});
