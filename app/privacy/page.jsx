import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import PrivacyDSRWidget from '@/components/PrivacyDSRWidget'

/** Update when the policy text is substantively reviewed. */
const LAST_UPDATED = '2 May 2026'

const PRIVACY_EMAIL = 'otters.kenya@gmail.com'

export const metadata = {
  title: 'Privacy Policy | Otters Kenya Academy of Swimming Limited',
  description:
    'How Otters Kenya Academy of Swimming Limited collects, uses, and protects your personal information.',
}

// Helpers for layout and tables.

function H2({ children }) {
  return (
    <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight">
      {children}
    </h2>
  )
}

function P({ children }) {
  return <p className="leading-relaxed">{children}</p>
}

function Li({ children }) {
  return <li className="leading-relaxed">{children}</li>
}

function TableWrapper({ children }) {
  return (
    <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0 rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full text-sm">{children}</table>
    </div>
  )
}

function Th({ children, wide }) {
  return (
    <th
      className={`${wide ? 'w-2/5' : ''} px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700`}
    >
      {children}
    </th>
  )
}

function Td({ children }) {
  return (
    <td className="px-4 py-3 align-top text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-800 last:border-0">
      {children}
    </td>
  )
}

function TrAlt({ children, alt }) {
  return (
    <tr className={alt ? 'bg-gray-50/60 dark:bg-gray-800/30' : ''}>
      {children}
    </tr>
  )
}


/** Section 7: supplier categories (desktop table + mobile accordion share this). */
const SECTION_7_PARTNER_ROWS = [
  [
    'Data & sign-in backbone',
    'Hosts our database over an encrypted connection to the internet, performs secure sign-in, and keeps encrypted backups. That supports recovery after hardware faults and aligns with restricting access to unauthorised people.',
    'The live data our systems contain, stored on infrastructure they operate for us under contract for service delivery only, not for their own advertising or resale.',
  ],
  [
    'Payment handlers',
    'Processes card and mobile-money payments when you pay fees; checks the transaction with banks and mobile networks and returns success or failure to us.',
    'What the networks need for each payment (such as name, email, phone, amount, invoice reference). Card primary account numbers remain with the handler under sector rules; we do not retain full card data on Club systems.',
  ],
  [
    'App hosting & resilience',
    'Delivers pages and APIs to your device, shifts traffic if a host fails, and may retain rolling technical logs (timestamps, error codes, IP addresses) for reliability and troubleshooting.',
    'Technical signals about technical performance and misuse; not meant to replicate every keystroke outside our own application forms.',
  ],
  [
    'Optional external sign-in',
    'Provides identity verification when you sign in via an optional third-party login instead of a password stored only with us.',
    'What that provider exposes to us after you consent on their pages, commonly an email or stable identifier plus confirmation that sign-in succeeded.',
  ],
  [
    'Maps when you tap for directions',
    'Opens routing in the maps tool your device prefers when you choose a directions link tied to a venue.',
    'Data visible to that maps product under its usual terms during your session. We do not control that session.',
  ],
  [
    'Email or SMS relay (when we send them)',
    'Sends account or billing messages such as reminders and receipts where we use outbound mail or SMS, with delivery receipts where available.',
    'Recipient address or number, routing metadata, and message content strictly needed for delivery.',
  ],
]

function ChevronAccordionIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}


