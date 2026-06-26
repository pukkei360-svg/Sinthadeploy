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
import {
  Search, Bell, Home, GraduationCap, Car, Camera, Sparkles, Wrench,
  CheckCircle, Star, Crown, ChevronRight, Calendar, MessageCircle,
  MapPin, TrendingUp, Zap, Shield, Bot, Briefcase, X, Phone
} from 'lucide-react'

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
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [dataLoaded, setDataLoaded] = useState(false)

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
      // DON'T set loading=true if we already have cached data — show it immediately
      // and refresh in the background. Only show loading spinner on very first load.
      if (categories.length === 0 && providers.length === 0) {
        setIsLoading(true)
      }
      try {
        // Only call /seed on very first ever load (no categories in store AND no cache)
        if (categories.length === 0) {
          try { await apiFetch('/seed', { method: 'POST' }) } catch {}
        }
        // Fetch categories + providers in parallel (cached for 5 min / 2 min)
        const [catData, provData] = await Promise.all([
          apiFetch('/categories', { cacheTtl: 5 * 60 * 1000 }),
          apiFetch('/providers?limit=20&sort=featured', { cacheTtl: 2 * 60 * 1000 }),
        ])
        setCategories(catData.categories || [])
        setProviders(provData.providers || [])
      } catch (err) {
        console.error('Failed to load data:', err)
      } finally {
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

      {/* Search Bar — sticky so it stays visible when scrolling through results */}
      <div className="px-4 py-3 bg-white sticky top-[52px] z-30 border-b border-gray-100">
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
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* When searching, hide everything except results for a clean experience */}
      {!searchQuery && (
        <>
      {/* Hero Banner */}
      <div className="px-4 pt-2">
        <div className="sintha-gradient rounded-2xl p-5 text-white relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
          <div className="absolute right:8 -bottom-4 w-20 h-20 bg-white/5 rounded-full" />
          <h2 className="text-lg font-bold relative z-10">Find Trusted Services</h2>
          <h3 className="text-lg font-bold relative z-10">in Manipur</h3>
          <p className="text-sm opacity-80 mt-1 relative z-10">Zero commission &bull; Verified providers &bull; Trusted by Manipur</p>
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
              <span className="text-[10px] font-medium">Quick Match</span>
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
        </>
      )}

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
          <div className="px-4 space-y-4">
            {filteredProviders.slice(0, 10).map((p: ProviderProfile) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] sintha-card-hover overflow-hidden"
              >
                {/* Top: Avatar + Name + Job title + Rating */}
                <button
                  onClick={() => navigate('provider-profile', { providerId: p.id })}
                  className="w-full flex items-center gap-4 p-4 text-left"
                >
                  <Avatar className="h-20 w-20 border-2 border-[#E2E8F0] shrink-0">
                    <AvatarImage src={p.user?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.user?.name || 'P')}&background=0F4C81&color=fff&size=128`} />
                    <AvatarFallback className="text-xl font-bold text-[#0F4C81]">{p.user?.name?.[0] || 'P'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-base font-bold text-gray-800 truncate">{p.user?.name}</p>
                      {p.isVerified && (
                        <span className="sintha-badge-verified inline-flex items-center gap-0.5">
                          <CheckCircle className="h-3 w-3" />Verified
                        </span>
                      )}
                      {p.user?.isPro && (!p.user?.proExpiry || new Date(p.user.proExpiry) > new Date()) && (
                        <Badge className="sintha-pro-badge text-[9px] text-white px-1.5 py-0 border-0">
                          <Crown className="h-2.5 w-2.5 mr-0.5" />PRO
                        </Badge>
                      )}
                    </div>
                    {/* Job title ONLY */}
                    <p className="text-sm text-[#0F4C81] font-semibold mt-0.5">{p.category?.name}</p>
                    {/* Rating + rate */}
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex items-center gap-0.5">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-bold text-gray-700">
                          {p.rating > 0 ? p.rating.toFixed(1) : 'New'}
                        </span>
                        {p.totalReviews > 0 && (
                          <span className="text-[10px] text-gray-400">({p.totalReviews})</span>
                        )}
                      </div>
                      {p.hourlyRate && (
                        <span className="text-[11px] text-gray-500">₹{p.hourlyRate}/hr</span>
                      )}
                    </div>
                  </div>
                </button>

                {/* Bottom: Call + Book Now buttons side by side */}
                <div className="flex gap-2 px-4 pb-4">
                  <button
                    onClick={() => {
                      if (p.user?.phone) {
                        window.open(`tel:${p.user.phone}`, '_self')
                      } else {
                        navigate('chat-room', {
                          providerId: p.userId,
                          providerName: p.user?.name || 'Provider',
                        })
                      }
                    }}
                    className="sintha-btn-outlined flex-1 py-3 px-4 text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    <Phone className="h-4 w-4" />
                    Call
                  </button>
                  <button
                    onClick={() => navigate('booking-form', {
                      providerId: p.userId,
                      providerName: p.user?.name || 'Provider',
                      service: p.category?.name || '',
                    })}
                    className="sintha-btn-filled flex-1 py-3 px-4 text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    Book Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto px-4 pb-2 sintha-scrollbar">
            {topProviders.map((p: ProviderProfile) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl shadow-sm min-w-[240px] shrink-0 sintha-card-hover border border-[#E2E8F0] relative overflow-hidden flex flex-col"
              >
                {/* Available Now badge */}
                {p.availability === 'available' && (
                  <span className="absolute top-3 right-3 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full z-10">
                    Available
                  </span>
                )}

                {/* Tappable profile area — opens provider profile */}
                <button
                  onClick={() => navigate('provider-profile', { providerId: p.id })}
                  className="flex flex-col items-center pt-5 pb-3 px-4"
                >
                  <Avatar className="h-24 w-24 mx-auto mb-3 border-2 border-[#E2E8F0]">
                    <AvatarImage src={p.user?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.user?.name || 'P')}&background=0F4C81&color=fff&size=128`} />
                    <AvatarFallback className="text-2xl font-bold text-[#0F4C81]">{p.user?.name?.[0] || 'P'}</AvatarFallback>
                  </Avatar>
                  {/* Name + badges */}
                  <div className="flex items-center gap-1.5 justify-center">
                    <p className="text-base font-bold text-[#0F1111] text-center truncate max-w-[180px]">{p.user?.name}</p>
                    {p.isVerified && <CheckCircle className="h-4 w-4 text-[#0F4C81] shrink-0" />}
                    {p.user?.isPro && (!p.user?.proExpiry || new Date(p.user.proExpiry) > new Date()) && (
                      <Crown className="h-4 w-4 text-amber-500 shrink-0" />
                    )}
                  </div>
                  {/* Job title only — no long description */}
                  <p className="text-sm text-[#0F4C81] font-semibold text-center mt-0.5">{p.category?.name}</p>
                  {/* Rating */}
                  <div className="flex items-center gap-1 mt-2">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-bold text-[#0F1111]">{p.rating > 0 ? p.rating.toFixed(1) : 'New'}</span>
                    {p.totalReviews > 0 && (
                      <span className="text-[10px] text-gray-400">({p.totalReviews})</span>
                    )}
                  </div>
                </button>

                {/* Call + Book buttons side by side */}
                <div className="flex gap-2 px-4 pb-4">
                  {/* Call button */}
                  <button
                    onClick={() => {
                      if (p.user?.phone) {
                        window.open(`tel:${p.user.phone}`, '_self')
                      } else {
                        // No phone — open chat instead
                        navigate('chat-room', {
                          providerId: p.userId,
                          providerName: p.user?.name || 'Provider',
                        })
                      }
                    }}
                    className="sintha-btn-outlined flex-1 py-2.5 px-2 text-xs font-semibold flex items-center justify-center gap-1.5"
                    aria-label="Call provider"
                  >
                    <Phone className="h-4 w-4" />
                    Call
                  </button>
                  {/* Book Now button */}
                  <button
                    onClick={() => navigate('booking-form', {
                      providerId: p.userId,
                      providerName: p.user?.name || 'Provider',
                      service: p.category?.name || '',
                    })}
                    className="sintha-btn-filled flex-1 py-2.5 px-2 text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Calendar className="h-4 w-4" />
                    Book Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Featured / Verified Providers — bigger cards with Call + Book buttons */}
      {featuredProviders.length > 0 && !searchQuery && (
        <div className="pt-6 px-4">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-bold text-gray-800">Verified Providers</h2>
          </div>
          <div className="space-y-4">
            {featuredProviders.slice(0, 5).map((p: ProviderProfile) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] sintha-card-hover overflow-hidden"
              >
                {/* Top: Avatar + Name + Job title + Rating (tappable → provider profile) */}
                <button
                  onClick={() => navigate('provider-profile', { providerId: p.id })}
                  className="w-full flex items-center gap-4 p-4 text-left"
                >
                  <Avatar className="h-20 w-20 border-2 border-[#E2E8F0] shrink-0">
                    <AvatarImage src={p.user?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.user?.name || 'P')}&background=0F4C81&color=fff&size=128`} />
                    <AvatarFallback className="text-xl font-bold text-[#0F4C81]">{p.user?.name?.[0] || 'P'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    {/* Name + badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-base font-bold text-gray-800 truncate">{p.user?.name}</p>
                      {p.isVerified && (
                        <span className="sintha-badge-verified inline-flex items-center gap-0.5">
                          <CheckCircle className="h-3 w-3" />Verified
                        </span>
                      )}
                      {p.user?.isPro && (!p.user?.proExpiry || new Date(p.user.proExpiry) > new Date()) && (
                        <Badge className="sintha-pro-badge text-[9px] text-white px-1.5 py-0 border-0">
                          <Crown className="h-2.5 w-2.5 mr-0.5" />PRO
                        </Badge>
                      )}
                    </div>
                    {/* Job title ONLY — no long descriptions */}
                    <p className="text-sm text-[#0F4C81] font-semibold mt-0.5">{p.category?.name}</p>
                    {/* Rating + rate (one line) */}
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex items-center gap-0.5">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-bold text-gray-700">
                          {p.rating > 0 ? p.rating.toFixed(1) : 'New'}
                        </span>
                        {p.totalReviews > 0 && (
                          <span className="text-[10px] text-gray-400">({p.totalReviews})</span>
                        )}
                      </div>
                      {p.hourlyRate && (
                        <span className="text-[11px] text-gray-500">₹{p.hourlyRate}/hr</span>
                      )}
                    </div>
                  </div>
                </button>

                {/* Bottom: Call + Book Now buttons side by side (full width) */}
                <div className="flex gap-2 px-4 pb-4">
                  {/* Call button */}
                  <button
                    onClick={() => {
                      if (p.user?.phone) {
                        window.open(`tel:${p.user.phone}`, '_self')
                      } else {
                        navigate('chat-room', {
                          providerId: p.userId,
                          providerName: p.user?.name || 'Provider',
                        })
                      }
                    }}
                    className="sintha-btn-outlined flex-1 py-3 px-4 text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    <Phone className="h-4 w-4" />
                    Call
                  </button>
                  {/* Book Now button */}
                  <button
                    onClick={() => navigate('booking-form', {
                      providerId: p.userId,
                      providerName: p.user?.name || 'Provider',
                      service: p.category?.name || '',
                    })}
                    className="sintha-btn-filled flex-1 py-3 px-4 text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    Book Now
                  </button>
                </div>
              </div>
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
              <p className="text-xs font-semibold text-gray-800">Help &amp; FAQ</p>
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
