import { readFile } from 'fs/promises'
import path from 'path'

const PUBLIC_LOGO_PATH = path.join(process.cwd(), 'public', 'otters-logo.png')

/** @type {{ dataUrl: string, format: string } | null | undefined} */
let cachedLogo = undefined

function detectImageFormat(buffer) {
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'PNG'
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'JPEG'
  return 'PNG'
}

/**
 * Logo for PDF receipts from public/otters-logo.png only.
 * @returns {Promise<{ dataUrl: string, format: string } | null>}
 */
export async function loadReceiptLogo() {
  if (cachedLogo !== undefined) return cachedLogo

  try {
    const buffer = await readFile(PUBLIC_LOGO_PATH)
    const format = detectImageFormat(buffer)
    const mime = format === 'JPEG' ? 'image/jpeg' : 'image/png'
    cachedLogo = {
      dataUrl: `data:${mime};base64,${buffer.toString('base64')}`,
      format,
    }
    return cachedLogo
  } catch {
    cachedLogo = null
    return null
  }
}
