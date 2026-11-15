import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const brandDir = join(__dirname, '..', 'public', 'brand')

// SVG base icon - simplified without metadata
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="112" fill="#32113f"/>
  <polygon points="124.75,243.50 387.25,137.25 281.00,374.75" fill="#a27937"/>
  <polygon points="387.25,137.25 224.75,274.75 281.00,374.75" fill="#7d5a26"/>
</svg>`

// Maskable icon needs safe zone padding (10% on each side)
// Icon content should be within 80% of the total area
const svgMaskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#32113f"/>
  <g transform="translate(51.2, 51.2) scale(0.8)">
    <rect width="512" height="512" rx="112" fill="#32113f"/>
    <polygon points="124.75,243.50 387.25,137.25 281.00,374.75" fill="#a27937"/>
    <polygon points="387.25,137.25 224.75,274.75 281.00,374.75" fill="#7d5a26"/>
  </g>
</svg>`

async function generateIcons() {
  try {
    // Generate 192x192 icon
    await sharp(Buffer.from(svgIcon))
      .resize(192, 192)
      .png()
      .toFile(join(brandDir, 'icon-192.png'))
    console.log('✓ Generated icon-192.png')

    // Generate 512x512 maskable icon
    await sharp(Buffer.from(svgMaskable))
      .resize(512, 512)
      .png()
      .toFile(join(brandDir, 'icon-512-maskable.png'))
    console.log('✓ Generated icon-512-maskable.png')

    console.log('\nDone! Icons generated in public/brand/')
  } catch (error) {
    console.error('Error generating icons:', error)
    process.exit(1)
  }
}

generateIcons()
