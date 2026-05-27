'use client'

import Link from 'next/link'

function ContactRow({ label, value }) {
  if (!value) return null
  return (
    <p className="text-sm text-stone-700 dark:text-gray-300">
      <span className="text-stone-500 dark:text-gray-500">{label}: </span>
      {value}
    </p>
  )
}

export default function ParentAccountContextPanel({ context, showAdminSwimmerLinks = false }) {
  if (!context?.primary) {
    return (
      <p className="text-sm text-stone-500 dark:text-gray-400">Parent context unavailable.</p>
    )
  }

  const { primary, submittedBy, isDelegateSubmit, emergency, sharedAccess, swimmers } = context

  return (
    <div className="space-y-4 text-sm">
      <section>
        <h3 className="font-semibold text-stone-900 dark:text-white mb-1">Account holder</h3>
        <ContactRow label="Name" value={primary.full_name} />
        <ContactRow label="Email" value={primary.email} />
        <ContactRow label="Phone" value={primary.phone_number} />
      </section>

      {isDelegateSubmit && submittedBy && (
        <section>
          <h3 className="font-semibold text-stone-900 dark:text-white mb-1">
            Submitted by (co-parent / shared access)
          </h3>
          <ContactRow label="Name" value={submittedBy.full_name} />
          <ContactRow label="Email" value={submittedBy.email} />
          <ContactRow label="Phone" value={submittedBy.phone_number} />
        </section>
      )}

      {(emergency?.name || emergency?.phone) && (
        <section>
          <h3 className="font-semibold text-stone-900 dark:text-white mb-1">Emergency contact</h3>
          <ContactRow label="Name" value={emergency.name} />
          <ContactRow label="Relationship" value={emergency.relationship} />
          <ContactRow label="Phone" value={emergency.phone} />
        </section>
      )}

      {sharedAccess?.length > 0 && (
        <section>
          <h3 className="font-semibold text-stone-900 dark:text-white mb-1">Shared access</h3>
          <ul className="space-y-2">
            {sharedAccess.map((row) => (
              <li
                key={row.id}
                className="rounded-lg border border-stone-200 dark:border-gray-700 p-2"
              >
                <p className="font-medium text-stone-800 dark:text-gray-200">
                  {row.invited_name || row.invited_email}
                  <span className="ml-2 text-xs font-normal text-stone-500">({row.status})</span>
                </p>
                <ContactRow label="Invite email" value={row.invited_email} />
                {row.member && (
                  <>
                    <ContactRow label="Signed-in as" value={row.member.full_name} />
                    <ContactRow label="Email" value={row.member.email} />
                    <ContactRow label="Phone" value={row.member.phone_number} />
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {swimmers?.length > 0 && (
        <section>
          <h3 className="font-semibold text-stone-900 dark:text-white mb-1">Linked swimmers</h3>
          <ul className="space-y-1">
            {swimmers.map((s) => (
              <li key={s.id} className="text-stone-700 dark:text-gray-300">
                {showAdminSwimmerLinks ? (
                  <Link href={`/admin/swimmers?search=${encodeURIComponent(s.name)}`} className="text-primary hover:underline">
                    {s.name}
                  </Link>
                ) : (
                  <span>{s.name}</span>
                )}
                {s.squadName && <span className="text-stone-500"> — {s.squadName}</span>}
                {s.status && <span className="text-stone-500"> ({s.status})</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
