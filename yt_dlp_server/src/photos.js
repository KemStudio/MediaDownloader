const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execFile } = require('child_process');
const { URL } = require('url');

const CONTENT_TYPES = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif'
};

function isAllowedImageUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    return host.endsWith('.tiktokcdn.com')
      || host.includes('tiktokcdn')
      || host.endsWith('.ibyteimg.com')
      || host.endsWith('.byteimg.com')
      || host.endsWith('.ibytedtos.com')
      || host.endsWith('.byteoversea.com')
      || host.endsWith('.muscdn.com');
  } catch {
    return false;
  }
}

function stemFromPageUrl(pageUrl) {
  try {
    const pathname = new URL(pageUrl).pathname;
    const userId = pathname.match(/@([^/]+)/)?.[1] || 'tiktok-user';
    const postId = pathname.match(/\/(?:video|photo)\/(\d+)/)?.[1] || Date.now().toString();
    return `${userId}_${postId}`.replace(/[^a-zA-Z0-9._-]/g, '_');
  } catch {
    return `tiktok_${Date.now()}`;
  }
}

function extensionFrom(contentType, imageUrl) {
  const type = contentType.toLowerCase();
  if (type.includes('png')) return 'png';
  if (type.includes('webp')) return 'webp';
  if (type.includes('avif')) return 'avif';
  if (type.includes('gif')) return 'gif';
  if (type.includes('jpeg') || type.includes('jpg')) return 'jpg';
  const ext = new URL(imageUrl).pathname.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  if (ext === 'jpeg') return 'jpg';
  return CONTENT_TYPES[ext] ? ext : 'jpg';
}

function dosDateTime(date = new Date()) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

function zipStore(files) {
  const parts = [];
  const central = [];
  let offset = 0;
  const stamp = dosDateTime();

  files.forEach((file) => {
    const name = Buffer.from(file.name);
    const crc = zlib.crc32(file.data) >>> 0;
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(stamp.time, 10);
    local.writeUInt16LE(stamp.day, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(file.data.length, 18);
    local.writeUInt32LE(file.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    name.copy(local, 30);

    const header = Buffer.alloc(46 + name.length);
    header.writeUInt32LE(0x02014b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(20, 6);
    header.writeUInt16LE(stamp.time, 12);
    header.writeUInt16LE(stamp.day, 14);
    header.writeUInt32LE(crc, 16);
    header.writeUInt32LE(file.data.length, 20);
    header.writeUInt32LE(file.data.length, 24);
    header.writeUInt16LE(name.length, 28);
    header.writeUInt32LE(0x20, 38);
    header.writeUInt32LE(offset, 42);
    name.copy(header, 46);

    parts.push(local, file.data);
    central.push(header);
    offset += local.length + file.data.length;
  });

  const centralSize = central.reduce((sum, header) => sum + header.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, ...central, end]);
}

function execFileAsync(command, args, options) {
  return new Promise((resolve, reject) => {
    execFile(command, args, options, (error) => (error ? reject(error) : resolve()));
  });
}

async function writeZip(directory, filename, names) {
  const filePath = path.join(directory, filename);
  try {
    await execFileAsync('tar', ['-a', '-c', '-f', filename, ...names], { cwd: directory });
  } catch {
    const files = await Promise.all(names.map(async (name) => ({
      name,
      data: await fs.promises.readFile(path.join(directory, name))
    })));
    await fs.promises.writeFile(filePath, zipStore(files));
  }
  const stats = await fs.promises.stat(filePath);
  const head = Buffer.alloc(4);
  const handle = await fs.promises.open(filePath, 'r');
  await handle.read(head, 0, 4, 0);
  await handle.close();
  if (stats.size < 22 || head.toString('hex') !== '504b0304') {
    throw new Error('Không tạo được file zip.');
  }
  return { filePath, size: stats.size };
}

function looksLikeImage(data, contentType) {
  if (contentType.toLowerCase().startsWith('image/')) return data.length > 32;
  if (data.length < 12) return false;
  if (data[0] === 0xff && data[1] === 0xd8) return true;
  if (data[0] === 0x89 && data[1] === 0x50) return true;
  if (data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP') return true;
  return data.toString('ascii', 4, 12).includes('ftyp');
}

function uniqueImageUrls(imageUrls) {
  const seen = new Set();
  const unique = [];
  imageUrls.forEach((imageUrl) => {
    if (!isAllowedImageUrl(imageUrl)) return;
    const key = new URL(imageUrl).pathname;
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(imageUrl);
  });
  return unique.slice(0, 35);
}

async function fetchTikTokImage(imageUrl) {
  const response = await fetch(imageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Referer: 'https://www.tiktok.com/'
    }
  });
  if (!response.ok) throw new Error(`Không tải được ảnh (${response.status}).`);
  const data = Buffer.from(await response.arrayBuffer());
  if (!data.length) throw new Error('TikTok trả về ảnh rỗng.');
  return { data, contentType: response.headers.get('content-type') || '' };
}

async function savePhotoPost(pageUrl, imageUrls, directory) {
  const urls = uniqueImageUrls(imageUrls);
  if (!urls.length) {
    return { ok: false, error: 'Không tìm thấy ảnh TikTok để tải.' };
  }

  const images = [];
  for (const imageUrl of urls) {
    try {
      const image = await fetchTikTokImage(imageUrl);
      if (!looksLikeImage(image.data, image.contentType)) continue;
      images.push({ data: image.data, ext: extensionFrom(image.contentType, imageUrl) });
    } catch {
      continue;
    }
  }
  if (!images.length) {
    return { ok: false, error: 'Không tải được ảnh từ TikTok.' };
  }

  const stem = stemFromPageUrl(pageUrl);
  const names = images.map((image, index) => (
    images.length === 1 ? `${stem}.${image.ext}` : `${stem}_${String(index + 1).padStart(2, '0')}.${image.ext}`
  ));
  await Promise.all(names.map((name, index) => fs.promises.writeFile(path.join(directory, name), images[index].data)));

  if (names.length === 1) {
    const filePath = path.join(directory, names[0]);
    return {
      ok: true,
      filePath,
      filename: names[0],
      size: images[0].data.length,
      contentType: CONTENT_TYPES[path.extname(names[0]).slice(1)] || 'application/octet-stream'
    };
  }

  const filename = `${stem}.zip`;
  const zip = await writeZip(directory, filename, names);
  return { ok: true, filePath: zip.filePath, filename, size: zip.size, contentType: 'application/zip' };
}

module.exports = { isAllowedImageUrl, savePhotoPost, stemFromPageUrl };
