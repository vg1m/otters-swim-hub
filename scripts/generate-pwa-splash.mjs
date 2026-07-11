/**
 * Generates PWA splash / launch assets from public/otters-logo.png and icons/icon.svg.
 * Run: node scripts/generate-pwa-splash.mjs
 */
import sharp from 'sharp'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const logoPath = path.join(root, 'public', 'otters-logo.png')
const iconSvgPath = path.join(root, 'public', 'icons', 'icon.svg')
const iconsDir = path.join(root, 'public', 'icons')

async function compositeLogoOnWhite({ width, height, logoMaxWidth }) {
  const logoBuf = await sharp(logoPath).resize({ width: logoMaxWidth, fit: 'inside' }).toBuffer()
  const { width: lw, height: lh } = await sharp(logoBuf).metadata()
  const left = Math.round((width - lw) / 2)
  const top = Math.round((height - lh) / 2)
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: logoBuf, left, top }])
    .png()
}

async function main() {
  if (!fs.existsSync(logoPath)) {
    console.error('Missing public/otters-logo.png')
    process.exit(1)
  }
  fs.mkdirSync(iconsDir, { recursive: true })

  await compositeLogoOnWhite({ width: 512, height: 512, logoMaxWidth: 400 }).toFile(
    path.join(iconsDir, 'pwa-splash-512.png')
  )

  await compositeLogoOnWhite({ width: 1284, height: 2778, logoMaxWidth: 880 }).toFile(
    path.join(root, 'public', 'pwa-apple-splash.png')
  )

  await sharp(iconSvgPath).resize(180, 180).png().toFile(path.join(iconsDir, 'apple-touch-icon.png'))

  console.log('Generated public/icons/pwa-splash-512.png')
  console.log('Generated public/pwa-apple-splash.png')
  console.log('Generated public/icons/apple-touch-icon.png')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
