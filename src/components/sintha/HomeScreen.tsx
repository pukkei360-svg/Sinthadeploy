'use client'

import { useEffect, useState } from 'react'
import { useAppStore, type ServiceCategory, type ProviderProfile, type User } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { sortByDistance } from '@/lib/distance'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import BottomNav from './BottomNav'
import PushNotificationPrompt from './PushNotificationPrompt'
import { useToast } from '@/hooks/use-toast'
import { cleanError } from '@/lib/clean-error'
import {
  Search, Bell, Home, GraduationCap, Car, Camera, Sparkles, Wrench,
  CheckCircle, Star, Crown, ChevronRight, Calendar, MessageCircle,
  MapPin, TrendingUp, Zap, Shield, Bot, Briefcase, Loader2, Send, X
} from 'lucide-react'

// Shape of a single AI smart-search match returned by /api/ai/smart-search.
interface AiSearchMatch {
  providerId: string
  name?: string
  photoUrl?: string
  category?: string
  rating?: number
  hourlyRate?: number
  verified?: boolean
  pro?: boolean
  reason?: string
  matchScore?: number
}

const categoryIcons: Record<string, typeof Home> = {
  home: Home,
  'graduation-cap': GraduationCap,
  car: Car,
  camera: Camera,
  sparkles: Sparkles,
  wrench: Wrench,
}

