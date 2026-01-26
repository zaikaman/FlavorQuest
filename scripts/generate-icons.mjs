/**
 * Icon Generation Script for FlavorQuest PWA
 * 
 * Tạo các icon PNG từ SVG cho PWA manifest
 * 
 * Yêu cầu:
 * - Node.js 18+
 * - sharp package
 * 
 * Chạy:
 * node scripts/generate-icons.mjs
 */

import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const SOURCE_SVG = join(rootDir, 'public', 'icons', 'icon.svg');
const OUTPUT_DIR = join(rootDir, 'public', 'icons');

async function generateIcons() {
  console.log('🎨 Generating PWA icons from SVG...\n');

  try {
    const svgBuffer = readFileSync(SOURCE_SVG);

    for (const size of ICON_SIZES) {
      const outputPath = join(OUTPUT_DIR, `icon-${size}x${size}.png`);

      await sharp(svgBuffer)
        .resize(size, size)
        .png({ quality: 100 })
        .toFile(outputPath);

      console.log(`✓ Generated icon-${size}x${size}.png`);
    }

    console.log('\n✅ All icons generated successfully!');
  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
