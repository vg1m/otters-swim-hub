import Link from 'next/link'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Button from '@/components/ui/Button'

export default function Home() {
  return (
    <>
      {/* Grain Overlay */}
      <div className="grain-overlay" />
      
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative bg-stone-50 dark:bg-gray-900 py-20 lg:py-32 overflow-hidden transition-colors duration-200">
        {/* Floating background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-96 h-96 bg-primary-100 dark:bg-primary-900/30 rounded-full blur-3xl opacity-40 dark:opacity-20 animate-float"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-lavender dark:bg-accent-lavender/20 rounded-full blur-3xl opacity-40 dark:opacity-20 animate-float-slow"></div>
        </div>
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-stone-900 dark:text-gray-100 mb-6 tracking-tightest leading-tight">
              Welcome to <span className="text-primary dark:text-primary-light">Otters Kenya </span> Swim Club
            </h1>
            <p className="text-lg sm:text-xl text-stone-600 dark:text-gray-300 mb-10 leading-relaxed max-w-2xl mx-auto font-medium">
              Your home for competitive swimming excellence in Kenya. 
              Register your swimmers, book sessions, track performance, and stay connected with our swimming community.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto rounded-full px-8 shadow-soft hover:scale-105 transition-transform">
                  Register Your Swimmers
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto rounded-full px-8 shadow-soft hover:scale-105 transition-transform">
                  Member Login
                </Button>
              </Link>
            </div>
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-stone-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-primary dark:text-primary-light" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                <span>Competitive squads</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-primary dark:text-primary-light" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                <span>Learn to swim programs</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-primary dark:text-primary-light" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                <span>Fitness swimming</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section 1: Registration */}
      <section id="features" className="py-20 bg-white dark:bg-gray-800 relative transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="bg-stone-900 dark:bg-gray-950 rounded-3xl p-5 shadow-soft">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 space-y-4">
                  {/* Form header */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-stone-900 dark:text-gray-100">Join Otters Kenya</h3>
                    <span className="text-xs text-stone-400 dark:text-gray-500 bg-stone-100 dark:bg-gray-700 px-2 py-1 rounded-full">Step 1 of 3</span>
                  </div>

                  {/* Parent fields */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-stone-500 dark:text-gray-400 uppercase tracking-wide">Parent / Guardian</p>
                    <div className="flex items-center gap-2 h-9 bg-stone-50 dark:bg-gray-700 border border-stone-200 dark:border-gray-600 rounded-lg px-3">
                      <svg className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                      <span className="text-sm text-stone-700 dark:text-gray-300">Sarah Njoroge</span>
                    </div>
                    <div className="flex items-center gap-2 h-9 bg-stone-50 dark:bg-gray-700 border border-stone-200 dark:border-gray-600 rounded-lg px-3">
                      <svg className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                      <span className="text-sm text-stone-700 dark:text-gray-300">sarah@email.com</span>
                    </div>
                    <div className="flex items-center gap-2 h-9 bg-stone-50 dark:bg-gray-700 border border-stone-200 dark:border-gray-600 rounded-lg px-3">
                      <svg className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                      <span className="text-sm text-stone-700 dark:text-gray-300">0712 345 678</span>
                    </div>
                  </div>

                  {/* Swimmer details divider */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-stone-200 dark:bg-gray-700"></div>
                    <span className="text-xs font-semibold text-stone-400 dark:text-gray-500 uppercase tracking-wide">Swimmer Details</span>
                    <div className="flex-1 h-px bg-stone-200 dark:bg-gray-700"></div>
                  </div>

                  {/* Swimmer card */}
                  <div className="border-2 border-primary/20 bg-primary/5 dark:bg-primary/10 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-stone-900 dark:text-gray-100">Amara Wanza</p>
                        <p className="text-xs text-stone-500 dark:text-gray-400">Age 10 &nbsp;·&nbsp; Female</p>
                      </div>
                      <span className="text-xs font-semibold bg-primary text-white px-2.5 py-1 rounded-full">Competitive</span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div className="w-4 h-4 rounded bg-primary flex items-center justify-center flex-shrink-0">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      </div>
                      <span className="text-xs text-stone-600 dark:text-gray-400">Opt in for Gala Events</span>
                    </label>
                  </div>

                  {/* Fee summary */}
                  <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-xl px-3 py-2">
                    <span className="text-xs font-medium text-stone-600 dark:text-gray-400">Registration Fee</span>
                    <span className="text-sm font-bold text-green-700 dark:text-green-400">KES X,XXX</span>
                  </div>

                  {/* CTA button */}
                  <button className="w-full h-10 bg-primary text-white rounded-xl text-sm font-semibold shadow-md">
                    Complete Registration
                  </button>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2 animate-reveal">
              <h2 className="text-4xl lg:text-5xl font-bold text-stone-900 dark:text-gray-100 mb-6 tracking-tightest">
                Simple <span className="text-primary dark:text-primary-light">Registration</span>
              </h2>
              <p className="text-lg text-stone-600 dark:text-gray-300 mb-8 leading-relaxed">
                Register your swimmers online and pay securely. Our streamlined process makes joining Otters Kenya quick and easy.
              </p>
              <ul className="space-y-4">
                {['Register multiple swimmers at once', 'Secure online payment (Mpesa, Airtel Money, Card)', 'Instant confirmation', 'Quick approval process'].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <span className="text-stone-700 dark:text-gray-300 font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section 2: Attendance */}
      <section className="py-20 bg-stone-50 dark:bg-gray-900 relative transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="animate-reveal">
              <h2 className="text-4xl lg:text-5xl font-bold text-stone-900 dark:text-gray-100 mb-6 tracking-tightest">
                Track Your <span className="text-primary dark:text-primary-light">Progress</span>
              </h2>
              <p className="text-lg text-stone-600 dark:text-gray-300 mb-8 leading-relaxed">
                Stay connected with your swimmer's journey. View attendance, check training schedules, and monitor their development at Otters Kenya.
              </p>
              <ul className="space-y-4">
                {['Race times and personal best tracking', 'Coach notes and development feedback', 'Attendance history and training calendar', 'Real-time session updates'].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <span className="text-stone-700 dark:text-gray-300 font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="bg-stone-900 dark:bg-gray-950 rounded-3xl p-5 shadow-soft">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 space-y-4">

                  {/* Swimmer header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-primary">AN</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-stone-900 dark:text-gray-100">Amara Wanza</p>
                        <p className="text-xs text-stone-500 dark:text-gray-400">Age 10 · Competitive</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full">📈 Progress</span>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-stone-50 dark:bg-gray-700/60 rounded-xl py-2">
                      <p className="text-lg font-bold text-stone-900 dark:text-gray-100">6</p>
                      <p className="text-xs text-stone-500 dark:text-gray-400">Races</p>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl py-2">
                      <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">⭐ 3</p>
                      <p className="text-xs text-stone-500 dark:text-gray-400">PBs</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl py-2">
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">4</p>
                      <p className="text-xs text-stone-500 dark:text-gray-400">Notes</p>
                    </div>
                  </div>

                  {/* Race times mini-table */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-stone-500 dark:text-gray-400 uppercase tracking-wide">Race Times</p>
                    {[
                      { event: '100m Freestyle', time: '1:12.45', pb: true, meet: 'Regional Champs' },
                      { event: '50m Backstroke', time: '38.20', pb: false, meet: 'Club Time Trial' },
                      { event: '200m IM', time: '2:48.10', pb: true, meet: 'National Games' },
                    ].map((row) => (
                      <div key={row.event} className="flex items-center justify-between py-2 px-2.5 rounded-lg bg-stone-50 dark:bg-gray-700/40 border border-stone-100 dark:border-gray-700">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs text-stone-700 dark:text-gray-300 font-medium truncate">{row.event}</span>
                          {row.pb && <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-1.5 py-0.5 rounded-full flex-shrink-0">⭐ PB</span>}
                        </div>
                        <span className="font-mono text-sm font-bold text-primary ml-2 flex-shrink-0">{row.time}</span>
                      </div>
                    ))}
                  </div>

                  {/* Coach note */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">Technique</span>
                    </div>
                    <p className="text-xs font-semibold text-stone-800 dark:text-gray-200">Great flip turn improvement</p>
                    <p className="text-xs text-stone-500 dark:text-gray-400 mt-0.5 line-clamp-1">Shows consistent improvement in butterfly stroke and turns...</p>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section 3: Payments & Dashboard */}
      <section className="py-20 bg-white dark:bg-gray-800 relative transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="bg-stone-900 dark:bg-gray-950 rounded-3xl p-5 shadow-soft">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 space-y-4">

                  {/* Dashboard header */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-stone-900 dark:text-gray-100">My Dashboard</h3>
                    <span className="text-xs text-stone-400 dark:text-gray-500">Welcome back, Sarah</span>
                  </div>

                  {/* Stat pills */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-primary/8 dark:bg-primary/15 rounded-xl py-2.5">
                      <p className="text-xl font-bold text-primary">2</p>
                      <p className="text-xs text-stone-500 dark:text-gray-400">Swimmers</p>
                    </div>
                    <div className="bg-accent-sage dark:bg-green-900/20 rounded-xl py-2.5">
                      <p className="text-xl font-bold text-secondary">12</p>
                      <p className="text-xs text-stone-500 dark:text-gray-400">Sessions</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl py-2.5">
                      <p className="text-xl font-bold text-amber-600 dark:text-amber-400">1</p>
                      <p className="text-xs text-stone-500 dark:text-gray-400">Invoice Due</p>
                    </div>
                  </div>

                  {/* Swimmer card 1 */}
                  <div className="border border-stone-200 dark:border-gray-700 rounded-xl p-3 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-stone-900 dark:text-gray-100">Amara Wanza</p>
                        <p className="text-xs text-stone-500 dark:text-gray-400">Age 10 · COMPETITIVE SQUAD</p>
                      </div>
                      <span className="text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full flex-shrink-0">Approved</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="flex-1 text-center text-xs font-medium bg-stone-100 dark:bg-gray-700 text-stone-600 dark:text-gray-300 py-1.5 rounded-lg">📅 Attendance</span>
                      <span className="flex-1 text-center text-xs font-medium bg-stone-50 dark:bg-gray-750 text-stone-500 dark:text-gray-400 py-1.5 rounded-lg border border-stone-200 dark:border-gray-700">📈 Progress</span>
                    </div>
                  </div>

                  {/* Swimmer card 2 */}
                  <div className="border border-stone-200 dark:border-gray-700 rounded-xl p-3 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-stone-900 dark:text-gray-100">Kofi Maina</p>
                        <p className="text-xs text-stone-500 dark:text-gray-400">Age 7 · LEARN TO SWIM</p>
                      </div>
                      <span className="text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full flex-shrink-0">Approved</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="flex-1 text-center text-xs font-medium bg-stone-100 dark:bg-gray-700 text-stone-600 dark:text-gray-300 py-1.5 rounded-lg">📅 Attendance</span>
                      <span className="flex-1 text-center text-xs font-medium bg-stone-50 dark:bg-gray-750 text-stone-500 dark:text-gray-400 py-1.5 rounded-lg border border-stone-200 dark:border-gray-700">📈 Progress</span>
                    </div>
                  </div>

                  {/* Next session */}
                  <div className="flex items-center gap-2 bg-stone-50 dark:bg-gray-700/50 rounded-xl px-3 py-2.5">
                    <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-stone-700 dark:text-gray-300">Mon 16 Mar · 4:00 – 5:30pm</p>
                      <p className="text-xs text-stone-400 dark:text-gray-500 truncate">📍 Nairobi Club Pool</p>
                    </div>
                  </div>

                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2 animate-reveal">
              <h2 className="text-4xl lg:text-5xl font-bold text-stone-900 dark:text-gray-100 mb-6 tracking-tightest">
                Your <span className="text-primary">Swimming Hub</span>
              </h2>
              <p className="text-lg text-stone-600 dark:text-gray-400 mb-8 leading-relaxed">
                Everything you need in one place. Check schedules, view attendance, manage payments, and stay connected with Otters Kenya's training programs.
              </p>
              <ul className="space-y-4">
                {['Personal dashboard for each family', 'View training schedules', 'Track attendance and progress', 'Manage payments and invoices'].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <span className="text-stone-700 dark:text-gray-300 font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section id="contact" className="relative py-24 overflow-hidden">
        {/* Background with floating gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-dark to-primary-dark"></div>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary-light rounded-full blur-3xl opacity-20 animate-float"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary-light rounded-full blur-3xl opacity-20 animate-float-slow"></div>
        </div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="w-16 h-16 bg-stone-900 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg">
            <div className="w-3 h-3 bg-primary-light rounded-full"></div>
          </div>
          
          <h2 className="text-4xl lg:text-6xl font-bold mb-6 text-white tracking-tightest">
            Join <span className="font-cursive text-5xl lg:text-7xl">Otters</span> Kenya Today
          </h2>
          <p className="text-lg lg:text-xl mb-10 text-white/90 leading-relaxed max-w-2xl mx-auto font-medium">
            Become part of Kenya's premier swim club. Experience professional coaching, competitive opportunities, and a supportive swimming community.
          </p>
          <Link href="/register">
            <button 
              className="inline-flex items-center justify-center px-10 py-3 bg-white text-primary font-bold text-lg rounded-full shadow-lg hover:bg-stone-100 hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary mb-10"
            >
              Register Your Swimmers
            </button>
          </Link>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-white/80">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
              <span>Competitive Excellence</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              <span>Secure Platform</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd"/>
              </svg>
              <span>Data Driven</span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}