'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/contexts/ThemeContext'
import { useParentUnreadNotificationsCount } from '@/hooks/useParentUnreadNotificationsCount'
import { useStaffUnreadNotificationsCount } from '@/hooks/useStaffUnreadNotificationsCount'
import { useAdminOpenFeedbackCount } from '@/hooks/useAdminOpenFeedbackCount'
import { useParentUnreadFeedbackRepliesCount } from '@/hooks/useParentUnreadFeedbackRepliesCount'
import { UnreadNotificationIndicator } from '@/components/UnreadNotificationIndicator'

function DarkModeToggleButton({ className = '' }) {
  const { isDark, toggleTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${className}`}
      aria-label="Toggle dark mode"
    >
      {isDark ? (
        <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      )}
    </button>
  )
}

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { user, profile, signOut, loading } = useAuth()

  const logoHref = useMemo(() => {
    if (!profile) return '/'
    if (profile.role === 'admin') return '/admin'
    return '/dashboard'
  }, [profile])

  const isParentUser = Boolean(user && profile?.role === 'parent')
  const isAdminUser = Boolean(user && profile?.role === 'admin')
  const isCoachUser = Boolean(user && profile?.role === 'coach')
  const parentUnreadNotifications = useParentUnreadNotificationsCount(
    user?.id,
    isParentUser
  )
  const staffUnreadNotifications = useStaffUnreadNotificationsCount(
    user?.id,
    profile?.role,
    isAdminUser || isCoachUser
  )
  const adminOpenFeedbackCount = useAdminOpenFeedbackCount(user?.id, isAdminUser)
  const parentUnreadFeedbackReplies = useParentUnreadFeedbackRepliesCount(user?.id, isParentUser)
  const notificationsHref = isAdminUser
    ? '/admin/notifications'
    : isCoachUser
      ? '/coach/notifications'
      : '/dashboard/notifications'

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/70 dark:bg-gray-900/70 backdrop-blur-20 shadow-soft' : 'bg-white/90 dark:bg-gray-900/90 backdrop-blur-xs'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href={logoHref} className="flex items-center space-x-1 group">
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 flex-shrink-0" style={{ filter: 'brightness(0) saturate(100%) invert(42%) sepia(95%) saturate(2140%) hue-rotate(175deg) brightness(98%) contrast(101%)' }}>
              <Image
                src="/otters-logo.png"
                alt="Otters Swimming Logo"
                fill
                sizes="(max-width: 639px) 96px, (max-width: 767px) 112px, 128px"
                className="object-contain"
                priority
              />
            </div>

          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {!loading && !user && (
              <Link href="/#features" className="text-stone-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary-light transition-colors font-medium text-sm">
                Features
              </Link>
            )}
            {!loading && (
              <>
                {user ? (
                  <>
                    {isParentUser || isAdminUser || isCoachUser ? (
                      <Link
                        href={notificationsHref}
                        className="inline-flex items-center gap-2 text-stone-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary-light transition-colors font-medium text-sm"
                      >
                        <span className="relative inline-flex items-center gap-2">
                          Notifications
                          <UnreadNotificationIndicator
                            count={isParentUser ? parentUnreadNotifications : staffUnreadNotifications}
                          />
                        </span>
                      </Link>
                    ) : (
                      <span
                        className="text-sm font-medium text-stone-400 dark:text-gray-500 cursor-default"
                        title="Coming soon"
                      >
                        Notifications <span className="text-xs font-normal">(soon)</span>
                      </span>
                    )}
                    {isParentUser && (
                      <Link
                        href="/dashboard/feedback"
                        className="inline-flex items-center gap-2 text-stone-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary-light transition-colors font-medium text-sm"
                      >
                        <span>Feedback</span>
                        <UnreadNotificationIndicator count={parentUnreadFeedbackReplies} />
                      </Link>
                    )}
                    {isCoachUser && (
                      <Link
                        href="/coach/broadcast"
                        className="text-stone-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary-light transition-colors font-medium text-sm"
                      >
                        Broadcast
                      </Link>
                    )}
                    <span
                      className="text-sm font-medium text-stone-400 dark:text-gray-500 cursor-default"
                      title="Coming soon"
                    >
                      Merch <span className="text-xs font-normal">(soon)</span>
                    </span>
                    {profile?.role === 'admin' && (
                      <>
                        <Link 
                          href="/admin/swimmers" 
                          className="text-stone-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary-light transition-colors font-medium text-sm"
                        >
                          Swimmers
                        </Link>
                        <Link 
                          href="/admin/sessions" 
                          className="text-stone-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary-light transition-colors font-medium text-sm"
                        >
                          Sessions
                        </Link>
                        <Link 
                          href="/admin/coaches" 
                          className="text-stone-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary-light transition-colors font-medium text-sm"
                        >
                          Coaches
                        </Link>
                        <Link 
                          href="/admin/facilities" 
                          className="text-stone-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary-light transition-colors font-medium text-sm"
                        >
                          Facilities
                        </Link>
                        <Link 
                          href="/admin/squads" 
                          className="text-stone-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary-light transition-colors font-medium text-sm"
                        >
                          Squads
                        </Link>
                        <Link 
                          href="/admin/announcements" 
                          className="text-stone-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary-light transition-colors font-medium text-sm"
                        >
                          Announcements
                        </Link>
                        <Link 
                          href="/admin/feedback" 
                          className="inline-flex items-center gap-2 text-stone-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary-light transition-colors font-medium text-sm"
                        >
                          <span>Feedback</span>
                          <UnreadNotificationIndicator count={adminOpenFeedbackCount} />
                        </Link>
                      </>
                    )}
                    {profile?.role !== 'admin' && profile?.role !== 'coach' && (
                      <Link 
                        href="/settings" 
                        className="text-stone-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary-light transition-colors font-medium text-sm"
                      >
                        Profile
                      </Link>
                    )}
                    <button
                      onClick={signOut}
                      className="text-stone-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary-light transition-colors font-medium text-sm"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link 
                      href="/register" 
                      className="text-primary dark:text-primary-light hover:text-primary-dark dark:hover:text-primary transition-colors font-medium text-sm"
                    >
                      Register
                    </Link>
                    <Link 
                      href="/login" 
                      className="px-5 py-2.5 bg-stone-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-full hover:bg-stone-800 dark:hover:bg-white transition-all font-medium text-sm shadow-sm hover:shadow-md"
                    >
                      Login
                    </Link>
                  </>
                )}
              </>
            )}
            
            <DarkModeToggleButton className="hidden md:inline-flex" />
          </div>

          <div className="flex items-center gap-1 md:hidden">
            <DarkModeToggleButton />
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2">
            {!loading && !user && (
              <Link
                href="/#features"
                className="block px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Features
              </Link>
            )}
            {!loading && (
              <>
                {user ? (
                  <>
                    {isParentUser || isAdminUser || isCoachUser ? (
                      <Link
                        href={notificationsHref}
                        className="flex items-center justify-between px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <span>Notifications</span>
                        <UnreadNotificationIndicator
                          count={isParentUser ? parentUnreadNotifications : staffUnreadNotifications}
                        />
                      </Link>
                    ) : (
                      <div className="px-4 py-2 text-sm text-stone-400 dark:text-gray-500" title="Coming soon">
                        Notifications <span className="text-xs">(soon)</span>
                      </div>
                    )}
                    {isParentUser && (
                      <Link
                        href="/dashboard/feedback"
                        className="flex items-center justify-between px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <span>Feedback</span>
                        <UnreadNotificationIndicator count={parentUnreadFeedbackReplies} />
                      </Link>
                    )}
                    {isCoachUser && (
                      <Link
                        href="/coach/broadcast"
                        className="block px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Broadcast
                      </Link>
                    )}
                    <div className="px-4 py-2 text-sm text-stone-400 dark:text-gray-500" title="Coming soon">
                      Merch <span className="text-xs">(soon)</span>
                    </div>
                    {profile?.role === 'admin' && (
                      <>
                        <Link 
                          href="/admin/swimmers" 
                          className="block px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Swimmers
                        </Link>
                        <Link 
                          href="/admin/sessions" 
                          className="block px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Sessions
                        </Link>
                        <Link 
                          href="/admin/coaches" 
                          className="block px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Coaches
                        </Link>
                        <Link 
                          href="/admin/facilities" 
                          className="block px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Facilities
                        </Link>
                        <Link 
                          href="/admin/squads" 
                          className="block px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Squads
                        </Link>
                        <Link 
                          href="/admin/announcements" 
                          className="block px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Announcements
                        </Link>
                        <Link 
                          href="/admin/feedback" 
                          className="flex items-center justify-between px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <span>Feedback</span>
                          <UnreadNotificationIndicator count={adminOpenFeedbackCount} />
                        </Link>
                      </>
                    )}
                    {profile?.role !== 'admin' && profile?.role !== 'coach' && (
                      <Link 
                        href="/settings" 
                        className="block px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Profile Settings
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        signOut()
                        setIsMobileMenuOpen(false)
                      }}
                      className="block w-full text-left px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link 
                      href="/register" 
                      className="block px-4 py-2 text-primary hover:bg-accent rounded-lg transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Register Swimmers
                    </Link>
                    <Link 
                      href="/login" 
                      className="block px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Login
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
