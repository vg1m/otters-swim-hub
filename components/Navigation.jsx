'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { user, profile, signOut, loading } = useAuth()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/70 backdrop-blur-20 shadow-soft' : 'bg-white/90 backdrop-blur-xs'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-1 group">
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 flex-shrink-0" style={{ filter: 'brightness(0) saturate(100%) invert(42%) sepia(95%) saturate(2140%) hue-rotate(175deg) brightness(98%) contrast(101%)' }}>
              <Image
                src="/otters-logo.png"
                alt="Otters Swimming Logo"
                fill
                className="object-contain"
                priority
              />
            </div>

          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/#features" className="text-stone-600 hover:text-primary transition-colors font-medium text-sm">
              Features
            </Link>
            {!loading && (
              <>
                {user ? (
                  <>
                    <Link 
                      href={profile?.role === 'admin' ? '/admin' : '/dashboard'} 
                      className="text-stone-600 hover:text-primary transition-colors font-medium text-sm"
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={signOut}
                      className="text-stone-600 hover:text-primary transition-colors font-medium text-sm"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link 
                      href="/register" 
                      className="text-primary hover:text-primary-dark transition-colors font-medium text-sm"
                    >
                      Register
                    </Link>
                    <Link 
                      href="/login" 
                      className="px-5 py-2.5 bg-stone-900 text-white rounded-full hover:bg-stone-800 transition-all font-medium text-sm shadow-sm hover:shadow-md"
                    >
                      Login
                    </Link>
                  </>
                )}
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2">
            <Link 
              href="/#features" 
              className="block px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Features
            </Link>
            {!loading && (
              <>
                {user ? (
                  <>
                    <Link 
                      href={profile?.role === 'admin' ? '/admin' : '/dashboard'} 
                      className="block px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={() => {
                        signOut()
                        setIsMobileMenuOpen(false)
                      }}
                      className="block w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
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
                      Admin Login
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
