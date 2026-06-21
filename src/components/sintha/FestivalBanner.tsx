'use client'

import { useState, useEffect } from 'react'
import { getCurrentFestival, type Festival } from '@/lib/festivals'
import { Sparkles } from 'lucide-react'

/**
 * FestivalBanner — auto-rotating, themed festival banner for the Home screen.
 *
 * Detects the current/upcoming festival based on today's date and shows
 * a beautifully styled banner with:
 *   - Festival name + emoji
 *   - Themed gradient background (different per festival)
 *   - Catchy message + subtitle
 *   - Animated shimmer effect
 *   - Tap to navigate to festival-relevant services
 *
 * If no festival is active or upcoming within 7 days, renders nothing.
 */
export default function FestivalBanner({
  onNavigate,
}: {
  onNavigate?: (view: string, params?: Record<string, string>) => void
}) {
  const [festival, setFestival] = useState<Festival | null>(null)

  useEffect(() => {
    const detect = () => setFestival(getCurrentFestival())
    detect()
  }, [])

  if (!festival) return null

  return (
    <div className="px-4 pt-3">
      <button
        onClick={() => onNavigate?.('post-job')}
        className={`w-full text-left rounded-2xl overflow-hidden relative bg-gradient-to-br ${festival.gradient} shadow-lg active:scale-[0.98] transition-transform`}
      >
        {/* Animated background circles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full animate-pulse" />
          <div
            className="absolute -bottom-6 -left-6 w-20 h-20 bg-white/5 rounded-full animate-pulse"
            style={{ animationDelay: '1s' }}
          />
        </div>

        {/* Shimmer effect */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.3) 50%, transparent 60%)',
            backgroundSize: '200% 100%',
            animation: 'festival-shimmer 3s infinite',
          }}
        />

        <div className="relative z-10 p-4">
          {/* Emoji + Name */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-3xl drop-shadow-lg">{festival.emoji}</span>
            <div>
              <p className="text-white font-extrabold text-lg leading-tight drop-shadow">
                {festival.name}
              </p>
              <p className={`text-xs font-semibold ${festival.iconColor} drop-shadow flex items-center gap-1`}>
                <Sparkles className="h-3 w-3" /> {festival.message}
              </p>
            </div>
          </div>

          {/* Subtitle */}
          <p className="text-white/80 text-xs mt-1 leading-relaxed">
            {festival.subtitle}
          </p>

          {/* CTA hint */}
          <div className="mt-2 inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
            <span className="text-[10px] text-white font-medium">Tap to post a festival job →</span>
          </div>
        </div>

        {/* Inline keyframes for shimmer */}
        <style jsx>{`
          @keyframes festival-shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </button>
    </div>
  )
}
