'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { IndianRupee, ShieldCheck, Briefcase, Bot } from 'lucide-react'

/**
 * HighlightCarousel — animated auto-rotating banner carousel for the
 * LandingScreen. Shows 3 AI-generated highlight slides explaining how
 * SINTHA benefits the people of Manipur.
 *
 * Features:
 *   - Auto-rotates every 5 seconds
 *   - Pauses on touch (resumes after 10s of inactivity)
 *   - Swipeable on mobile (touch events)
 *   - Dot indicators for manual navigation
 *   - Smooth slide transition with CSS transforms
 *   - Each slide: AI image + gradient overlay + headline + subtext + icon
 */

interface Slide {
  image: string
  icon: typeof IndianRupee
  iconColor: string
  iconBg: string
  headline: string
  subtext: string
  gradient: string
}

const SLIDES: Slide[] = [
  {
    image: '/highlights/slide-1.png',
    icon: IndianRupee,
    iconColor: 'text-green-600',
    iconBg: 'bg-green-100',
    headline: 'Zero Commission',
    subtext: 'Providers keep 100% of their earnings. No hidden fees, no cuts. Fair pricing for everyone in Manipur.',
    gradient: 'from-green-600/80 to-blue-600/80',
  },
  {
    image: '/highlights/slide-2.png',
    icon: ShieldCheck,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-100',
    headline: 'Verified & Trusted',
    subtext: 'Every provider is identity-verified with Aadhaar. Real reviews from real customers. Trust you can count on.',
    gradient: 'from-blue-600/80 to-purple-600/80',
  },
  {
    image: '/highlights/slide-3.png',
    icon: Briefcase,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-100',
    headline: 'Post a Job, Get Quotes',
    subtext: 'Describe what you need and let providers come to you with competitive quotes. AI-powered matching finds the right person.',
    gradient: 'from-amber-600/80 to-orange-600/80',
  },
]

const AUTO_ROTATE_MS = 5000
const PAUSE_AFTER_TOUCH_MS = 10000

export default function HighlightCarousel() {
  const [current, setCurrent] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const lastTouchTime = useRef<number>(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % SLIDES.length)
  }, [])

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + SLIDES.length) % SLIDES.length)
  }, [])

  const goTo = useCallback((index: number) => {
    setCurrent(index)
  }, [])

  // Auto-rotate
  useEffect(() => {
    if (isPaused) return

    intervalRef.current = setInterval(() => {
      // Check if enough time has passed since last touch
      if (Date.now() - lastTouchTime.current > PAUSE_AFTER_TOUCH_MS) {
        setIsPaused(false)
        next()
      } else {
        next()
      }
    }, AUTO_ROTATE_MS)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [next, isPaused])

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    lastTouchTime.current = Date.now()
    setIsPaused(true)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const touchEndX = e.changedTouches[0].clientX
    const diff = touchStartX.current - touchEndX

    // Swipe threshold: 50px
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        next() // swipe left → next
      } else {
        prev() // swipe right → prev
      }
    }

    touchStartX.current = null
    // Resume auto-rotate after PAUSE_AFTER_TOUCH_MS
    setTimeout(() => {
      if (Date.now() - lastTouchTime.current >= PAUSE_AFTER_TOUCH_MS - 100) {
        setIsPaused(false)
      }
    }, PAUSE_AFTER_TOUCH_MS)
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl shadow-lg"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slides container — uses CSS transform for smooth sliding */}
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {SLIDES.map((slide, index) => {
          const Icon = slide.icon
          return (
            <div key={index} className="w-full shrink-0 relative">
              {/* AI-generated background image */}
              <div className="relative h-48 sm:h-56 overflow-hidden">
                <img
                  src={slide.image}
                  alt={slide.headline}
                  className="w-full h-full object-cover"
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
                {/* Gradient overlay for text readability */}
                <div className={`absolute inset-0 bg-gradient-to-t ${slide.gradient}`} />

                {/* Content overlay */}
                <div className="absolute inset-0 flex flex-col justify-end p-4">
                  {/* Icon badge */}
                  <div className={`w-10 h-10 rounded-full ${slide.iconBg} flex items-center justify-center mb-2`}>
                    <Icon className={`h-5 w-5 ${slide.iconColor}`} />
                  </div>

                  {/* Headline */}
                  <h3 className="text-white font-bold text-lg drop-shadow-lg">
                    {slide.headline}
                  </h3>

                  {/* Subtext */}
                  <p className="text-white/90 text-xs mt-1 drop-shadow leading-relaxed">
                    {slide.subtext}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Dot indicators */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {SLIDES.map((_, index) => (
          <button
            key={index}
            onClick={() => goTo(index)}
            className={`transition-all duration-300 rounded-full ${
              current === index
                ? 'w-6 h-2 bg-white'
                : 'w-2 h-2 bg-white/50 hover:bg-white/75'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Progress bar (subtle animation indicator) */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/20 z-10">
        <div
          key={current}
          className="h-full bg-white/60"
          style={{
            animation: isPaused ? 'none' : `progress ${AUTO_ROTATE_MS}ms linear`,
          }}
        />
      </div>

      {/* Inline keyframes for the progress bar */}
      <style jsx>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  )
}
