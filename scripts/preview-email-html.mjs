/**
 * Write sample branded HTML emails to tmp/email-previews/ for local review.
 * Run: npm run preview:email
 */
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const outDir = path.join(root, 'tmp', 'email-previews')

process.env.NEXT_PUBLIC_EMAIL_PUBLIC_URL =
  process.env.NEXT_PUBLIC_EMAIL_PUBLIC_URL || 'https://otters.ke'

const { buildOttersEmailHtml } = await import('../lib/email/build-otters-email.js')
const { escapeHtml } = await import('../lib/email/escape-html.js')
const {
  emailDataTable,
  emailHighlightBox,
  emailInfoBox,
  emailParagraph,
} = await import('../lib/email/components.js')

const samples = [
  {
    file: 'staff-notification.html',
    html: buildOttersEmailHtml({
      preheader: 'New registration: Test Test',
      recipientName: 'Admin Demo',
      category: 'Notification',
      headline: 'New registration: Test Test',
      bodyHtml: emailParagraph(
        'Assign a squad in Swimmer Management, then approve in Registrations.',
        { muted: true }
      ),
      ctaLabel: 'View notifications',
      ctaUrl: 'https://otters.ke/admin/notifications',
    }),
  },
  {
    file: 'receipt.html',
    html: buildOttersEmailHtml({
      preheader: 'Receipt RCP-001 — KES 7,000',
      recipientName: 'Jane Parent',
      category: 'Payment',
      headline: 'Payment received',
      bodyHtml: [
        emailParagraph('Thank you for your payment! Your transaction has been successfully processed.'),
        emailInfoBox([
          ['Receipt number', escapeHtml('RCP-2026-001')],
          ['Invoice ID', escapeHtml('INV-A1B2C3D4')],
          ['Amount paid', escapeHtml('KES 7,000')],
        ]),
      ].join(''),
      ctaLabel: 'Login to dashboard',
      ctaUrl: 'https://otters.ke/login',
      footerVariant: 'payment',
    }),
  },
  {
    file: 'retention-audit.html',
    html: buildOttersEmailHtml({
      preheader: '3 records past retention window',
      headline: 'Data retention audit — 1 May 2026',
      category: 'Report',
      bodyHtml: [
        emailParagraph(
          'The monthly retention check found <strong style="color:#DC2626;">3 records</strong> that have exceeded their policy retention window.'
        ),
        emailDataTable({
          headers: ['Category', 'Count'],
          rows: [
            ['Attendance records past 2-year window', 1],
            ['Media consent records past 12 months', 0],
            ['Paid invoice records past 7-year window', 2],
          ],
        }),
        emailHighlightBox({
          title: 'No records have been automatically deleted.',
          bodyHtml:
            'Review each category in the admin panel and take action manually.',
        }),
      ].join(''),
      ctaLabel: 'Open admin panel',
      ctaUrl: 'https://otters.ke/admin',
    }),
  },
]

await mkdir(outDir, { recursive: true })
for (const { file, html } of samples) {
  const dest = path.join(outDir, file)
  await writeFile(dest, html, 'utf8')
  console.log('Wrote', dest)
}
console.log('\nOpen files in a browser to preview. Logo loads from NEXT_PUBLIC_EMAIL_PUBLIC_URL/otters-logo.png')
