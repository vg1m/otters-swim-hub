import { Outfit, Reenie_Beanie } from 'next/font/google'

/** Self-hosted via next/font — works with CSP font-src 'self' in production. */
export const fontOutfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-outfit',
  display: 'swap',
})

export const fontReenieBeanie = Reenie_Beanie({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-reenie-beanie',
  display: 'swap',
})
