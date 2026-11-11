import { closeSync, openSync, readSync } from 'node:fs';

// Membaca lebar dan tinggi gambar dari header berkasnya, tanpa pustaka.
// Dipakai agar setiap <img> punya width/height (mencegah layout bergeser).
// Mengembalikan null bila format tidak dikenal.

function png(buffer) {
  if (buffer.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function gif(buffer) {
  if (buffer.toString('latin1', 0, 3) !== 'GIF') return null;
  return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
}

function webp(buffer) {
  if (buffer.toString('latin1', 0, 4) !== 'RIFF' || buffer.toString('latin1', 8, 12) !== 'WEBP') return null;
  const format = buffer.toString('latin1', 12, 16);
  if (format === 'VP8X') return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
  if (format === 'VP8 ') return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
  if (format === 'VP8L') {
    const bits = buffer.readUInt32LE(21);
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
  }
  return null;
}

// JPEG: telusuri segmen sampai penanda SOF yang memuat ukuran.
function jpeg(buffer) {
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1];
    const isSof = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isSof) return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
    offset += 2 + buffer.readUInt16BE(offset + 2);
  }
  return null;
}

export function imageSize(file) {
  let handle;
  try {
    handle = openSync(file, 'r');
    const buffer = Buffer.alloc(256 * 1024); // SOF pada JPEG ber-EXIF bisa cukup jauh
    const length = readSync(handle, buffer, 0, buffer.length, 0);
    const head = buffer.subarray(0, length);
    if (length < 30) return null;
    return png(head) ?? gif(head) ?? webp(head) ?? jpeg(head);
  } catch {
    return null;
  } finally {
    if (handle !== undefined) closeSync(handle);
  }
}
