import Image from 'next/image'
import RisingBubbles from '@/components/landing/RisingBubbles'

/**
 * App screenshot floating on a pool frame with rising bubbles (no white card).
 */
export default function PoolShowcaseImage({ src, alt, width, height, priority = false }) {
  return (
    <div className="relative w-full max-w-md mx-auto lg:mx-0 min-w-0">
      <div
        className="absolute -inset-3 sm:-inset-5 rounded-[1.75rem] sm:rounded-[2rem] bg-gradient-to-br from-primary/25 via-primary-light/15 to-transparent dark:from-primary/35 dark:via-primary/15 blur-xl opacity-90"
        aria-hidden
      />

      <div className="relative overflow-hidden rounded-[1.75rem] shadow-soft ring-1 ring-primary/15 dark:ring-white/10 min-h-[280px] sm:min-h-[320px]">
        <div
          className="absolute inset-0 z-0 bg-gradient-to-br from-primary via-primary-dark to-[#003d7a] dark:from-primary dark:via-primary-dark dark:to-[#002952]"
          aria-hidden
        />

        <svg
          className="absolute bottom-0 left-0 z-0 w-full h-[42%] text-white/25 dark:text-white/18 pointer-events-none"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M0,64 C200,120 400,0 600,48 C800,96 1000,32 1200,56 L1200,120 L0,120 Z"
          />
          <path
            fill="currentColor"
            fillOpacity="0.6"
            d="M0,88 C300,40 500,100 800,72 C950,56 1100,80 1200,68 L1200,120 L0,120 Z"
          />
        </svg>

        <RisingBubbles className="absolute inset-0 z-[1] pointer-events-none" layer="behind" />

        <div className="relative z-[2] flex items-center justify-center p-6 sm:p-8 md:p-10 min-h-[280px] sm:min-h-[320px]">
          <div className="relative w-full max-w-[92%] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/25">
            <Image
              src={src}
              alt={alt}
              width={width}
              height={height}
              priority={priority}
              sizes="(max-width: 1024px) 92vw, 26rem"
              className="w-full h-auto block"
            />
          </div>
        </div>

        <RisingBubbles
          className="absolute inset-0 z-[3] pointer-events-none"
          layer="foreground"
        />
      </div>
    </div>
  )
}
