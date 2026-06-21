'use client'

import { useEffect, useState } from 'react'
import { useAppStore, type ServiceCategory, type ProviderProfile } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import BottomNav from './BottomNav'
import FestivalBanner from './FestivalBanner'
import {
  Search, Bell, Home, GraduationCap, Car, Camera, Sparkles, Wrench,
  CheckCircle, Star, Crown, ChevronRight, Calendar, MessageCircle,
  MapPin, TrendingUp, Zap, Shield, Bot, Siren
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
  const topProviders = providers.slice(0, 8)

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
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => navigate('my-bookings')}
            className="bg-white rounded-xl p-3 text-center shadow-sm"
          >
            <Calendar className="h-5 w-5 text-blue-600 mx-auto mb-1" />
            <span className="text-[10px] font-medium text-gray-600">My Bookings</span>
          </button>
          <button
            onClick={() => navigate('chat-list')}
            className="bg-white rounded-xl p-3 text-center shadow-sm"
          >
            <MessageCircle className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <span className="text-[10px] font-medium text-gray-600">Messages</span>
          </button>
          <button
            onClick={() => navigate('ai-assistant')}
            className="bg-white rounded-xl p-3 text-center shadow-sm"
          >
            <Bot className="h-5 w-5 text-purple-600 mx-auto mb-1" />
            <span className="text-[10px] font-medium text-gray-600">AI Assistant</span>
          </button>
        </div>
      </div>

      {/* Festival Banner — auto-detects current festival */}
      <FestivalBanner onNavigate={navigate} />

      {/* SOS Emergency Button */}
      <div className="px-4 pt-3">
        <button
          onClick={() => navigate('sos')}
          className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl py-3 flex items-center justify-center gap-2 font-bold text-sm shadow-md transition-colors"
        >
          <Siren className="h-4 w-4" /> SOS Emergency
        </button>
      </div>

      {/* Categories */}
      <div className="px-4 pt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-800">Categories</h2>
        </div>
        {categories.length === 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {categories.map((cat: ServiceCategory) => {
              const IconComp = categoryIcons[cat.icon || ''] || Home
              return (
                <button
                  key={cat.id}
                  onClick={() => navigate('category', { categoryId: cat.id, categoryName: cat.name })}
                  className="bg-white rounded-2xl p-4 text-center sintha-card-hover shadow-sm border border-[#E2E8F0]"
                >
                  <div className="w-16 h-16 rounded-full bg-[#F1F5F9] flex items-center justify-center mx-auto mb-2">
                    <IconComp className="h-8 w-8 text-[#0F4C81]" />
                  </div>
                  <p className="text-sm font-bold text-[#1E293B] line-clamp-1">{cat.name}</p>
                  <p className="text-[10px] text-[#64748B] mt-0.5">{cat._count?.providers || 0} providers</p>
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
                className="bg-white rounded-2xl p-4 shadow-sm min-w-[160px] shrink-0 sintha-card-hover text-left border border-[#E2E8F0]"
              >
                <Avatar className="h-20 w-20 mx-auto mb-2 border-2 border-[#E2E8F0]">
                  <AvatarImage src={p.user?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.user?.name || 'P')}&background=0F4C81&color=fff&size=128`} />
                  <AvatarFallback className="text-lg font-bold text-[#0F4C81]">{p.user?.name?.[0] || 'P'}</AvatarFallback>
                </Avatar>
                <p className="text-sm font-bold text-[#1E293B] text-center truncate">{p.user?.name}</p>
                <p className="text-xs text-[#0F4C81] font-medium text-center truncate mt-0.5">{p.category?.name}</p>
                <div className="flex items-center justify-center gap-1.5 mt-2">
                  <div className="flex items-center gap-0.5">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-bold text-[#1E293B]">{p.rating > 0 ? p.rating.toFixed(1) : 'New'}</span>
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
