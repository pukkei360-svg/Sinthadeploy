'use client'

import { useEffect, useState } from 'react'
import { useAppStore, type ProviderProfile } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/hooks/use-toast'
import {
  ArrowLeft, Star, CheckCircle, Crown, Clock, MapPin, MessageCircle,
  Calendar, DollarSign, Briefcase, Shield, ChevronRight, Image as ImageIcon, Flag, Heart
} from 'lucide-react'
import { cleanError } from '@/lib/clean-error'

export default function ProviderProfileScreen() {
  const { navigate, viewParams, user, providers } = useAppStore()
  const [provider, setProvider] = useState<ProviderProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasBooking, setHasBooking] = useState(false)
  const [checkingBooking, setCheckingBooking] = useState(true)
  const [isFavorited, setIsFavorited] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)

  const providerId = viewParams?.providerId

  useEffect(() => {
    const loadProvider = async () => {
      setLoading(true)
      try {
        const data = await apiFetch(`/providers/${providerId}`)
        setProvider(data.provider)
      } catch {
        // Fallback to store
        const found = providers.find((p) => p.id === providerId)
        setProvider(found || null)
      } finally {
        setLoading(false)
      }
    }
    if (providerId) loadProvider()
  }, [providerId, providers])

  // Check if this provider is in the client's favorites
  useEffect(() => {
    const checkFavorite = async () => {
      if (!user || !providerId) return
      // Only check for clients (providers don't favorite other providers)
      if (user.role === 'provider') return
      try {
        const data = await apiFetch(`/favorites?clientId=${user.id}&providerId=${providerId}`)
        setIsFavorited(!!data.favorited)
      } catch {
        // Favorites table might not exist yet — silent
      }
    }
    checkFavorite()
  }, [user, providerId])

  const toggleFavorite = async () => {
    if (!user || !provider) return
    setFavoriteLoading(true)
    try {
      if (isFavorited) {
        await apiFetch('/favorites', {
          method: 'DELETE',
          body: JSON.stringify({ clientId: user.id, providerId }),
        })
        setIsFavorited(false)
        toast({ title: 'Removed', description: 'Provider removed from your saved list' })
      } else {
        await apiFetch('/favorites', {
          method: 'POST',
          body: JSON.stringify({ clientId: user.id, providerId }),
        })
        setIsFavorited(true)
        toast({ title: 'Saved!', description: 'Provider added to your saved list' })
      }
    } catch (err: unknown) {
      toast({ title: 'Error', description: cleanError(err) })
    } finally {
      setFavoriteLoading(false)
    }
  }

  // Check if user has booked this provider
  // IMPORTANT: Use provider.userId (User ID) — NOT providerId (ProviderProfile ID).
  // Booking.providerId references User.id in Prisma schema, so the bookings API
  // expects the provider's User ID, not their ProviderProfile ID.
  useEffect(() => {
    const checkBooking = async () => {
      if (!user || !provider) {
        setCheckingBooking(false)
        return
      }
      const providerUserId = provider.userId
      if (!providerUserId) {
        setCheckingBooking(false)
        return
      }
      try {
        const data = await apiFetch(`/bookings?clientId=${user.id}&providerId=${providerUserId}`)
        const bookings = data.bookings || []
        // Has booking if any booking exists (any status except 'cancelled')
        const activeBooking = bookings.find((b: { status: string }) => b.status !== 'cancelled')
        setHasBooking(!!activeBooking)
      } catch {
        setHasBooking(false)
      } finally {
        setCheckingBooking(false)
      }
    }
    checkBooking()
  }, [user, provider])

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-4 space-y-4">
        <Skeleton className="h-6 w-20" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-32" />
      </div>
    )
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-400">Provider not found</p>
      </div>
    )
  }

  const portfolioImages = provider.portfolioUrls
    ? JSON.parse(provider.portfolioUrls)
    : []

  return (
    <div className="min-h-screen bg-white pb-28">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate('home')} className="text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">Provider Profile</h1>
        <div className="flex-1" />
        {/* Favorite (heart) button — clients only, hidden for providers viewing other providers */}
        {user?.role === 'client' && (
          <button
            onClick={toggleFavorite}
            disabled={favoriteLoading}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
            aria-label={isFavorited ? 'Remove from saved' : 'Save provider'}
          >
            <Heart
              className={`h-5 w-5 ${
                isFavorited
                  ? 'fill-red-500 text-red-500'
                  : 'text-gray-400'
              }`}
            />
          </button>
        )}
      </div>

      {/* Profile Header */}
      <div className="px-4 py-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-20 w-20">
              <AvatarImage src={provider.user?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(provider.user?.name || 'P')}&background=2563eb&color=fff`} />
              <AvatarFallback className="text-2xl">{provider.user?.name?.[0] || 'P'}</AvatarFallback>
            </Avatar>
            {provider.availability === 'available' && (
              <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-3 border-white" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-gray-800">{provider.user?.name}</h2>
              {provider.isVerified && (
                <Badge className="bg-green-100 text-green-700 border-0 text-[10px] px-2 py-0.5">
                  <CheckCircle className="h-3 w-3 mr-1" />Verified
                </Badge>
              )}
              {/* PRO badge — shows if the user has an active PRO subscription */}
              {provider.user?.isPro && (!provider.user?.proExpiry || new Date(provider.user.proExpiry) > new Date()) && (
                <Badge className="sintha-pro-badge text-[10px] text-white px-2 py-0.5 border-0">
                  <Crown className="h-3 w-3 mr-1" />PRO
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-500">{provider.category?.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`h-4 w-4 ${s <= Math.round(provider.rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
                  />
                ))}
              </div>
              <span className="text-sm font-semibold">{provider.rating}</span>
              <button
                onClick={() => navigate('reviews', { targetId: provider.userId })}
                className="text-xs text-blue-600 hover:underline"
              >
                ({provider.totalReviews} reviews)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Info */}
      <div className="px-4 grid grid-cols-3 gap-3 mb-4">
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <Briefcase className="h-5 w-5 text-blue-600 mx-auto mb-1" />
          <p className="text-xs text-gray-500">Experience</p>
          <p className="text-sm font-bold text-gray-800">{provider.experience}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <DollarSign className="h-5 w-5 text-green-600 mx-auto mb-1" />
          <p className="text-xs text-gray-500">Hourly Rate</p>
          <p className="text-sm font-bold text-gray-800">₹{provider.hourlyRate}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 text-center">
          <Calendar className="h-5 w-5 text-amber-600 mx-auto mb-1" />
          <p className="text-xs text-gray-500">Bookings</p>
          <p className="text-sm font-bold text-gray-800">{provider.totalBookings}</p>
        </div>
      </div>

      <Separator className="mx-4" />

      {/* About */}
      {provider.description && (
        <div className="px-4 py-4">
          <h3 className="font-semibold text-gray-800 mb-2">About</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{provider.description}</p>
        </div>
      )}

      {/* Skills */}
      {provider.skills && (
        <div className="px-4 pb-4">
          <h3 className="font-semibold text-gray-800 mb-2">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {provider.skills.split(',').map((skill, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {skill.trim()}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Separator className="mx-4" />

      {/* Portfolio */}
      {portfolioImages.length > 0 && (
        <div className="px-4 py-4">
          <h3 className="font-semibold text-gray-800 mb-2">Portfolio</h3>
          <div className="grid grid-cols-3 gap-2">
            {portfolioImages.map((url: string, i: number) => (
              <div key={i} className="aspect-square rounded-lg bg-gray-100 overflow-hidden">
                <img src={url} alt={`Portfolio ${i + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Availability & Location */}
      <div className="px-4 py-4 space-y-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600">Status:</span>
          <Badge variant={provider.availability === 'available' ? 'default' : 'secondary'}>
            {provider.availability === 'available' ? 'Available Now' : provider.availability}
          </Badge>
        </div>
        {provider.user?.location && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">{provider.user.location}</span>
          </div>
        )}
      </div>

      {/* Sticky Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 z-50">
        <div className="max-w-lg mx-auto flex gap-3">
          <Button
            variant="outline"
            disabled={checkingBooking}
            className={`flex-1 py-6 font-semibold ${
              checkingBooking
                ? 'opacity-60 cursor-wait'
                : !hasBooking
                ? 'opacity-50 cursor-not-allowed'
                : ''
            }`}
            onClick={() => {
              // Ignore clicks while the booking check is still running.
              // This prevents the "Booking Required" toast from firing
              // during the ~200-500ms window before the API responds.
              if (checkingBooking) return
              if (!hasBooking) {
                toast({
                  title: 'Booking Required',
                  description: 'Please book this provider first to start chatting.',
                  variant: 'destructive',
                })
                return
              }
              navigate('chat-room', { providerId: provider.userId, providerName: provider.user?.name || 'Provider' })
            }}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            {checkingBooking ? 'Checking...' : hasBooking ? 'Chat' : 'Chat 🔒'}
          </Button>
          <button
            className="sintha-btn-book flex-1 py-3.5 px-4 text-sm font-semibold inline-flex items-center justify-center"
            onClick={() => navigate('booking-form', { providerId: provider.userId, providerName: provider.user?.name || 'Provider', service: provider.category?.name || '' })}
          >
            <Calendar className="h-4 w-4 mr-2" /> {hasBooking ? 'Book Again' : 'Book Now'}
          </button>
        </div>
        {checkingBooking && (
          <p className="text-[11px] text-center text-gray-400 mt-2">
            Checking your bookings...
          </p>
        )}
        {!checkingBooking && !hasBooking && (
          <p className="text-[11px] text-center text-gray-500 mt-2">
            🔒 Book this provider first to unlock chat
          </p>
        )}
        {!checkingBooking && hasBooking && (
          <p className="text-[11px] text-center text-green-600 mt-2">
            ✅ Chat unlocked — you have a booking with this provider
          </p>
        )}

        {/* Report Provider — small, low-emphasis link. Visible to any
            logged-in user; the report form itself requires a reason. */}
        {user && provider?.userId && user.id !== provider.userId && (
          <button
            onClick={() => navigate('report-provider', {
              subjectId: provider.userId,
              subjectName: provider.user?.name || 'this provider',
            })}
            className="w-full text-center text-[11px] text-gray-400 hover:text-red-500 mt-3 py-1 flex items-center justify-center gap-1"
          >
            <Flag className="h-3 w-3" /> Report this provider
          </button>
        )}
      </div>
    </div>
  )
}
