import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'

/** Update when the policy text is substantively reviewed. */
const LAST_UPDATED = '19 April 2026'

export const metadata = {
  title: 'Privacy Policy | Otters Kenya Academy of Swimming Limited',
  description:
    'How the Otters swim club management platform collects, uses, and shares personal data.',
}

export default function PrivacyPolicyPage() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10 sm:py-14 transition-colors">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Last updated: {LAST_UPDATED}</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 tracking-tight mb-6">
            Privacy Policy
          </h1>

          <div className="space-y-8 text-gray-700 dark:text-gray-300 text-sm sm:text-base leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">1. Who this notice is for</h2>
              <p>
                This Privacy Policy describes how{' '}
                <strong>Otters Kenya Academy of Swimming Limited</strong> (&quot;we&quot;, &quot;us&quot;, &quot;the
                club&quot;) processes personal data through the swim club management website and application
                (the &quot;Platform&quot;) built on this codebase. It is intended to support transparency and audit
                readiness in line with the <strong>Kenya Data Protection Act, 2019</strong> and guidance from the{' '}
                <strong>Office of the Data Protection Commissioner (ODPC)</strong>. It is{' '}
                <strong>not legal advice</strong>; the club should obtain qualified legal review for its specific
                operations.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">2. Data controller</h2>
              <p>
                The data controller for personal data processed for club operations through the Platform is{' '}
                <strong>Otters Kenya Academy of Swimming Limited</strong>. For data protection requests, use the
                club&apos;s official contact details (published by the club). The Platform may also surface tools to
                help you exercise rights (see section 9).
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                3. Categories of personal data the Platform handles
              </h2>
              <p>
                The following reflects categories of data stored or transmitted by the application as implemented in
                this repository (registration flows, profiles, Supabase schema, and payment integration).
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Account and authentication:</strong> Email address and password (handled by the
                  authentication provider), account identifiers, and role (e.g. parent, admin, coach). Sign-in with{' '}
                  <strong>Google</strong> is optional; Google&apos;s processing is governed by Google&apos;s policies.
                </li>
                <li>
                  <strong>Parent / guardian profile:</strong> Full name, phone number, relationship to the swimmer,
                  emergency contact name, relationship, and phone number; email may be stored on the profile record
                  where configured for club operations.
                </li>
                <li>
                  <strong>Swimmer (minor) records:</strong> Name, date of birth, gender, squad assignment and related
                  club fields (e.g. payment preference, gala opt-in, sessions per week where collected at registration),
                  registration status, and operational links (e.g. facility, coach assignment) as used by the club in
                  the database.
                </li>
                <li>
                  <strong>Billing and payments:</strong> Invoice and line-item details, payment status, amounts,
                  references, timestamps, phone number on payment records (e.g. for mobile money flows), and related
                  metadata. Payment initiation uses <strong>Paystack</strong>; webhook payloads are processed to update
                  payment status in the club database.
                </li>
                <li>
                  <strong>Training and attendance:</strong> Session dates, times, locations/facilities, squad linkage, and
                  attendance records (including timestamps and whether attendance was recorded as self or coach-led,
                  where those fields exist).
                </li>
                <li>
                  <strong>Consents:</strong> Registration consent flags (data accuracy, code of conduct, optional
                  media consent), a copy of the consent text shown at registration, and technical metadata such as
                  timestamp, IP address, and browser user-agent string when submitted to the registration API.
                </li>
                <li>
                  <strong>Club operational data:</strong> Additional tables used by admins and coaches (e.g. meets,
                  reports, coach-related records) may contain further personal data depending on how the club uses those
                  features.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                4. How we use personal data (purposes)
              </h2>
              <p>Personal data in the Platform is used to:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Create and manage parent accounts and swimmer memberships.</li>
                <li>Process registrations, assign squads, and operate training sessions and attendance.</li>
                <li>Issue and collect payment for fees through Paystack.</li>
                <li>Record consents and demonstrate what was accepted at registration.</li>
                <li>Provide role-based access for parents, coaches, and administrators (access rules are enforced in the database layer via row-level security policies).</li>
                <li>Meet legal, regulatory, and accounting obligations that apply to the club.</li>
              </ul>
              <p>
                Lawful basis under the Kenya Data Protection Act may include, depending on the processing activity:
                performance of a contract, compliance with legal obligation, consent (where explicitly collected), or
                legitimate interests of the club, balanced against your rights. The club should document lawful basis in
                its internal records of processing.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                5. Disclosure and international transfers
              </h2>
              <p>
                Personal data is processed using service providers that power this application. Based on the codebase and
                typical deployment:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Supabase</strong> hosts the database and authentication service. Data is stored and processed
                  according to Supabase&apos;s terms and privacy policy; processing may occur outside Kenya.
                </li>
                <li>
                  <strong>Paystack</strong> processes payments; transaction data you submit at checkout is subject to
                  Paystack&apos;s privacy policy. The application sends data such as payer email, amount, reference, and
                  descriptive metadata (e.g. parent name, phone, swimmer names for display in Paystack metadata) when
                  initializing a transaction.
                </li>
                <li>
                  <strong>Hosting provider</strong> (e.g. <strong>Vercel</strong> or similar) may process HTTP requests
                  and application logs when the Platform is deployed there.
                </li>
                <li>
                  <strong>Maps:</strong> Facility addresses may be opened in external maps (e.g. Google Maps
                  directions links). Those services apply their own terms when you choose to open them.
                </li>
              </ul>
              <p>
                Where personal data is transferred outside Kenya, the club should ensure appropriate safeguards required
                by law (for example standard contractual clauses or adequacy decisions) are in place with processors.
                This Policy does not list every sub-processor contract; maintain an internal register for ODPC and audit
                purposes.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                6. Cookies and similar technologies
              </h2>
              <p>
                The Platform uses cookies (or similar mechanisms) managed by the authentication layer to keep you
                signed in securely. These are necessary for the operation of the service. This codebase does not
                implement a separate third-party advertising or analytics pixel; if the club adds such tools later, the
                Policy and consent mechanisms should be updated.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">7. Security</h2>
              <p>
                The application uses HTTPS in production, database <strong>row-level security</strong> to restrict
                access by role, and verifies Paystack webhook signatures before trusting payment events. Administrative
                operations that bypass RLS use tightly controlled server-side credentials. No system is perfectly
                secure; the club should maintain patching, access control, and incident response procedures.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">8. Retention</h2>
              <p>
                The Platform does not, in this codebase, define automatic deletion schedules for all data categories.
                Retention should be governed by the club&apos;s policies and legal requirements (e.g. tax, child
                safeguarding, litigation hold). Contact the club to discuss deletion or anonymisation when no longer
                needed.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">9. Your rights (Kenya DPA)</h2>
              <p>
                Subject to applicable law, you may have rights to be informed, to access, rectify, erase or restrict
                processing, to object, to withdraw consent where processing is based on consent, and to lodge a
                complaint with the <strong>ODPC</strong>. You may also have rights regarding automated decision-making
                where applicable.
              </p>
              <p>
                The Platform&apos;s <strong>Settings</strong> area allows parents to review and update profile and
                consent information where implemented. A third-party <strong>Privacy.ke</strong> data-rights widget may
                be embedded on settings pages; if present, its operation is subject to that service&apos;s terms and the
                configuration chosen by the club.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">10. Children</h2>
              <p>
                Swimmers are often minors. Parents or guardians provide their child&apos;s personal data through
                registration and the account. The club should ensure parental authority and appropriate notices are in
                place.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">11. Changes</h2>
              <p>
                We may update this Policy when the Platform or legal requirements change. The &quot;Last updated&quot;
                date at the top will be revised when the text is materially changed. Continued use after notice may
                constitute acceptance where permitted by law.
              </p>
            </section>

            <section className="space-y-3 rounded-lg border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Important notice</h2>
              <p className="text-sm">
                This document summarises technical and operational practices visible in the Otters swim-hub codebase and
                typical configuration. It must be reviewed by qualified counsel and adapted with the club&apos;s actual
                contact details, full list of processors, retention schedules, and any country-specific addenda before
                reliance in regulatory filings or disputes.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