export default function PrivacyPolicyPage() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10 sm:py-14 transition-colors">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <p className="text-xs font-semibold uppercase tracking-widest text-primary dark:text-primary-light mb-2">
            Otters Kenya Academy of Swimming Limited
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 tracking-tight mb-1">
            Our Privacy Promise
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            Last updated: {LAST_UPDATED}
          </p>

          <div className="space-y-10 text-gray-700 dark:text-gray-300 text-sm sm:text-base">

            {/* The short version */}
            <section className="rounded-xl border border-primary/20 dark:border-primary/30 bg-primary/5 dark:bg-primary/10 p-5 sm:p-6 space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-primary dark:text-primary-light tracking-tight">
                The short version
              </h2>
              <ul className="space-y-2 list-none pl-0">
                {[
                  'We are a swim club. To run the club, we collect details about you and your child.',
                  'We use those details to register your child, run training, keep your child safe in the water, and collect fees.',
                  'We keep your information private. We do not sell it. We only share it with people who help us run the club, and only the parts they need.',
                  'You can ask to see your information, fix it, or have it deleted. Just contact us.',
                  'If we cannot resolve an issue about how we handle your data, other options may be available to you under Kenyan law.',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 leading-relaxed">
                    <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-primary/15 dark:bg-primary/25 flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-primary dark:text-primary-light" viewBox="0 0 10 10" fill="none" aria-hidden>
                        <path d="M2 5.5 4.2 7.5 8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                The sections below go through the same points with more detail.
              </p>
            </section>

            {/* 1 */}
            <section className="space-y-3">
              <H2>1. Who we are</H2>
              <P>
                We are <strong>Otters Kenya Academy of Swimming Limited</strong>, a swim club in
                Kenya. In this notice we call ourselves &quot;we&quot;, &quot;us&quot;, or &quot;the
                Club&quot;.
              </P>
              <P>
                This notice explains how we look after the personal information you give us when you
                sign your child up, use our app and website, and pay club fees.
              </P>
            </section>

            {/* 2 */}
            <section id="privacy-contact" className="space-y-3">
              <H2>2. How to reach us about your information</H2>
              <P>
                If you have questions about how we use your information, or you want to use any of
                your rights below, email us:
              </P>
              <p>
                <a
                  href={`mailto:${PRIVACY_EMAIL}`}
                  className="inline-flex items-center gap-2 text-base font-semibold text-primary dark:text-primary-light underline underline-offset-4 decoration-primary/40 hover:decoration-primary hover:opacity-90"
                >
                  {PRIVACY_EMAIL}
                </a>
              </p>
            </section>

            {/* 3 */}
            <section className="space-y-4">
              <H2>3. What information we collect</H2>
              <P>
                When you sign up and use our services, we collect the information below. Where the
                swimmer is under&nbsp;18, the parent or guardian gives us this information on the
                child&apos;s behalf.
              </P>
              <TableWrapper>
                <thead>
                  <tr>
                    <Th wide>What we collect</Th>
                    <Th>Examples</Th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['About your account', 'Your email, the password you choose (or identifiers from an optional external identity provider when you prefer not to manage a Club-only password), and what kind of user you are (parent, coach, or admin).'],
                    ['About you (the parent or guardian)', 'Your full name, phone number, your relationship to the swimmer, and an emergency contact name and number.'],
                    ['About your child (the swimmer)', 'Name, date of birth, gender, the squad they are placed in, how many sessions a week, gala preferences, and which coach and pool they are assigned to.'],
                    ['Sensitive details', 'Medical information that helps us keep your child safe in the water (for example asthma, allergies, heart conditions). Photos or videos, but only if you have given us permission to use them.'],
                    ['Payments', 'Invoice details, what you paid, when you paid it, and the phone number used for mobile money. Card numbers are handled by our payment provider, not by us.'],
                    ['Training and attendance', 'Which sessions your child attended, the date and time, and whether the coach or your child marked the attendance.'],
                    ['The permissions you give us', 'Which boxes you tick when you sign up (for example agreeing to the code of conduct, or saying yes to photos), the date and time you ticked them, and the device you used. We keep this so we can show what you agreed to.'],
                    ['Club records', 'Notes that coaches and admins keep about training, meets, and reports.'],
                  ].map(([what, examples], i) => (
                    <TrAlt key={i} alt={i % 2 === 1}>
                      <Td><strong>{what}</strong></Td>
                      <Td>{examples}</Td>
                    </TrAlt>
                  ))}
                </tbody>
              </TableWrapper>
              <div className="rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 px-4 py-3 text-sm space-y-1">
                <p className="font-semibold text-amber-900 dark:text-amber-200">Medical notes and imagery</p>
                <p className="text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                  Kenyan law attaches higher standards to minors&apos; health details and likenesses.
                  We collect the minimum justified for pool safety and obtain separate opt-in wording
                  for photography. Access is narrowed to authorised staff.
                </p>
              </div>
            </section>

            {/* 4 */}
            <section className="space-y-3">
              <H2>4. What we use the information for</H2>
              <P>
                We only use your information for things that have to do with running the swim club.
                Those are:
              </P>
              <ul className="list-disc pl-5 space-y-2">
                <Li>Setting up your account and your child&apos;s membership.</Li>
                <Li>Putting your child in the right squad and running training sessions.</Li>
                <Li>Keeping your child safe in the water, and acting quickly if there is a medical issue.</Li>
                <Li>Sending you bills and collecting fees.</Li>
                <Li>Telling you about training schedules, changes, meets, and Club news.</Li>
                <Li>Keeping a record of the permissions you have given us.</Li>
                <Li>
                  Letting parents, coaches, and admins see only what they need to see (parents see
                  their own child, coaches see their own squads).
                </Li>
                <Li>Meeting legal duties, like keeping accounting records for the tax authority.</Li>
                <Li>Looking into any safety or disciplinary issue if one comes up.</Li>
              </ul>
            </section>

            {/* 5 */}
            <section className="space-y-4">
              <H2>5. Why we are allowed to use your information</H2>
              <P>
                Kenyan law says we need a good reason to use anyone&apos;s personal information.
                Here are ours, in plain words:
              </P>
              <TableWrapper>
                <thead>
                  <tr>
                    <Th wide>What we are doing</Th>
                    <Th>Why we are allowed to do it</Th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Running your child\'s membership and our app', 'Because you signed up with us. We cannot give you the service without using your details.'],
                    ['Sending invoices and collecting fees', 'Same reason: it is part of the deal you signed up for.'],
                    ['Keeping accounting and tax records', 'Because the law tells us we have to keep these records.'],
                    ['Keeping safeguarding records about children', 'Statutory and policy duties to protect swimmers under eighteen.'],
                    ['Holding medical information about your child', 'Health safeguarding for aquatic programmes and enrolment disclosures you approve.'],
                    ['Using photos or videos of your child', 'Only with your permission. You can change your mind any time.'],
                    ['Anything else that needs your specific permission', 'Because you said yes. You can say no, or change your mind later.'],
                  ].map(([what, why], i) => (
                    <TrAlt key={i} alt={i % 2 === 1}>
                      <Td><strong>{what}</strong></Td>
                      <Td>{why}</Td>
                    </TrAlt>
                  ))}
                </tbody>
              </TableWrapper>
              <div className="rounded-lg bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-900/40 px-4 py-3 text-sm">
                <p className="font-semibold text-blue-900 dark:text-blue-200 mb-1">Withdrawal of consent</p>
                <p className="text-blue-800/90 dark:text-blue-300/90 leading-relaxed">
                  Where processing rests on consent (photos are one example), you may withdraw consent
                  for future handling. Withdrawal cannot undo lawful processing completed beforehand.
                </p>
              </div>
            </section>

            {/* 6 */}
            <section className="space-y-3">
              <H2>6. Children</H2>
              <P>
                Most of our swimmers are under&nbsp;18. Kenyan law says we can only handle a
                child&apos;s information if a parent or guardian agrees. So:
              </P>
              <ul className="list-disc pl-5 space-y-2">
                <Li>Only a parent or guardian can sign a child up.</Li>
                <Li>
                  When you sign up, you confirm you are the parent or guardian and you tick the
                  boxes giving us permission.
                </Li>
                <Li>
                  You can come back at any time, in your account settings or by emailing us, to
                  change what you have agreed to or remove your child&apos;s details.
                </Li>
                <Li>We do not use children&apos;s information for any kind of marketing.</Li>
                <Li>
                  Coaches and admins who need swimmer files for rostering or safeguarding receive
                  access aligned to their assignments.
                </Li>
              </ul>
            </section>

            {/* 7 */}
            <section className="space-y-4">
              <H2>7. Who we share your information with</H2>
              <P>
                We do not sell your information. We use contracted service providers for hosting,
                sign-in storage, payments, email or SMS relay, maps links, and similar technical
                work. Below we describe the type of supplier and what they receive, without naming
                products or vendors publicly. Ask us by email if you need a processor list for your
                own compliance files.
              </P>
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400 md:hidden">
                Tap a row to expand. You can open more than one at a time.
              </p>

              <div
                className="flex flex-col gap-2 md:hidden"
                aria-label="Service partner categories"
              >
                {SECTION_7_PARTNER_ROWS.map(([partner, role, sees], i) => (
                  <details
                    key={partner}
                    className="group rounded-xl border border-gray-200 bg-white shadow-sm transition-colors hover:border-gray-300 open:border-primary/40 open:shadow-md dark:border-gray-700 dark:bg-gray-800/40 dark:hover:border-gray-600 dark:open:border-primary/50"
                  >
                    <summary className="flex min-h-[52px] cursor-pointer touch-manipulation list-none items-center justify-between gap-3 px-4 py-4 text-left text-sm font-semibold leading-snug text-gray-900 outline-none [&::-webkit-details-marker]:hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:text-gray-100 dark:focus-visible:ring-offset-gray-900">
                      <span className="min-w-0">{partner}</span>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 ring-1 ring-black/5 transition-transform duration-200 group-open:rotate-180 dark:bg-gray-700 dark:text-gray-400 dark:ring-white/10">
                        <ChevronAccordionIcon />
                      </span>
                    </summary>
                    <div className="space-y-3 border-t border-gray-100 bg-gray-50/90 px-4 pb-4 pt-3 dark:border-gray-700 dark:bg-gray-900/40">
                      <div className="rounded-lg bg-white px-3 py-2.5 ring-1 ring-black/[0.06] dark:bg-gray-800 dark:ring-white/[0.08]">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          What they do for us
                        </p>
                        <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{role}</p>
                      </div>
                      <div className="rounded-lg bg-white px-3 py-2.5 ring-1 ring-black/[0.06] dark:bg-gray-800 dark:ring-white/[0.08]">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          What they typically see
                        </p>
                        <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{sees}</p>
                      </div>
                    </div>
                  </details>
                ))}
              </div>

              <div className="hidden md:block">
                <TableWrapper>
                  <thead>
                    <tr>
                      <Th wide>Type of partner</Th>
                      <Th>What they do for us</Th>
                      <Th>What they typically see</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {SECTION_7_PARTNER_ROWS.map(([partner, role, sees], i) => (
                      <TrAlt key={partner} alt={i % 2 === 1}>
                        <Td>
                          <strong>{partner}</strong>
                        </Td>
                        <Td>{role}</Td>
                        <Td>{sees}</Td>
                      </TrAlt>
                    ))}
                  </tbody>
                </TableWrapper>
              </div>

              <P>We may also share your information with:</P>
              <ul className="list-disc pl-5 space-y-2">
                <Li>Government bodies, regulators, or the police, if the law tells us we must.</Li>
                <Li>
                  Our lawyers, accountants, or insurers when their advice requires limited disclosure
                  and they owe us confidentiality.
                </Li>
                <Li>A new owner if the Club is ever sold or merged.</Li>
              </ul>
              <P>
                Each supplier works under written terms that limit use of data to delivering the
                service we contracted and require appropriate protection.
              </P>
            </section>

            {/* 8 */}
            <section className="space-y-3">
              <H2>8. Sending information outside Kenya</H2>
              <P>
                Some of the companies that help us run the Club store data in other countries.
                Kenyan law lets us do this as long as your information is properly protected on the
                other end. We rely on one or more of these protections:
              </P>
              <ul className="list-disc pl-5 space-y-2">
                <Li>The transfer is needed to give you the service you signed up for.</Li>
                <Li>
                  We have a written agreement with the company that promises Kenyan-level protection
                  for your information.
                </Li>
                <Li>
                  You have specifically agreed to the transfer after we explained the risks.
                </Li>
              </ul>
              <div className="rounded-lg bg-gray-100/70 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  <strong>More detail on transfers.</strong> Email us. We will describe our safeguards and,
                  where the law expects it, identify sub-processors upon request.
                </p>
              </div>
            </section>

            {/* 9 */}
            <section className="space-y-4">
              <H2>9. How long we keep your information</H2>
              <P>
                We retain information while we have a lawful need and discard or anonymise it when
                that need ends unless a longer retention is required by law. Indicative periods:
              </P>
              <TableWrapper>
                <thead>
                  <tr>
                    <Th wide>What</Th>
                    <Th>For how long</Th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Your child's membership records", 'While they are a member, plus 7 years after they leave (so we can answer tax questions).'],
                    ['Records about a safety or welfare incident involving a child', 'Until the child turns 25 (that is 7 years after they turn 18).'],
                    ['Payment and accounting records', '7 years from the end of the year of the payment.'],
                    ['Attendance records', '2 years.'],
                    ['Photos or videos you let us use', 'Until you tell us to stop, or 12 months, whichever comes first.'],
                    ['Records of permissions you gave us', 'While the permission is active, plus 3 years afterwards.'],
                    ['Records of any request you make to us about your data', '3 years after we close the request.'],
                    ['Technical sign-in and security logs', '12 months.'],
                  ].map(([what, how], i) => (
                    <TrAlt key={i} alt={i % 2 === 1}>
                      <Td><strong>{what}</strong></Td>
                      <Td>{how}</Td>
                    </TrAlt>
                  ))}
                </tbody>
              </TableWrapper>
              <P>
                When the time is up, we either delete the information or strip out anything that
                could identify you, unless the law tells us we must keep it longer (for example,
                because of a court case).
              </P>
            </section>

            {/* 10 */}
            <section className="space-y-3">
              <H2>10. How we keep your information safe</H2>
              <P>We apply layered controls proportionate to the data we handle. For example:</P>
              <ul className="list-disc pl-5 space-y-2">
                <Li>
                  Traffic between your browser or app and our services uses TLS encryption where the
                  product supports it (HTTPS).
                </Li>
                <Li>
                  Access rules restrict what each logged-in role can read: parents to their household
                  data, coaches to their assigned squads, admins to oversight functions aligned with
                  their duties.
                </Li>
                <Li>
                  Only a small number of trusted admins have higher-level access, and that access is
                  logged.
                </Li>
                <Li>
                  We validate payment confirmations and signed server callbacks before recording an
                  invoice as settled, so spoofed confirmations cannot falsely clear a fee.
                </Li>
                <Li>We keep our software up to date and review who has access regularly.</Li>
                <Li>
                  If personal data are compromised we investigate, mitigate, notify affected persons,
                  and file regulator notices when Kenyan law triggers that obligation.
                </Li>
              </ul>
            </section>

            {/* 11 */}
            <section className="space-y-4">
              <H2>11. Your rights</H2>
              <P>Under Kenyan data protection rules you may in particular:</P>
              <ul className="list-disc pl-5 space-y-2">
                <Li>Ask us what information we hold about you or your child.</Li>
                <Li>Ask us to fix anything that is wrong or out of date.</Li>
                <Li>
                  Ask us to delete information where statute allows deletion (tax and similar
                  records may have to remain).
                </Li>
                <Li>Tell us to stop or pause using your information in certain ways.</Li>
                <Li>Take back any permission you gave us, at any time.</Li>
                <Li>Ask for a copy of your information in a form you can take elsewhere.</Li>
                <Li>
                  Object to decisions made solely by automated processing without meaningful human
                  review (the Club currently does not run such purely automated decisions about
                  membership or fees).
                </Li>
              </ul>

              <div className="rounded-lg bg-gray-100/70 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm space-y-1">
                <p className="font-semibold text-gray-900 dark:text-gray-100">How to ask</p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  Email{' '}
                  <a href={`mailto:${PRIVACY_EMAIL}`} className="text-primary dark:text-primary-light underline underline-offset-2 hover:opacity-80">
                    {PRIVACY_EMAIL}
                  </a>
                  . We will reply within 14 days. We may ask you to prove who you are first, just to
                  make sure we are not giving your information to the wrong person.
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 px-4 py-5 sm:px-5 space-y-3">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Online data requests
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  You can also send a structured access, correction, deletion, or portability request
                  through the form below, provided by Privacy.ke under the Kenya Data Protection Act.
                </p>
                <PrivacyDSRWidget />
              </div>

            </section>

            {/* 12 */}
            <section className="space-y-3">
              <H2>12. Cookies</H2>
              <P>
                The app relies on strictly necessary cookies and related storage so sessions stay
                secure after sign-in. We do not use advertising tracking cookies today. Material
                changes would be mirrored in this page and surfaced in the product before they take
                effect.
              </P>
            </section>

            {/* 13 */}
            <section className="space-y-3">
              <H2>13. Do you have to give us your information?</H2>
              <P>
                We need core registration and safety particulars to enrol a swimmer: for example name,
                date of birth, your contact telephone, and relevant medical screening that bears on
                pool safety.
              </P>
              <P>
                Optional items such as media consent remain voluntary. Declining optional items does
                not block ordinary membership handled on neutral club criteria.
              </P>
            </section>

            {/* 14 */}
            <section className="space-y-3">
              <H2>14. Changes to this notice</H2>
              <P>
                If anything important about how we use your information changes, we will update this
                notice and tell you on the app or by email before the change takes effect. The date
                at the top of this page shows when we last made changes.
              </P>
            </section>

            {/* 15 */}
            <section className="rounded-xl border border-primary/20 dark:border-primary/30 bg-primary/5 dark:bg-primary/10 px-5 py-4 space-y-2">
              <H2>15. Any questions?</H2>
              <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                See{' '}
                <a href="#privacy-contact" className="text-primary dark:text-primary-light underline underline-offset-2 hover:opacity-80">
                  Section&nbsp;2
                </a>{' '}
                for our email, or reply to messages we send about your swimmers.
              </p>
            </section>

          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