export default function HomeScreen() {
  const {
    navigate, user, categories, setCategories, providers, setProviders, setIsLoading,
    notifications,
  } = useAppStore()
  const { toast } = useToast()
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [dataLoaded, setDataLoaded] = useState(false)

  // ── AI Smart Search ──────────────────────────────────────────
  // Natural-language provider matching powered by SINTHA AI.
  // State: aiSearchQuery (input), aiSearching (loading), aiResults (matches),
  //        aiSummary (AI-generated summary of the matches).
  const [aiSearchQuery, setAiSearchQuery] = useState('')
  const [aiSearching, setAiSearching] = useState(false)
  const [aiResults, setAiResults] = useState<AiSearchMatch[]>([])
  const [aiSummary, setAiSummary] = useState('')

  const handleAiSearch = async () => {
    const q = aiSearchQuery.trim()
    if (!q || aiSearching) return
    setAiSearching(true)
    setAiResults([])
    setAiSummary('')
    try {
      const data = await apiFetch<{
        matches?: AiSearchMatch[]
        summary?: string
        suggestions?: string
        poweredBy?: string
      }>('/ai/smart-search', {
        method: 'POST',
        body: JSON.stringify({ query: q }),
      })
      setAiResults(data.matches || [])
      setAiSummary(data.summary || '')
      if ((data.matches || []).length === 0 && data.summary) {
        // No matches but AI gave a helpful summary (e.g. "post a job instead")
        toast({ title: 'No AI matches', description: data.summary.slice(0, 80) })
      }
    } catch (err) {
      toast({ title: 'AI search failed', description: cleanError(err) })
    } finally {
      setAiSearching(false)
    }
  }

  const clearAiSearch = () => {
    setAiSearchQuery('')
    setAiResults([])
    setAiSummary('')
  }

  // Feature 2: Location-based provider sorting
  // Toggle between featured (default) and nearby (distance) sorting.
  const [sortBy, setSortBy] = useState<'featured' | 'nearby'>('featured')

  // The User interface in the store doesn't yet declare lat/lng, but the
  // Prisma `User` model has `latitude` / `longitude` and the API already
  // returns them. Extend the type locally so we can use them safely.
  type UserWithLatLng = User & { latitude?: number | null; longitude?: number | null }
  const userLat = (user as UserWithLatLng | null)?.latitude
  const userLng = (user as UserWithLatLng | null)?.longitude
  const hasUserLocation =
    typeof userLat === 'number' && typeof userLng === 'number' &&
    !Number.isNaN(userLat) && !Number.isNaN(userLng)

  const unreadNotifs = notifications.filter((n) => !n.isRead).length

  useEffect(() => {
    if (dataLoaded) return
    const loadData = async () => {
      setIsLoading(true)
      try {
        if (categories.length === 0) {
          try { await apiFetch('/seed', { method: 'POST' }) } catch {}
        }
        // Cache categories for 5 min and providers for 2 min on the client.
        // Returning users see the home screen instantly from cache while
        // fresh data loads in the background (stale-while-revalidate).
        // When offline, apiFetch returns the cached payload (persisted to
        // localStorage) so the home screen still renders.
        const [catData, provData] = await Promise.all([
          apiFetch('/categories', { cacheTtl: 5 * 60 * 1000 }),
          apiFetch('/providers?limit=20&sort=featured', { cacheTtl: 2 * 60 * 1000 }),
        ])
        setCategories(catData.categories || [])
        setProviders(provData.providers || [])
      } catch (err) {
        // Offline or server unreachable — keep whatever the store already
        // has (possibly populated from a previous session via the persisted
        // API cache). The OfflineBootstrap banner tells the user why.
        console.error('Failed to load data:', err)
      } finally {
        // ALWAYS mark data as loaded — even on failure — so the screen
        // renders with cached/empty state instead of hanging forever
        // on the loading spinner. This is what makes the app openable
        // when offline.
        setDataLoaded(true)
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  // Featured providers = PRO subscribers + verified + featured
  // PRO providers get homepage visibility (one of the PRO benefits)
  const featuredProviders = providers.filter((p) =>
    p.isFeatured ||
    p.isVerified ||
    (p.user?.isPro && (!p.user?.proExpiry || new Date(p.user.proExpiry) > new Date()))
  )

  // Base list shown when the user isn't searching.
  // Auto-sorted: PRO → Verified → High rated → Others (default)
  // Or sorted by distance if user taps "Nearby"
  const baseProviders = (() => {
    let list = providers.slice(0, 8)

    // Auto-sort: PRO first, then Verified, then by rating
    if (sortBy === 'featured') {
      list.sort((a, b) => {
        const aPro = a.user?.isPro && (!a.user?.proExpiry || new Date(a.user.proExpiry) > new Date()) ? 1 : 0
        const bPro = b.user?.isPro && (!b.user?.proExpiry || new Date(b.user.proExpiry) > new Date()) ? 1 : 0
        if (aPro !== bPro) return bPro - aPro // PRO first
        const aVerified = a.isVerified ? 1 : 0
        const bVerified = b.isVerified ? 1 : 0
        if (aVerified !== bVerified) return bVerified - aVerified // Verified next
        return b.rating - a.rating // Then by rating
      })
    }

    // Distance sort (only when user has lat/lng and opts into Nearby)
    if (sortBy === 'nearby' && hasUserLocation) {
      list = sortByDistance(list, userLat as number, userLng as number)
    }

    return list
  })()
  const topProviders = baseProviders

  // Filter providers by search
  const filteredProviders = searchQuery.trim()
    ? providers.filter((p) =>
        p.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.skills?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : topProviders

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Top Bar */}
      <div className="bg-white sticky top-0 z-40 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <h1 className="text-xl font-extrabold sintha-gradient-text">SINTHA</h1>
        <Badge className="bg-blue-100 text-blue-700 border-0 text-[10px]">Client</Badge>
        <div className="flex-1" />
        <button
          onClick={() => navigate('notifications')}
          className="relative p-2 text-gray-500 hover:text-gray-700"
          aria-label={`Notifications${unreadNotifs > 0 ? ` (${unreadNotifs} unread)` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unreadNotifs > 0 && (
            <span className="absolute top-0 right-0 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">
              {unreadNotifs > 9 ? '9+' : unreadNotifs}
            </span>
          )}
        </button>
        <button
          onClick={() => navigate('profile')}
          className="relative"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=2563eb&color=fff`} />
            <AvatarFallback>{user?.name?.[0] || 'U'}</AvatarFallback>
          </Avatar>
        </button>
      </div>

      {/* Client Welcome Section */}
      <div className="px-4 py-3 bg-white border-b border-gray-50">
        <p className="text-sm text-gray-500">Hello, <span className="font-semibold text-gray-800">{user?.name?.split(' ')[0]}</span></p>
        <p className="text-xs text-gray-400">What service are you looking for today?</p>
      </div>

      {/* Push notification opt-in prompt (web only — hidden in APK WebView). */}
      <div className="px-4 pt-3">
        <PushNotificationPrompt />
      </div>

      {/* AI Smart Search — natural-language provider matching.
          Purple gradient bar distinguishes it from the regular search below.
          Tapping the badge / Send button calls POST /api/ai/smart-search and
          renders provider cards with match scores inline. */}
      <div className="px-4 pt-3">
        <div className="bg-gradient-to-r from-purple-600 to-violet-600 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white leading-tight">AI Smart Search</p>
              <p className="text-[10px] text-white/70 leading-tight">Describe what you need in your own words</p>
            </div>
            <span className="text-[9px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full tracking-wider">
              SINTHA AI
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="e.g. 'tutor for class 10 maths near Imphal'"
              value={aiSearchQuery}
              onChange={(e) => setAiSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAiSearch() }}
              disabled={aiSearching}
              className="flex-1 bg-white/95 text-gray-800 placeholder:text-gray-400 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/60 disabled:opacity-60"
            />
            {aiSearching ? (
              <div className="bg-white/20 rounded-xl p-2.5 shrink-0">
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              </div>
            ) : (
              <button
                onClick={handleAiSearch}
                disabled={!aiSearchQuery.trim()}
                className="bg-white text-purple-700 rounded-xl p-2.5 shrink-0 disabled:opacity-50 active:scale-95 transition-transform"
                aria-label="Run AI smart search"
              >
                <Send className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* AI loading shimmer */}
          {aiSearching && (
            <div className="mt-3 space-y-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-white/15 rounded-xl p-3 animate-pulse h-16" />
              ))}
            </div>
          )}

          {/* AI summary */}
          {!aiSearching && aiSummary && (
            <div className="mt-3 bg-white/15 rounded-xl p-3 text-white">
              <p className="text-xs leading-relaxed">{aiSummary}</p>
            </div>
          )}

          {/* AI matches */}
          {!aiSearching && aiResults.length > 0 && (
            <div className="mt-3 space-y-2 max-h-96 overflow-y-auto sintha-scrollbar pr-1">
              {aiResults.map((m, i) => (
                <button
                  key={`${m.providerId}-${i}`}
                  onClick={() => navigate('provider-profile', { providerId: m.providerId })}
                  className="w-full bg-white rounded-xl p-3 shadow-sm flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
                >
                  <Avatar className="h-11 w-11 shrink-0">
                    <AvatarImage src={m.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name || 'P')}&background=7c3aed&color=fff`} />
                    <AvatarFallback>{m.name?.[0] || 'P'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-gray-800 truncate">{m.name}</p>
                      {m.verified && <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                      {m.pro && <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-gray-500 truncate">{m.category}</p>
                    {m.reason && (
                      <p className="text-[10px] text-purple-700 mt-0.5 line-clamp-2">{m.reason}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {typeof m.rating === 'number' && m.rating > 0 && (
                        <div className="flex items-center gap-0.5">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          <span className="text-[10px] font-semibold text-gray-700">{m.rating.toFixed(1)}</span>
                        </div>
                      )}
                      {typeof m.hourlyRate === 'number' && m.hourlyRate > 0 && (
                        <span className="text-[10px] text-gray-500">₹{m.hourlyRate}/hr</span>
                      )}
                    </div>
                  </div>
                  {/* Match score ring */}
                  {typeof m.matchScore === 'number' && (
                    <div className="shrink-0 flex flex-col items-center justify-center">
                      <div className="relative w-10 h-10">
                        <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                          <circle
                            cx="18" cy="18" r="15" fill="none" stroke="#7c3aed" strokeWidth="3"
                            strokeDasharray={`${(m.matchScore / 100) * 94.2} 94.2`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-purple-700">
                          {Math.round(m.matchScore)}
                        </span>
                      </div>
                      <span className="text-[8px] text-gray-400 font-medium mt-0.5">match</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Clear AI results */}
          {!aiSearching && (aiResults.length > 0 || aiSummary) && (
            <button
              onClick={clearAiSearch}
              className="mt-2 w-full text-center text-[11px] text-white/80 hover:text-white flex items-center justify-center gap-1"
            >
              <X className="h-3 w-3" /> Clear AI results
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-3 bg-white">
        <div className={`relative transition-all ${searchFocused ? 'ring-2 ring-blue-300' : ''} rounded-xl`}>
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search services, providers..."
            className="pl-10 bg-gray-50 border-0 rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </div>
      </div>

      {/* Hero Banner */}
      <div className="px-4 pt-2">
        <div className="sintha-gradient rounded-2xl p-5 text-white relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
          <div className="absolute right-8 -bottom-4 w-20 h-20 bg-white/5 rounded-full" />
          <h2 className="text-lg font-bold relative z-10">Find Trusted Services</h2>
          <h3 className="text-lg font-bold relative z-10">in Manipur</h3>
          <p className="text-sm opacity-80 mt-1 relative z-10">Zero commission &bull; AI powered &bull; Verified providers</p>
          <div className="flex items-center gap-3 mt-3 relative z-10">
            <div className="flex items-center gap-1 bg-white/20 rounded-full px-2.5 py-1">
              <Shield className="h-3 w-3" />
              <span className="text-[10px] font-medium">Verified</span>
            </div>
            <div className="flex items-center gap-1 bg-white/20 rounded-full px-2.5 py-1">
              <Zap className="h-3 w-3" />
              <span className="text-[10px] font-medium">Fast</span>
            </div>
            <div className="flex items-center gap-1 bg-white/20 rounded-full px-2.5 py-1">
              <Bot className="h-3 w-3" />
              <span className="text-[10px] font-medium">AI Match</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats for Client */}
      <div className="px-4 pt-4">
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => navigate('post-job')}
            className="bg-white rounded-xl p-3 text-center shadow-sm sintha-card-hover"
          >
            <Briefcase className="h-5 w-5 text-blue-600 mx-auto mb-1" />
            <span className="text-[10px] font-medium text-gray-600">Post Job</span>
          </button>
          <button
            onClick={() => navigate('my-jobs')}
            className="bg-white rounded-xl p-3 text-center shadow-sm sintha-card-hover"
          >
            <Calendar className="h-5 w-5 text-amber-600 mx-auto mb-1" />
            <span className="text-[10px] font-medium text-gray-600">My Jobs</span>
          </button>
          <button
            onClick={() => navigate('my-bookings')}
            className="bg-white rounded-xl p-3 text-center shadow-sm sintha-card-hover"
          >
            <Calendar className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <span className="text-[10px] font-medium text-gray-600">Bookings</span>
          </button>
          <button
            onClick={() => navigate('chat-list')}
            className="bg-white rounded-xl p-3 text-center shadow-sm sintha-card-hover"
          >
            <MessageCircle className="h-5 w-5 text-purple-600 mx-auto mb-1" />
            <span className="text-[10px] font-medium text-gray-600">Messages</span>
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 pt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-800">Categories</h2>
        </div>
        {categories.length === 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {categories.map((cat: ServiceCategory) => {
              const IconComp = categoryIcons[cat.icon || ''] || Home
              return (
                <button
                  key={cat.id}
                  onClick={() => navigate('category', { categoryId: cat.id, categoryName: cat.name })}
                  className="bg-white rounded-xl p-2.5 text-center sintha-card-hover shadow-sm border border-[#E2E8F0]"
                >
                  <div className="w-10 h-10 rounded-full bg-[#F1F5F9] flex items-center justify-center mx-auto mb-1.5">
                    <IconComp className="h-5 w-5 text-[#0F4C81]" />
                  </div>
                  <p className="text-xs font-bold text-[#1E293B] line-clamp-1">{cat.name}</p>
                  <p className="text-[9px] text-[#64748B] mt-0.5">{cat._count?.providers || 0} providers</p>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Nearby Providers */}
      <div className="pt-6">
        <div className="flex items-center justify-between mb-3 px-4">
          <h2 className="text-lg font-bold text-gray-800">
            {searchQuery ? 'Search Results' : 'Nearby Providers'}
          </h2>
          {!searchQuery && providers.length > 0 && (
            <button
              onClick={() => navigate('category', { categoryId: categories[0]?.id || '', categoryName: 'All' })}
              className="text-sm text-blue-600 font-medium flex items-center"
            >
              See All <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Sort toggle: Featured (default) | Nearby (only if user has lat/lng) */}
        {!searchQuery && providers.length > 0 && (
          <div className="px-4 mb-3 flex items-center gap-2">
            <button
              onClick={() => setSortBy('featured')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                sortBy === 'featured'
                  ? 'sintha-gradient text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              Featured
            </button>
            {hasUserLocation && (
              <button
                onClick={() => setSortBy('nearby')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors flex items-center gap-1 ${
                  sortBy === 'nearby'
                    ? 'sintha-gradient text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                <MapPin className="h-3 w-3" />
                Nearby
              </button>
            )}
          </div>
        )}
        {filteredProviders.length === 0 ? (
          <div className="px-4">
            <div className="bg-white rounded-xl p-8 text-center shadow-sm">
              <Search className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400 font-medium">
                {searchQuery ? 'No providers found for your search' : 'No providers yet'}
              </p>
              <p className="text-xs text-gray-300 mt-1">
                {searchQuery ? 'Try a different search term' : 'Providers will appear as they join SINTHA'}
              </p>
            </div>
          </div>
        ) : searchQuery ? (
          <div className="px-4 space-y-3">
            {filteredProviders.slice(0, 10).map((p: ProviderProfile) => (
              <button
                key={p.id}
                onClick={() => navigate('provider-profile', { providerId: p.id })}
                className="w-full bg-white rounded-xl p-4 shadow-sm sintha-card-hover flex items-center gap-3 text-left"
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={p.user?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.user?.name || 'P')}&background=2563eb&color=fff`} />
                  <AvatarFallback>{p.user?.name?.[0] || 'P'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-800 truncate">{p.user?.name}</p>
                    {p.isVerified && <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{p.category?.name} &bull; {p.experience || 'Experienced'}</p>
                  {p.user?.location && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-gray-400" />
                      <span className="text-[10px] text-gray-400">{p.user.location}</span>
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-semibold">{p.rating}</span>
                  </div>
                  {p.hourlyRate && (
                    <p className="text-[10px] text-gray-400">₹{p.hourlyRate}/hr</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto px-4 pb-2 sintha-scrollbar">
            {topProviders.map((p: ProviderProfile) => (
              <button
                key={p.id}
                onClick={() => navigate('provider-profile', { providerId: p.id })}
                className="bg-white rounded-2xl p-4 shadow-sm min-w-[160px] shrink-0 sintha-card-hover text-left border border-[#E2E8F0] relative"
              >
                {/* Available Now badge */}
                {p.availability === 'available' && (
                  <span className="absolute top-2 right-2 bg-green-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                    Available Now
                  </span>
                )}
                <Avatar className="h-20 w-20 mx-auto mb-2 border-2 border-[#E2E8F0]">
                  <AvatarImage src={p.user?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.user?.name || 'P')}&background=0F4C81&color=fff&size=128`} />
                  <AvatarFallback className="text-lg font-bold text-[#0F4C81]">{p.user?.name?.[0] || 'P'}</AvatarFallback>
                </Avatar>
                <p className="text-sm font-bold text-[#0F1111] text-center truncate">{p.user?.name}</p>
                <p className="text-xs text-[#0F4C81] font-medium text-center truncate mt-0.5">{p.category?.name}</p>
                <div className="flex items-center justify-center gap-1.5 mt-2">
                  <div className="flex items-center gap-0.5">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-bold text-[#0F1111]">{p.rating > 0 ? p.rating.toFixed(1) : 'New'}</span>
                  </div>
                  {p.isVerified && <CheckCircle className="h-4 w-4 text-[#10B981]" />}
                  {p.user?.isPro && (!p.user?.proExpiry || new Date(p.user.proExpiry) > new Date()) && (
                    <Crown className="h-4 w-4 text-amber-500" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Featured / Verified Providers */}
      {featuredProviders.length > 0 && !searchQuery && (
        <div className="pt-6 px-4">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-bold text-gray-800">Verified Providers</h2>
          </div>
          <div className="space-y-3">
            {featuredProviders.slice(0, 5).map((p: ProviderProfile) => (
              <button
                key={p.id}
                onClick={() => navigate('provider-profile', { providerId: p.id })}
                className="w-full bg-white rounded-2xl p-4 shadow-sm sintha-card-hover flex items-center gap-4 text-left border border-[#E2E8F0]"
              >
                <Avatar className="h-16 w-16 border-2 border-[#E2E8F0]">
                  <AvatarImage src={p.user?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.user?.name || 'P')}&background=0F4C81&color=fff&size=128`} />
                  <AvatarFallback className="text-lg font-bold text-[#0F4C81]">{p.user?.name?.[0] || 'P'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-800 truncate">{p.user?.name}</p>
                    {p.isVerified && <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                    {/* PRO badge — shows for PRO subscribers */}
                    {p.user?.isPro && (!p.user?.proExpiry || new Date(p.user.proExpiry) > new Date()) && (
                      <Badge className="sintha-pro-badge text-[9px] text-white px-1.5 py-0 border-0">
                        <Crown className="h-2.5 w-2.5 mr-0.5" />PRO
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{p.category?.name} &bull; {p.experience || 'Experienced'}</p>
                  {p.user?.location && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-gray-400" />
                      <span className="text-[10px] text-gray-400">{p.user.location}</span>
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-semibold">{p.rating}</span>
                  </div>
                  {p.hourlyRate && <p className="text-[10px] text-gray-400">₹{p.hourlyRate}/hr</p>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Why SINTHA Section */}
      {!searchQuery && (
        <div className="pt-6 px-4">
          <h2 className="text-lg font-bold text-gray-800 mb-3">Why SINTHA?</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-4 shadow-sm">
              <Shield className="h-6 w-6 text-blue-600 mb-2" />
              <p className="text-xs font-semibold text-gray-800">Verified Providers</p>
              <p className="text-[10px] text-gray-500 mt-1">Background-checked professionals</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-white rounded-xl p-4 shadow-sm">
              <TrendingUp className="h-6 w-6 text-green-600 mb-2" />
              <p className="text-xs font-semibold text-gray-800">Zero Commission</p>
              <p className="text-[10px] text-gray-500 mt-1">Fair pricing, no hidden fees</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl p-4 shadow-sm">
              <Bot className="h-6 w-6 text-purple-600 mb-2" />
              <p className="text-xs font-semibold text-gray-800">AI Assistant</p>
              <p className="text-[10px] text-gray-500 mt-1">Smart matching & guidance</p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl p-4 shadow-sm">
              <MapPin className="h-6 w-6 text-amber-600 mb-2" />
              <p className="text-xs font-semibold text-gray-800">Local & Trusted</p>
              <p className="text-[10px] text-gray-500 mt-1">Built for Manipur communities</p>
            </div>
          </div>
        </div>
      )}

      {/* Spacer */}
      <div className="h-6" />

      <BottomNav />
    </div>
  )
}
