import Link from 'next/link'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Button from '@/components/ui/Button'

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function FeatureList({ items }) {
  return (
    <ul className="space-y-3.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <CheckIcon />
          </div>
          <span className="text-stone-700 dark:text-gray-300 font-medium leading-snug">{item}</span>
        </li>
      ))}
    </ul>
  )
}

/** Branded graphic for the hub section: swim lanes + rhythm bars, not a generic UI clone */
function HubSeasonGraphic() {
  const rhythm = [42, 68, 52, 88, 58, 92, 74]
  return (
    <div className="relative w-full max-w-md mx-auto lg:mx-0 min-w-0">
      <div
        className="absolute -inset-3 sm:-inset-6 md:-inset-8 bg-gradient-to-tr from-primary/20 via-primary/5 to-accent-lavender/25 dark:from-primary/30 dark:via-primary/10 dark:to-accent-lavender/10 rounded-[1.5rem] sm:rounded-[2rem] blur-xl sm:blur-2xl opacity-90"
        aria-hidden
      />
      <div className="relative overflow-hidden rounded-2xl sm:rounded-[1.75rem] border border-stone-200/90 dark:border-gray-600/80 bg-gradient-to-b from-stone-50 via-white to-stone-100/90 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 shadow-soft ring-1 ring-black/[0.04] dark:ring-white/10 min-w-0">
        <div className="absolute inset-0 pointer-events-none opacity-[0.22] dark:opacity-[0.18]" aria-hidden>
          {[8, 22, 36, 50, 64, 78].map((top) => (
            <div
              key={top}
              className="absolute left-0 right-0 h-px bg-primary dark:bg-primary-light"
              style={{ top: `${top}%` }}
            />
          ))}
        </div>

        <div className="relative px-4 sm:px-6 pt-4 sm:pt-6 pb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3 border-b border-stone-200/70 dark:border-gray-700/90">
          <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black dark:bg-stone-100 flex items-center justify-center shrink-0 shadow-md">
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-primary dark:bg-primary" />
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm font-bold text-stone-900 dark:text-gray-100 tracking-tight leading-tight">
                Season snapshot
              </p>
              <p className="text-[10px] sm:text-[11px] text-stone-500 dark:text-gray-400 leading-snug mt-1">
                Training rhythm and progress, together in one place
              </p>
            </div>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary dark:text-primary-light shrink-0 sm:pt-1 self-start sm:self-auto">
            Otters
          </span>
        </div>

        <div className="relative px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5">
          <div>
            <p className="text-[10px] font-semibold text-stone-500 dark:text-gray-400 uppercase tracking-wider mb-2 sm:mb-3">
              Check-ins · last seven sessions
            </p>
            <div className="flex items-end gap-1 sm:gap-1.5 h-20 sm:h-28 px-0.5 min-h-[5rem]">
              {rhythm.map((pct, i) => (
                <div
                  key={i}
                  className="flex-1 min-w-0 max-w-full rounded-t sm:rounded-t-md bg-gradient-to-t from-primary to-primary-light/85 dark:from-primary dark:to-primary-light shadow-sm"
                  style={{ height: `${pct}%` }}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 min-w-0">
            <div className="rounded-xl sm:rounded-2xl bg-white/95 dark:bg-gray-800/95 border border-stone-200/90 dark:border-gray-600 p-3 sm:p-4 shadow-sm backdrop-blur-sm min-w-0">
              <p className="text-[10px] font-semibold text-stone-500 dark:text-gray-400 uppercase tracking-wide">
                Pool next
              </p>
              <p className="text-sm sm:text-base font-bold text-stone-900 dark:text-gray-100 mt-1 sm:mt-1.5 leading-tight">
                Tue · 4:00
              </p>
              <p className="text-[10px] sm:text-[11px] text-primary dark:text-primary-light font-medium mt-1 leading-snug">
                Competitive lane
              </p>
            </div>
            <div className="rounded-xl sm:rounded-2xl bg-gradient-to-br from-stone-100 to-stone-50 dark:from-gray-800/90 dark:to-gray-800/60 border border-stone-200/90 dark:border-gray-600 p-3 sm:p-4 shadow-sm min-w-0">
              <p className="text-[10px] font-semibold text-stone-500 dark:text-gray-400 uppercase tracking-wide">
                Your account
              </p>
              <p className="text-sm sm:text-base font-bold text-stone-900 dark:text-gray-100 mt-1 sm:mt-1.5 leading-snug">
                Invoices, when it&apos;s time
              </p>
              <p className="text-[10px] sm:text-[11px] text-stone-600 dark:text-gray-400 font-medium mt-1 leading-snug">
                See what&apos;s due and pay securely; details inside the hub
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 rounded-xl sm:rounded-2xl bg-primary/8 dark:bg-primary/15 border border-primary/15 dark:border-primary/25 px-3 sm:px-4 py-2.5 sm:py-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary text-white flex items-center justify-center shrink-0 text-[10px] sm:text-xs font-bold shadow-sm">
              PB
            </div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs font-semibold text-stone-900 dark:text-gray-100 leading-snug">
                100m free · 1:12.45
              </p>
              <p className="text-[10px] sm:text-[11px] text-stone-500 dark:text-gray-400 mt-0.5 leading-snug">
                Personal best logged this month
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <>
      <div className="grain-overlay" aria-hidden />

      <Navigation />

      {/* Hero */}
      <section className="relative bg-stone-50 dark:bg-gray-900 py-20 lg:py-28 overflow-hidden transition-colors duration-200 border-b border-stone-200/60 dark:border-gray-800/80">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-96 h-96 bg-primary-100 dark:bg-primary-900/30 rounded-full blur-3xl opacity-40 dark:opacity-20 animate-float" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-lavender dark:bg-accent-lavender/20 rounded-full blur-3xl opacity-40 dark:opacity-20 animate-float-slow" />
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary dark:text-primary-light mb-5">
              Since 1987
            </p>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-stone-900 dark:text-gray-100 mb-6 tracking-tightest leading-[1.08]">
              Welcome to{' '}
              <span className="text-primary dark:text-primary-light">Otters Kenya</span>
              {' '}
              <br className="hidden sm:block" />
              <span className="sm:ml-2">Swim Club</span>
            </h1>
            <p className="text-lg sm:text-xl text-stone-600 dark:text-gray-300 mb-10 leading-relaxed max-w-2xl mx-auto">
              Your home for competitive swimming excellence. Register your swimmers, book sessions, track performance,
              and stay connected with our swimming community.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto rounded-full px-8 shadow-soft hover:scale-[1.02] transition-transform">
                  Register your swimmers
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full sm:w-auto rounded-full px-8 shadow-soft hover:scale-[1.02] transition-transform"
                >
                  Member login
                </Button>
              </Link>
            </div>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-stone-600 dark:text-gray-400">
              {['Competitive squads', 'Learn to swim', 'Fitness swimming'].map((label) => (
                <div key={label} className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary dark:text-primary-light shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Feature 1: flagship hub (replaces Simple Registration) */}
      <section id="features" className="py-20 lg:py-28 bg-white dark:bg-gray-800 relative transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
            <div className="order-2 lg:order-1">
              <HubSeasonGraphic />
            </div>

            <div className="order-1 lg:order-2 animate-reveal">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-gray-400 mb-4">
                For families
              </p>
              <h2 className="text-4xl lg:text-[2.75rem] font-bold text-stone-900 dark:text-gray-100 mb-5 tracking-tightest leading-tight">
                One hub for your swimmer&apos;s{' '}
                <span className="text-primary dark:text-primary-light">season</span>
              </h2>
              <p className="text-lg text-stone-600 dark:text-gray-300 mb-8 leading-relaxed max-w-lg">
                See the training rhythm, follow race times and coach notes, check attendance on the same
                screen, and settle invoices securely without chasing messages across groups.
              </p>
              <FeatureList
                items={[
                  'Upcoming sessions and squad context at a glance',
                  'Progress, coach notes, and attendance calendar together',
                  'M-Pesa, Airtel Money, and card payments for fees',
                  'Register new swimmers online when you join the club',
                ]}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Feature 2: Progress + attendance */}
      <section className="py-20 lg:py-28 bg-stone-50 dark:bg-gray-900 relative transition-colors duration-200 border-y border-stone-200/50 dark:border-gray-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
            <div className="animate-reveal">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-gray-400 mb-4">
                Clarity
              </p>
              <h2 className="text-4xl lg:text-[2.75rem] font-bold text-stone-900 dark:text-gray-100 mb-5 tracking-tightest leading-tight">
                Progress and{' '}
                <span className="text-primary dark:text-primary-light">attendance</span>, together
              </h2>
              <p className="text-lg text-stone-600 dark:text-gray-300 mb-8 leading-relaxed max-w-lg">
                Race times, personal bests, and coach feedback live alongside a month view of training
                attendance so you always know how the season is going.
              </p>
              <FeatureList
                items={[
                  'Race times and PB history in one table',
                  'Coach notes with technique, fitness, and achievements',
                  'Attendance tab on the same page as performance, no extra app',
                  'Month navigation with attended, missed, and upcoming days',
                ]}
              />
            </div>

            <div>
              <div className="bg-stone-900 dark:bg-gray-950 rounded-[1.75rem] p-1.5 sm:p-2 shadow-soft ring-1 ring-white/10">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">AW</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-stone-900 dark:text-gray-100 truncate">Amara Wanza</p>
                      <p className="text-[11px] text-stone-500 dark:text-gray-400">Age 10 · Competitive</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 bg-stone-100 dark:bg-gray-900/80 p-1 rounded-lg">
                    <span className="px-3 py-1.5 rounded-md text-xs font-medium text-stone-500 dark:text-gray-400">
                      Race times
                    </span>
                    <span className="px-3 py-1.5 rounded-md text-xs font-medium text-stone-500 dark:text-gray-400">
                      Coach notes
                    </span>
                    <span className="px-3 py-1.5 rounded-md text-xs font-semibold bg-white dark:bg-gray-700 text-stone-900 dark:text-gray-100 shadow-sm">
                      Attendance
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-semibold text-stone-500 dark:text-gray-400 uppercase tracking-wide">
                        March 2026
                      </p>
                      <div className="flex gap-1">
                        <span className="w-6 h-6 rounded text-[10px] flex items-center justify-center text-stone-400 border border-stone-200 dark:border-gray-600">
                          ‹
                        </span>
                        <span className="w-6 h-6 rounded text-[10px] flex items-center justify-center text-stone-400 border border-stone-200 dark:border-gray-600">
                          ›
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-medium text-stone-400 dark:text-gray-500 mb-1">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                        <span key={`${d}-${i}`}>{d}</span>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {[
                        { d: ' ', c: '' },
                        { d: ' ', c: '' },
                        { d: ' ', c: '' },
                        { d: ' ', c: '' },
                        { d: ' ', c: '' },
                        { d: ' ', c: '' },
                        { d: '1', c: 'bg-blue-500 text-white' },
                        { d: '2', c: 'bg-green-600 text-white' },
                        { d: '3', c: 'bg-green-600 text-white' },
                        { d: '4', c: 'bg-stone-100 dark:bg-gray-700 text-stone-400' },
                        { d: '5', c: 'bg-red-500 text-white' },
                        { d: '6', c: 'bg-green-600 text-white' },
                        { d: '7', c: 'bg-blue-500 text-white' },
                      ].map((cell, i) => (
                        <div
                          key={i}
                          className={`aspect-square rounded-md flex items-center justify-center text-[10px] font-medium ${
                            cell.c || 'text-transparent'
                          }`}
                        >
                          {cell.d.trim() ? cell.d : ''}
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-3 justify-center mt-3 text-[10px] text-stone-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-sm bg-green-600" /> Attended
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-sm bg-blue-500" /> Upcoming
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-sm bg-red-500" /> Missed
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 3: Family hub */}
      <section className="py-20 lg:py-28 bg-white dark:bg-gray-800 relative transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
            <div className="order-2 lg:order-1">
              <div className="bg-stone-900 dark:bg-gray-950 rounded-[1.75rem] p-1.5 sm:p-2 shadow-soft ring-1 ring-white/10">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-stone-900 dark:text-gray-100">My Dashboard</h3>
                    <span className="text-[11px] text-stone-400 dark:text-gray-500">Welcome back</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-primary/8 dark:bg-primary/15 rounded-xl py-2.5">
                      <p className="text-lg font-bold text-primary tabular-nums">2</p>
                      <p className="text-[10px] text-stone-500 dark:text-gray-400">Swimmers</p>
                    </div>
                    <div className="bg-emerald-50/80 dark:bg-emerald-900/20 rounded-xl py-2.5">
                      <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">12</p>
                      <p className="text-[10px] text-stone-500 dark:text-gray-400">Sessions</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl py-2.5">
                      <p className="text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums">1</p>
                      <p className="text-[10px] text-stone-500 dark:text-gray-400">Invoice</p>
                    </div>
                  </div>

                  <div className="border border-stone-200 dark:border-gray-700 rounded-xl p-3 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-stone-900 dark:text-gray-100">Amara Wanza</p>
                        <p className="text-[11px] text-stone-500 dark:text-gray-400">Age 10 · Competitive squad</p>
                      </div>
                      <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/35 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full shrink-0">
                        Approved
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-600 dark:text-gray-400">3 of 4 scheduled days with attendance (to date)</p>
                    <div className="h-8 rounded-lg bg-primary text-white text-[11px] font-semibold flex items-center justify-center">
                      Progress and attendance
                    </div>
                  </div>

                  <div className="border border-stone-200 dark:border-gray-700 rounded-xl p-3 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-stone-900 dark:text-gray-100">Kofi Maina</p>
                        <p className="text-[11px] text-stone-500 dark:text-gray-400">Age 7 · Learn to swim</p>
                      </div>
                      <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/35 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full shrink-0">
                        Approved
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-600 dark:text-gray-400">2 of 3 scheduled days with attendance (to date)</p>
                    <div className="h-8 rounded-lg bg-primary text-white text-[11px] font-semibold flex items-center justify-center">
                      Progress and attendance
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-stone-50 dark:bg-gray-700/50 rounded-xl px-3 py-2.5">
                    <svg className="w-4 h-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-stone-700 dark:text-gray-300">Mon 16 Mar · 16:00–17:30</p>
                      <p className="text-[11px] text-stone-400 dark:text-gray-500 truncate">School of Nations Pool</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2 animate-reveal">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-gray-400 mb-4">
                One login
              </p>
              <h2 className="text-4xl lg:text-[2.75rem] font-bold text-stone-900 dark:text-gray-100 mb-5 tracking-tightest leading-tight">
                Your family&apos;s{' '}
                <span className="text-primary dark:text-primary-light">swimming hub</span>
              </h2>
              <p className="text-lg text-stone-600 dark:text-gray-300 mb-8 leading-relaxed max-w-lg">
                From the dashboard, jump into each swimmer&apos;s profile, pay what&apos;s due, and see what&apos;s
                next at the pool without juggling spreadsheets or threads.
              </p>
              <FeatureList
                items={[
                  'All swimmers under your account in one view',
                  'Training schedule highlights and session details',
                  'Invoices and Paystack checkout when fees are due',
                  'A single path into progress, notes, and attendance',
                ]}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section id="contact" className="relative py-24 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-dark to-primary-dark" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary-light rounded-full blur-3xl opacity-20 animate-float" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary-light rounded-full blur-3xl opacity-20 animate-float-slow" />
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-black border border-white/20 mx-auto mb-8 shadow-lg"
            aria-hidden
          >
            <div className="w-3 h-3 rounded-full bg-primary dark:bg-primary-light" />
          </div>

          <h2 className="text-4xl lg:text-5xl xl:text-6xl font-bold mb-5 text-white tracking-tightest leading-tight">
            Join{' '}
            <span className="font-cursive text-4xl sm:text-5xl lg:text-6xl xl:text-7xl text-white">
              Otters
            </span>{' '}
            Kenya
          </h2>
          <p className="text-lg lg:text-xl mb-10 leading-relaxed max-w-xl mx-auto text-white/90">
            Become part of Kenya's premier swim club. Experience professional coaching, competitive opportunities and a supportive swimming community.
          </p>
          <Link href="/register">
            <button
              type="button"
              className="inline-flex items-center justify-center px-10 py-3.5 bg-white text-primary font-bold text-base sm:text-lg rounded-full shadow-lg hover:bg-stone-50 hover:scale-[1.02] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary mb-10"
            >
              Register your swimmers
            </button>
          </Link>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 text-sm text-white/80">
            {[
              { label: 'Competitive excellence', icon: 'star' },
              { label: 'Secure payments', icon: 'shield' },
              { label: 'Built for families', icon: 'users' },
            ].map(({ label, icon }) => (
              <div key={label} className="flex items-center gap-2">
                {icon === 'star' && (
                  <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                )}
                {icon === 'shield' && (
                  <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {icon === 'users' && (
                  <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                )}
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}
