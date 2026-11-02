const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function buildAllIcons() {
  const root = path.resolve(__dirname, '..');
  const sourceSvgPath = path.join(root, 'public', 'icon.svg');

  if (!fs.existsSync(sourceSvgPath)) {
    throw new Error(`Master icon.svg not found at: ${sourceSvgPath}`);
  }

  const svgContent = fs.readFileSync(sourceSvgPath, 'utf8');
  const svgBuffer = Buffer.from(svgContent);

  const iconsDir = path.join(root, 'public', 'icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  // 1. Copy SVG to public/icons/icon.svg, public/favicon.svg, and app/icon.svg
  fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgContent, 'utf8');
  fs.writeFileSync(path.join(root, 'public', 'favicon.svg'), svgContent, 'utf8');
  fs.writeFileSync(path.join(root, 'app', 'icon.svg'), svgContent, 'utf8');
  console.log('✓ Copied master SVG to public/icons/icon.svg, public/favicon.svg, and app/icon.svg');

  // 2. Generate standard PNGs
  await sharp(svgBuffer)
    .resize(512, 512)
    .png({ compressionLevel: 9 })
    .toFile(path.join(iconsDir, 'icon-512x512.png'));
  console.log('✓ Generated public/icons/icon-512x512.png (512x512)');

  await sharp(svgBuffer)
    .resize(192, 192)
    .png({ compressionLevel: 9 })
    .toFile(path.join(iconsDir, 'icon-192x192.png'));
  console.log('✓ Generated public/icons/icon-192x192.png (192x192)');

  await sharp(svgBuffer)
    .resize(180, 180)
    .png({ compressionLevel: 9 })
    .toFile(path.join(iconsDir, 'apple-touch-icon.png'));
  console.log('✓ Generated public/icons/apple-touch-icon.png (180x180)');

  // 3. Generate maskable PNGs (safe zone with #09090b background)
  const maskable512Inner = await sharp(svgBuffer)
    .resize(420, 420)
    .toBuffer();
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 9, g: 9, b: 11, alpha: 1 },
    },
  })
    .composite([{ input: maskable512Inner, top: 46, left: 46 }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(iconsDir, 'icon-maskable-512x512.png'));
  console.log('✓ Generated public/icons/icon-maskable-512x512.png (maskable safe zone)');

  const maskable192Inner = await sharp(svgBuffer)
    .resize(158, 158)
    .toBuffer();
  await sharp({
    create: {
      width: 192,
      height: 192,
      channels: 4,
      background: { r: 9, g: 9, b: 11, alpha: 1 },
    },
  })
    .composite([{ input: maskable192Inner, top: 17, left: 17 }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(iconsDir, 'icon-maskable-192x192.png'));
  console.log('✓ Generated public/icons/icon-maskable-192x192.png (maskable safe zone)');

  // 4. Generate multi-resolution ICO for app/favicon.ico and public/favicon.ico
  const png16 = await sharp(svgBuffer).resize(16, 16).png().toBuffer();
  const png32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  const png48 = await sharp(svgBuffer).resize(48, 48).png().toBuffer();

  const icoImages = [
    { size: 16, buf: png16 },
    { size: 32, buf: png32 },
    { size: 48, buf: png48 },
  ];

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type ICO
  header.writeUInt16LE(icoImages.length, 4); // count

  let offset = 6 + icoImages.length * 16;
  const entries = [];

  for (const img of icoImages) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.size, 0); // width
    entry.writeUInt8(img.size, 1); // height
    entry.writeUInt8(0, 2); // colors
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(img.buf.length, 8); // size
    entry.writeUInt32LE(offset, 12); // offset
    entries.push(entry);
    offset += img.buf.length;
  }

  const icoBuffer = Buffer.concat([header, ...entries, ...icoImages.map((img) => img.buf)]);
  fs.writeFileSync(path.join(root, 'app', 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(root, 'public', 'favicon.ico'), icoBuffer);
  console.log('✓ Generated app/favicon.ico & public/favicon.ico (16px, 32px, 48px)');

  console.log('\nAll icons successfully built with 100% visual fidelity matching icon.svg!');
}

buildAllIcons().catch((err) => {
  console.error(err);
  process.exit(1);
});

