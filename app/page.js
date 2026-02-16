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
              Welcome to <span className="text-primary dark:text-primary-light">Otters Kenya</span> Swim Club
            </h1>
            <p className="text-lg sm:text-xl text-stone-600 dark:text-gray-300 mb-10 leading-relaxed max-w-2xl mx-auto font-medium">
              Your home for competitive swimming excellence in Kenya. 
              Register your swimmers, track attendance, and stay connected with our swimming community.
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
              <div className="bg-stone-900 dark:bg-gray-950 rounded-3xl p-8 shadow-soft">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 space-y-4">
                  <h3 className="text-lg font-bold text-stone-900 dark:text-gray-100 dark:text-gray-100">Join Otters Kenya</h3>
                  <div className="space-y-3">
                    <div className="h-10 bg-stone-100 dark:bg-gray-700 rounded-xl border border-stone-200 dark:border-gray-600"></div>
                    <div className="h-10 bg-stone-100 dark:bg-gray-700 rounded-xl border border-stone-200 dark:border-gray-600"></div>
                    <div className="h-10 bg-stone-100 dark:bg-gray-700 rounded-xl border border-stone-200 dark:border-gray-600"></div>
                    <div className="h-10 bg-stone-100 dark:bg-gray-700 rounded-xl border border-stone-200 dark:border-gray-600"></div>
                    <button className="w-full h-12 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-all shadow-md hover:shadow-lg">
                      Complete Registration
                    </button>
                  </div>
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
                {['Register multiple swimmers at once', 'Secure online payment', 'Instant confirmation', 'Quick approval process'].map((item) => (
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
      <section className="py-20 bg-stone-50 dark:bg-gray-850 relative transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="animate-reveal">
              <h2 className="text-4xl lg:text-5xl font-bold text-stone-900 mb-6 tracking-tightest">
                Track Your <span className="text-primary">Progress</span>
              </h2>
              <p className="text-lg text-stone-600 mb-8 leading-relaxed">
                Stay connected with your swimmer's journey. View attendance, check training schedules, and monitor their development at Otters Kenya.
              </p>
              <ul className="space-y-4">
                {['Quick QR code check-in', 'View attendance history', 'Training session schedule', 'Real-time updates'].map((item) => (
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
              <div className="bg-stone-900 dark:bg-gray-950 rounded-3xl p-8 shadow-soft">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 space-y-4">
                  <h3 className="text-lg font-bold text-stone-900 dark:text-gray-100 text-center">Training Session</h3>
                  <p className="text-sm text-stone-600 dark:text-gray-400 text-center">Competitive Squad</p>
                  <div className="flex justify-center py-6">
                    <div className="w-32 h-32 bg-primary rounded-2xl grid grid-cols-3 gap-1 p-2 shadow-md">
                      {[...Array(9)].map((_, i) => (
                        <div key={i} className="bg-white rounded-sm"></div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-primary-50 rounded-2xl p-4 text-center">
                    <p className="text-sm text-stone-600 dark:text-gray-400 mb-1">Swimmers Present:</p>
                    <p className="text-3xl font-bold text-primary">18 / 25</p>
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
              <div className="bg-stone-900 rounded-3xl p-4 shadow-soft">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 space-y-4">
                  <h3 className="text-lg font-bold text-stone-900 dark:text-gray-100">Your Dashboard</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-primary-50 rounded-2xl p-3">
                      <p className="text-xs text-stone-600 mb-1">Swimmers</p>
                      <p className="text-2xl font-bold text-primary">3</p>
                    </div>
                    <div className="bg-accent-sage rounded-2xl p-3">
                      <p className="text-xs text-stone-600 mb-1">Sessions</p>
                      <p className="text-2xl font-bold text-secondary">12</p>
                    </div>
                    <div className="bg-accent-lavender rounded-2xl p-3">
                      <p className="text-xs text-stone-600 mb-1">Invoices</p>
                      <p className="text-2xl font-bold text-stone-800">2</p>
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <div className="flex justify-between items-center p-3 bg-stone-50 rounded-xl">
                      <span className="text-sm text-stone-700">Next Session</span>
                      <span className="text-sm font-bold text-stone-900">Mon 4PM</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-stone-50 rounded-xl">
                      <span className="text-sm text-stone-700">Attendance Rate</span>
                      <span className="text-sm font-bold text-secondary">92%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2 animate-reveal">
              <h2 className="text-4xl lg:text-5xl font-bold text-stone-900 mb-6 tracking-tightest">
                Your <span className="text-primary">Swimming Hub</span>
              </h2>
              <p className="text-lg text-stone-600 mb-8 leading-relaxed">
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
              <span>Mobile-Optimized</span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}