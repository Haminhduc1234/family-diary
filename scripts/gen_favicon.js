const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6" />
      <stop offset="100%" stop-color="#1d4ed8" />
    </linearGradient>
    <linearGradient id="heart" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fb7185" />
      <stop offset="100%" stop-color="#f43f5e" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.25"/>
    </filter>
  </defs>

  <!-- Background rounded squircle -->
  <rect width="128" height="128" rx="28" fill="url(#bg)" />

  <!-- Subtle inner border -->
  <rect x="2" y="2" width="124" height="124" rx="26" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2" />

  <!-- Heart floating above -->
  <path d="M64 19 C60 13 52.5 13 48.5 18.5 C43 26 53.5 35 64 42 C74.5 35 85 26 79.5 18.5 C75.5 13 68 13 64 19 Z" fill="url(#heart)" filter="url(#shadow)" />

  <!-- Left Parent (Father / Mother) -->
  <circle cx="36" cy="46" r="11" fill="#ffffff" filter="url(#shadow)" />
  <path d="M19 98 C19 78 28 69 42 69 C48 69 53 73 55 77 C48 82 45 89 45 98 Z" fill="#ffffff" />

  <!-- Right Parent (Mother / Father) -->
  <circle cx="92" cy="46" r="11" fill="#ffffff" filter="url(#shadow)" />
  <path d="M109 98 C109 78 100 69 86 69 C80 69 75 73 73 77 C80 82 83 89 83 98 Z" fill="#ffffff" />

  <!-- Center Child -->
  <circle cx="64" cy="62" r="8.5" fill="#ffffff" filter="url(#shadow)" />
  <path d="M50 98 C50 85 55 79 64 79 C73 79 78 85 78 98 Z" fill="#ffffff" />
</svg>`;

async function run() {
  const publicDir = path.join(__dirname, '..', 'public');
  
  // 1. Save SVG
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent, 'utf8');

  // 2. Render PNG at 32x32 (standard favicon), 48x48, and 180x180 (Apple touch icon)
  const buf16 = await sharp(Buffer.from(svgContent)).resize(16, 16).png().toBuffer();
  const buf32 = await sharp(Buffer.from(svgContent)).resize(32, 32).png().toBuffer();
  const buf48 = await sharp(Buffer.from(svgContent)).resize(48, 48).png().toBuffer();
  const buf180 = await sharp(Buffer.from(svgContent)).resize(180, 180).png().toBuffer();

  fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), buf32);
  fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), buf16);
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), buf180);

  // 3. Multi-image ICO (16x16, 32x32, 48x48)
  const images = [
    { width: 16, height: 16, buf: buf16 },
    { width: 32, height: 32, buf: buf32 },
    { width: 48, height: 48, buf: buf48 }
  ];

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // ICO format
  header.writeUInt16LE(images.length, 4); // Number of images

  let currentOffset = 6 + (images.length * 16);
  const dirEntries = [];

  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.width, 0);
    entry.writeUInt8(img.height, 1);
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(img.buf.length, 8); // Image size in bytes
    entry.writeUInt32LE(currentOffset, 12); // Offset to image data
    dirEntries.push(entry);
    currentOffset += img.buf.length;
  }

  const icoBuf = Buffer.concat([header, ...dirEntries, ...images.map(img => img.buf)]);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuf);

  console.log('Generated family favicon successfully!');
}

run().catch(console.error);
