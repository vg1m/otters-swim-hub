import Link from 'next/link'
import Image from 'next/image'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Button from '@/components/ui/Button'
import PoolShowcaseImage from '@/components/landing/PoolShowcaseImage'
import { LANDING_SCREENSHOTS } from '@/lib/landing-images'

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

export default function Home() {
  const { season, progress, family } = LANDING_SCREENSHOTS

  return (
    <>
      <div className="grain-overlay" aria-hidden />

      <Navigation />

      {/* Hero */}
      <section className="relative w-full py-20 lg:py-28 overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 overflow-hidden" aria-hidden>
          <Image
            src="/images/landing/otters-cta-bg.png"
            alt=""
            fill
            sizes="100vw"
            className="object-cover brightness-[0.55] saturate-[0.9] max-sm:object-[90%_10%] sm:object-center"
            priority
          />
        </div>
        <div className="absolute inset-0 bg-black/35" aria-hidden />
        <div
          className="absolute inset-0 bg-gradient-to-br from-primary/92 via-primary-dark/90 to-primary-dark/94"
          aria-hidden
        />
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute top-20 left-10 w-96 h-96 bg-white/10 rounded-full blur-3xl opacity-30 animate-float" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl opacity-25 animate-float-slow" />
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/90 mb-5 drop-shadow-[0_1px_6px_rgba(0,0,0,0.35)]">
              Since 1987
            </p>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tightest leading-[1.08] drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]">
              Welcome to{' '}
              <span className="text-primary-100">Otters Kenya</span>
              {' '}
              <br className="hidden sm:block" />
              <span className="sm:ml-2">Swim Club</span>
            </h1>
            <p className="text-lg sm:text-xl text-white/95 mb-10 leading-relaxed max-w-2xl mx-auto drop-shadow-[0_1px_8px_rgba(0,0,0,0.4)]">
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
            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-white/85 drop-shadow-sm">
              {['Elite & pathway', 'Learn to swim', 'Fitness swimming'].map((label) => (
                <div key={label} className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary-100 shrink-0" fill="currentColor" viewBox="0 0 20 20">
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

      {/* Feature 1: flagship hub */}
      <section id="features" className="py-20 lg:py-28 bg-white dark:bg-gray-800 relative transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
            <div className="order-2 lg:order-1">
              <PoolShowcaseImage {...season} priority />
            </div>

            <div className="order-1 lg:order-2 animate-reveal">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-gray-400 mb-4">
                For families
              </p>
              <h2 className="text-4xl lg:text-[2.75rem] font-bold text-stone-900 dark:text-gray-100 mb-5 tracking-tightest leading-tight">
                One hub for your swimmer&apos;s{' '}
                <span className="text-primary dark:text-primary">season</span>
              </h2>
              <p className="text-lg text-stone-600 dark:text-gray-300 mb-8 leading-relaxed max-w-lg">
                See the training rhythm, follow race times and coach notes, check attendance on the same
                screen, and settle invoices securely without chasing messages across groups.
              </p>
              <FeatureList
                items={[
                  'Upcoming sessions and squad context at a glance',
                  'Progress, coach notes, and attendance calendar together',
                  'Secure online payments for training fees',
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
                <span className="text-primary dark:text-primary">attendance</span>, together
              </h2>
              <p className="text-lg text-stone-600 dark:text-gray-300 mb-8 leading-relaxed max-w-lg">
                Race times, personal bests, and coach feedback live alongside squad rubric evaluations and
                training attendance so you always know how the season is going.
              </p>
              <FeatureList
                items={[
                  'Race times and PB history in one table',
                  'Squad rubric with progress-over-time chart',
                  'Skills, habits, and coach attitude in one view',
                  'Attendance on the same page as performance, no extra app',
                ]}
              />
            </div>

            <div>
              <PoolShowcaseImage {...progress} />
            </div>
          </div>
        </div>
      </section>

      {/* Feature 3: Family hub */}
      <section className="py-20 lg:py-28 bg-white dark:bg-gray-800 relative transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
            <div className="order-2 lg:order-1">
              <PoolShowcaseImage {...family} />
            </div>

            <div className="order-1 lg:order-2 animate-reveal">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-gray-400 mb-4">
                One login
              </p>
              <h2 className="text-4xl lg:text-[2.75rem] font-bold text-stone-900 dark:text-gray-100 mb-5 tracking-tightest leading-tight">
                Your family&apos;s{' '}
                <span className="text-primary dark:text-primary">swimming hub</span>
              </h2>
              <p className="text-lg text-stone-600 dark:text-gray-300 mb-8 leading-relaxed max-w-lg">
                From the dashboard, jump into each swimmer&apos;s profile, see rubric progress and attendance at a
                glance, pay what&apos;s due, and see what&apos;s next at the pool without juggling spreadsheets or threads.
              </p>
              <FeatureList
                items={[
                  'All swimmers under your account in one view',
                  'Rubric progress snapshots for pathway squads',
                  'Invoices and secure checkout when fees are due',
                  'One tap into progress, rubric, notes, and attendance',
                ]}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section id="contact" className="relative py-24 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-dark to-primary-dark" aria-hidden />
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-30 animate-float" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-30 animate-float-slow" />
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-black border border-white/20 mx-auto mb-8 shadow-lg"
            aria-hidden
          >
            <div className="w-3 h-3 rounded-full bg-primary dark:bg-primary" />
          </div>

          <h2 className="text-4xl lg:text-5xl xl:text-6xl font-bold mb-5 text-white tracking-tightest leading-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]">
            Join{' '}
            <span className="font-cursive text-4xl sm:text-5xl lg:text-6xl xl:text-7xl text-white">
              Otters
            </span>{' '}
            Kenya
          </h2>
          <p className="text-lg lg:text-xl mb-10 leading-relaxed max-w-xl mx-auto text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.4)]">
            Become part of Kenya&apos;s premier swim club. Experience professional coaching, competitive opportunities and a supportive swimming community.
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
