import Link from 'next/link'
import Image from 'next/image'

export default function Footer() {
  return (
    <footer className="bg-stone-900 dark:bg-gray-950 text-white border-t border-stone-800 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col items-center space-y-8">
          {/* Logo and Name */}
          <div className="flex items-center space-x-0">
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 flex-shrink-0">
              <Image
                src="/otters-logo.png"
                alt="Otters Swimming Logo"
                fill
                className="object-contain brightness-0 invert"
              />
            </div>
            <span className="text-2xl sm:text-3xl font-bold text-white">Kenya</span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap justify-center gap-8 text-sm font-medium">
            <Link href="/#features" className="text-stone-400 hover:text-white transition-colors">
              Features
            </Link>
            <Link href="/register" className="text-stone-400 hover:text-white transition-colors">
              Register
            </Link>
            <Link href="/login" className="text-stone-400 hover:text-white transition-colors">
              Login
            </Link>
          </div>

          {/* Divider */}
          <div className="w-full max-w-md h-px bg-stone-800"></div>

          {/* Copyright */}
          <p className="text-sm text-stone-600">
            © {new Date().getFullYear()} Otters Kenya Swim Club
          </p>
        </div>
      </div>
    </footer>
  )
}
