'use client'

import { useEffect, useState } from 'react'
import { useAppStore, type Booking, type ProviderProfile } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import BottomNav from './BottomNav'
import PushNotificationPrompt from './PushNotificationPrompt'
import WhatsAppIcon from './WhatsAppIcon'
import {
  Bell, Calendar, CheckCircle, Clock, Star, Crown, User,
  ToggleLeft, ToggleRight, Briefcase, TrendingUp, PenLine, Shield,
  MapPin, MessageCircle, Bot, Zap, Eye, IndianRupee, Users,
  QrCode, Share2, Package, Tag, BarChart3, Copy,
  ShieldCheck, ChevronRight, Play, AlertCircle, Sparkles, Loader2
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function ProviderDashboardScreen() {
  const { navigate, user, bookings, setBookings, setMyProviderProfile, myProviderProfile, notifications } = useAppStore()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [showQR, setShowQR] = useState(false)
  const [packages, setPackages] = useState<any[]>([])
  const [offers, setOffers] = useState<any[]>([])
  const [showPackageForm, setShowPackageForm] = useState(false)
  const [showOfferForm, setShowOfferForm] = useState(false)
  const [newPackage, setNewPackage] = useState({ name: '', price: '', description: '' })
  const [newOffer, setNewOffer] = useState({ title: '', discount: '', description: '', validDays: '7' })
  const [availability, setAvailability] = useState('available')
  // AI Profile Optimizer — shows AI suggestions for improving the provider's profile.
  const [aiOptimizing, setAiOptimizing] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<{
    score: number
    strengths: string[]
    improvements: Array<{ area: string; suggestion: string; priority: string }>
    suggestedDescription?: string
    tips?: string[]
    poweredBy: string
  } | null>(null)
  // Earnings summary — fetched from /api/provider/earnings. Shows total ₹ earned
  // from completed bookings (where the provider set a price on completion).
  const [earnings, setEarnings] = useState<{
    totalEarnings: number
    totalBookings: number
    paidBookings: number
    thisMonthEarnings: number
    thisMonthBookings: number
    avgRating: number
    totalReviews: number
  } | null>(null)

  useEffect(() => {
    const loadData = async () => {
      if (!user) return
      setLoading(true)
      try {
        // Load provider profile
        const provData = await apiFetch(`/providers?userId=${user.id}`)
        const providers = provData.providers || []
        if (providers.length > 0) {
          setMyProviderProfile(providers[0])
          setAvailability(providers[0].availability || 'available')
          // Load existing packages and offers
          if (providers[0].packages) {
            try { setPackages(JSON.parse(providers[0].packages)) } catch {}
          }
          if (providers[0].offers) {
            try { setOffers(JSON.parse(providers[0].offers)) } catch {}
          }
        }

        // Load bookings
        const bookingData = await apiFetch(`/bookings?providerId=${user.id}`)
        setBookings(bookingData.bookings || [])

        // Load earnings summary (total ₹ earned, this month, etc.)
        try {
          const earningsData = await apiFetch(`/provider/earnings?providerId=${user.id}`)
          setEarnings(earningsData)
        } catch {
          // Earnings endpoint might fail if migration hasn't run — silent
        }
      } catch {
        // Use existing data
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [user, setBookings, setMyProviderProfile])

  const pendingBookings = bookings.filter((b) => b.status === 'pending')
  const unreadNotifs = notifications.filter((n) => !n.isRead).length
  const completedBookings = bookings.filter((b) => b.status === 'completed')
  // Bookings the provider has accepted but not yet started — they need to tap "Start Service".
  const acceptedToStart = bookings.filter((b) => b.status === 'accepted')
  // Bookings the provider has started but not yet completed — they need to tap "Mark Complete" to get rated.
  const inProgressToComplete = bookings.filter((b) => b.status === 'in_progress')
  // Total count of bookings waiting on the provider's next action — drives the top alert banner.
  const actionNeededCount = acceptedToStart.length + inProgressToComplete.length

  // Calculate estimated earnings (from completed bookings)
  const estimatedEarnings = completedBookings.length * (myProviderProfile?.hourlyRate || 0)

  // AI Profile Optimizer — calls /api/ai/optimize-profile which uses SINHA AI
  // to analyze the provider's profile and suggest improvements for more bookings.
  const optimizeProfile = async () => {
    if (!user || aiOptimizing) return
    setAiOptimizing(true)
    setAiSuggestions(null)
    try {
      const data = await apiFetch('/ai/optimize-profile', {
        method: 'POST',
        body: JSON.stringify({ providerId: user.id }),
      })
      setAiSuggestions(data)
    } catch {
      // Silent — the UI shows a fallback message
    } finally {
      setAiOptimizing(false)
    }
  }

  const toggleAvailability = async () => {
    const states = ['available', 'busy', 'offline']
    const currentIdx = states.indexOf(availability)
    const nextIdx = (currentIdx + 1) % states.length
    const newAvailability = states[nextIdx]
    setAvailability(newAvailability)

    // Update on backend
    if (myProviderProfile) {
      try {
        await apiFetch(`/providers/${myProviderProfile.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ availability: newAvailability }),
        })
      } catch {
        // Silent fail
      }
    }
  }

  const handleBookingAction = async (bookingId: string, action: 'accepted' | 'rejected') => {
    try {
      await apiFetch(`/bookings/${bookingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: action }),
      })
      setBookings(bookings.map((b) => b.id === bookingId ? { ...b, status: action } : b))
    } catch {
      // Handle error silently
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Top Bar */}
      <div className="bg-white sticky top-0 z-40 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <h1 className="text-xl font-extrabold sintha-gradient-text">SINTHA</h1>
        <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px]">Provider</Badge>
        <div className="flex-1" />
        <button
          onClick={() => navigate('notifications')}
          className="relative p-2 text-gray-500 hover:text-gray-700"
          aria-label={`Notifications${(pendingBookings.length + unreadNotifs) > 0 ? ` (${pendingBookings.length + unreadNotifs} unread)` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {(pendingBookings.length > 0 || unreadNotifs > 0) && (
            <span className="absolute top-0 right-0 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">
              {(pendingBookings.length + unreadNotifs) > 9 ? '9+' : (pendingBookings.length + unreadNotifs)}
            </span>
          )}
        </button>
        <button onClick={() => navigate('profile')}>
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=10b981&color=fff`} />
            <AvatarFallback>{user?.name?.[0] || 'U'}</AvatarFallback>
          </Avatar>
        </button>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Welcome Card */}
        <div className="sintha-gradient rounded-2xl p-5 text-white relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
          <div className="absolute right-12 -bottom-6 w-20 h-20 bg-white/5 rounded-full" />
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Welcome, {user?.name?.split(' ')[0]}!</h2>
                <p className="text-sm opacity-80 mt-1">Manage your services and bookings</p>
              </div>
              {myProviderProfile && (
                <Badge className={`border-0 text-xs ${
                  availability === 'available' ? 'bg-green-500/30 text-green-100' :
                  availability === 'busy' ? 'bg-amber-500/30 text-amber-100' :
                  'bg-gray-500/30 text-gray-200'
                }`}>
                  {availability}
                </Badge>
              )}
            </div>
            <div className="mt-3 flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <IndianRupee className="h-4 w-4" />
                <span className="text-xs font-medium">100% earnings</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="h-4 w-4" />
                <span className="text-xs font-medium">Zero commission</span>
              </div>
            </div>
          </div>
        </div>

        {/* Verification nudge — shows if the provider is PRO but not yet verified,
            OR if they're not verified at all (regardless of PRO status). Encourages
            them to complete identity verification to earn the green ✓ badge. */}
        {user && !user.isVerified && (
          <div
            className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:bg-green-100 transition-colors"
            onClick={() => navigate('verification')}
          >
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-green-800">
                {user.isPro ? 'Complete your verification' : 'Get the Verified badge'}
              </p>
              <p className="text-xs text-green-600 truncate">
                {user.isPro
                  ? 'You\'re PRO! Now verify your identity to earn the ✓ badge and get more bookings.'
                  : 'Verify your identity with Aadhaar + passport photo. Takes 2 minutes.'}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-green-600 shrink-0" />
          </div>
        )}

        {/* Push notification opt-in prompt (web only — hidden in APK WebView).
            Providers especially benefit from push: new booking requests,
            client messages, and booking status changes all arrive as pushes. */}
        <PushNotificationPrompt />

        {/* ACTION-NEEDED ALERT BANNER — the most important UX addition.
            After a provider accepts a booking, they often forget to come back and Start / Mark Complete.
            Without “Mark Complete”, the client can't rate them — and ratings drive future bookings.
            This banner is placed high on the dashboard and links straight to the booking detail
            where the sticky action bar now lives. */}
        {actionNeededCount > 0 && (
          <button
            onClick={() => {
              // Jump to the most actionable booking (in-progress first, otherwise accepted).
              const target = inProgressToComplete[0] || acceptedToStart[0]
              if (target) navigate('booking-detail', { bookingId: target.id })
            }}
            className="w-full text-left bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-4 shadow-sm active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0 text-white">
                <p className="text-sm font-bold">
                  {actionNeededCount} booking{actionNeededCount > 1 ? 's' : ''} need{actionNeededCount === 1 ? 's' : ''} your action
                </p>
                <p className="text-xs opacity-90 mt-0.5">
                  {inProgressToComplete.length > 0 && (
                    <>{inProgressToComplete.length} to mark complete · </>
                  )}
                  {acceptedToStart.length > 0 && (
                    <>{acceptedToStart.length} to start</>
                  )}
                  {' — tap to continue & get rated ⭐'}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-white shrink-0" />
            </div>
          </button>
        )}

        {/* Availability Toggle */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-800 text-sm">Your Availability</p>
                <p className="text-xs text-gray-500">Clients can only book when you're available</p>
              </div>
              <button onClick={toggleAvailability} className="flex items-center gap-2">
                {availability === 'available' ? (
                  <ToggleRight className="h-8 w-8 text-green-500" />
                ) : (
                  <ToggleLeft className="h-8 w-8 text-gray-400" />
                )}
                <Badge
                  variant={availability === 'available' ? 'default' : 'secondary'}
                  className={`border-0 ${
                    availability === 'available' ? 'bg-green-100 text-green-700' :
                    availability === 'busy' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-600'
                  }`}
                >
                  {availability}
                </Badge>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <Calendar className="h-6 w-6 text-blue-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-800">{bookings.length}</p>
              <p className="text-xs text-gray-500">Total Bookings</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-800">{completedBookings.length}</p>
              <p className="text-xs text-gray-500">Completed</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <Clock className="h-6 w-6 text-amber-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-800">{pendingBookings.length}</p>
              <p className="text-xs text-gray-500">Pending</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <Star className="h-6 w-6 text-amber-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-800">{myProviderProfile?.rating || '0'}</p>
              <p className="text-xs text-gray-500">Rating</p>
            </CardContent>
          </Card>
        </div>

        {/* No profile warning */}
        {!myProviderProfile && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-amber-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">Complete your profile</p>
                <p className="text-xs text-amber-600 mt-0.5">Fill in your provider details to start receiving bookings</p>
              </div>
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-white text-xs"
                onClick={() => navigate('provider-onboarding')}
              >
                Setup
              </Button>
            </div>
          </div>
        )}

        {/* Pending Bookings - Action Required */}
        {pendingBookings.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-5 w-5 text-amber-500" />
              <h3 className="font-bold text-gray-800">Action Required ({pendingBookings.length})</h3>
            </div>
            <div className="space-y-2">
              {pendingBookings.map((booking: Booking) => (
                <div key={booking.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={booking.client?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(booking.client?.name || 'C')}&background=2563eb&color=fff`} />
                      <AvatarFallback>{booking.client?.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{booking.service}</p>
                      <p className="text-xs text-gray-500">{booking.client?.name} &bull; {booking.date ? new Date(booking.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs"
                      onClick={() => handleBookingAction(booking.id, 'accepted')}
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" /> Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => handleBookingAction(booking.id, 'rejected')}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* READY-TO-COMPLETE BOOKINGS — highest priority for ratings.
            These are bookings the provider has started but not finished. Marking them complete
            is what unlocks the rating flow, so we surface them as their own section above the
            general “Active” list, with a clear “Mark Complete” CTA. */}
        {inProgressToComplete.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Star className="h-5 w-5 text-amber-500" />
              <h3 className="font-bold text-gray-800">Ready to Complete ({inProgressToComplete.length})</h3>
              <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-semibold">Get Rated</span>
            </div>
            <div className="space-y-2">
              {inProgressToComplete.map((booking: Booking) => (
                <button
                  key={booking.id}
                  onClick={() => navigate('booking-detail', { bookingId: booking.id })}
                  className="w-full bg-white rounded-xl p-4 shadow-sm flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={booking.client?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(booking.client?.name || 'C')}&background=10b981&color=fff`} />
                    <AvatarFallback>{booking.client?.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{booking.service}</p>
                    <p className="text-xs text-gray-500">{booking.client?.name}</p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-green-100 text-green-700 px-2.5 py-1.5 rounded-lg text-[10px] font-bold shrink-0">
                    <CheckCircle className="h-3 w-3" />
                    Mark Complete
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ACCEPTED — NOT YET STARTED — provider needs to tap “Start Service” when they begin work */}
        {acceptedToStart.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Play className="h-5 w-5 text-blue-500" />
              <h3 className="font-bold text-gray-800">Start When Ready ({acceptedToStart.length})</h3>
            </div>
            <div className="space-y-2">
              {acceptedToStart.map((booking: Booking) => (
                <button
                  key={booking.id}
                  onClick={() => navigate('booking-detail', { bookingId: booking.id })}
                  className="w-full bg-white rounded-xl p-4 shadow-sm flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={booking.client?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(booking.client?.name || 'C')}&background=3b82f6&color=fff`} />
                    <AvatarFallback>{booking.client?.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{booking.service}</p>
                    <p className="text-xs text-gray-500">{booking.client?.name}</p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-blue-100 text-blue-700 px-2.5 py-1.5 rounded-lg text-[10px] font-bold shrink-0">
                    <Play className="h-3 w-3" />
                    Start Service
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active Bookings section removed — replaced by the more actionable
            "Ready to Complete" and "Start When Ready" sections above, which
            show the same bookings but with explicit next-action CTAs. */}

        {/* All Recent Bookings */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800">Recent Bookings</h3>
            {bookings.length > 3 && (
              <button
                onClick={() => navigate('my-bookings')}
                className="text-xs text-blue-600 font-medium"
              >
                View All
              </button>
            )}
          </div>
          {bookings.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 text-center">
                <Calendar className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No bookings yet</p>
                <p className="text-xs text-gray-300 mt-1 mb-3">
                  Bookings will appear when clients book your services
                </p>
                <button
                  onClick={() => navigate('open-jobs')}
                  className="text-blue-600 text-xs font-medium"
                >
                  Browse open jobs →
                </button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {bookings.slice(0, 5).map((booking: Booking) => (
                <button
                  key={booking.id}
                  onClick={() => navigate('booking-detail', { bookingId: booking.id })}
                  className="w-full bg-white rounded-xl p-3 shadow-sm flex items-center gap-3 text-left"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={booking.client?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(booking.client?.name || 'C')}&background=10b981&color=fff`} />
                    <AvatarFallback>{booking.client?.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{booking.service}</p>
                    <p className="text-xs text-gray-500">{booking.client?.name}</p>
                  </div>
                  <Badge
                    className={`text-[9px] border-0 ${
                      booking.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      booking.status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                      booking.status === 'in_progress' ? 'bg-green-100 text-green-700' :
                      booking.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                      'bg-red-100 text-red-700'
                    }`}
                  >
                    {booking.status}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="font-bold text-gray-800 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => navigate('open-jobs')}
              className="bg-white rounded-xl p-3 text-center shadow-sm relative"
            >
              <Briefcase className="h-5 w-5 text-blue-600 mx-auto mb-1" />
              <span className="text-[9px] text-gray-600">Open Jobs</span>
            </button>
            <button
              onClick={() => navigate('provider-onboarding')}
              className="bg-white rounded-xl p-3 text-center shadow-sm"
            >
              <PenLine className="h-5 w-5 text-blue-600 mx-auto mb-1" />
              <span className="text-[9px] text-gray-600">Edit Profile</span>
            </button>
            <button
              onClick={() => navigate('sintha-pro')}
              className="bg-white rounded-xl p-3 text-center shadow-sm"
            >
              <Crown className="h-5 w-5 text-amber-500 mx-auto mb-1" />
              <span className="text-[9px] text-gray-600">Go PRO</span>
            </button>
            <button
              onClick={() => navigate('ai-assistant')}
              className="bg-white rounded-xl p-3 text-center shadow-sm"
            >
              <Bot className="h-5 w-5 text-purple-600 mx-auto mb-1" />
              <span className="text-[9px] text-gray-600">AI Help</span>
            </button>
          </div>
        </div>

        {/* AI Profile Optimizer — uses SINHA AI to analyze the provider's profile
            and suggest improvements for getting more bookings. */}
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4 mt-3">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <h3 className="font-semibold text-gray-800 text-sm">AI Profile Optimizer</h3>
            <span className="text-[9px] bg-purple-600 text-white px-1.5 py-0.5 rounded-full">SINHA AI</span>
          </div>
          <p className="text-xs text-gray-600 mb-3">
            Get AI-powered suggestions to improve your profile and attract more bookings.
          </p>
          <button
            onClick={optimizeProfile}
            disabled={aiOptimizing}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {aiOptimizing ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing your profile...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Optimize My Profile</>
            )}
          </button>

          {/* AI suggestions result */}
          {aiSuggestions && (
            <div className="mt-3 space-y-3">
              {/* Score */}
              <div className="bg-white rounded-lg p-3 flex items-center gap-3">
                <div className="relative w-14 h-14 shrink-0">
                  <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="24" fill="none" stroke="#e5e7eb" strokeWidth="4" />
                    <circle
                      cx="28" cy="28" r="24" fill="none" stroke={aiSuggestions.score >= 70 ? '#10b981' : aiSuggestions.score >= 50 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="4" strokeLinecap="round"
                      strokeDasharray={`${(aiSuggestions.score / 100) * 150.8} 150.8`}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-800">
                    {aiSuggestions.score}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Profile Score</p>
                  <p className="text-[10px] text-gray-500">
                    {aiSuggestions.score >= 70 ? 'Great profile!' : aiSuggestions.score >= 50 ? 'Good, but can improve' : 'Needs work'}
                  </p>
                </div>
              </div>

              {/* Strengths */}
              {aiSuggestions.strengths && aiSuggestions.strengths.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-green-700 mb-1">✓ Strengths</p>
                  <ul className="space-y-0.5">
                    {aiSuggestions.strengths.map((s, i) => (
                      <li key={i} className="text-[11px] text-gray-600 pl-3">{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Improvements */}
              {aiSuggestions.improvements && aiSuggestions.improvements.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-amber-700 mb-1">💡 Improvements</p>
                  <div className="space-y-2">
                    {aiSuggestions.improvements.map((imp, i) => (
                      <div key={i} className="bg-white rounded-lg p-2 border border-amber-100">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                            imp.priority === 'high' ? 'bg-red-100 text-red-600' :
                            imp.priority === 'medium' ? 'bg-amber-100 text-amber-600' :
                            'bg-gray-100 text-gray-500'
                          }`}>{imp.priority}</span>
                          <span className="text-xs font-medium text-gray-700">{imp.area}</span>
                        </div>
                        <p className="text-[11px] text-gray-600">{imp.suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested description */}
              {aiSuggestions.suggestedDescription && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                  <p className="text-[10px] font-semibold text-blue-700 mb-1">✨ Suggested Description</p>
                  <p className="text-[11px] text-blue-800">{aiSuggestions.suggestedDescription}</p>
                </div>
              )}

              {/* Tips */}
              {aiSuggestions.tips && aiSuggestions.tips.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-purple-700 mb-1">📋 Tips</p>
                  <ul className="space-y-0.5">
                    {aiSuggestions.tips.map((tip, i) => (
                      <li key={i} className="text-[11px] text-gray-600 pl-3">{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-[9px] text-gray-400 text-center">Powered by {aiSuggestions.poweredBy}</p>
            </div>
          )}
        </div>

        {/* Earnings Summary — shows real ₹ totals from completed bookings with prices */}
        <Card className="border-0 shadow-sm bg-gradient-to-r from-green-50 to-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <IndianRupee className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-gray-800 text-sm">Earnings Overview</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-2xl font-bold text-green-700">
                  ₹{earnings?.totalEarnings?.toLocaleString('en-IN') || 0}
                </p>
                <p className="text-[10px] text-gray-500">Total Earned</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">
                  ₹{earnings?.thisMonthEarnings?.toLocaleString('en-IN') || 0}
                </p>
                <p className="text-[10px] text-gray-500">This Month</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-green-100 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-sm font-bold text-gray-800">{earnings?.totalBookings || completedBookings.length}</p>
                <p className="text-[9px] text-gray-500">Completed</p>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">{earnings?.paidBookings || 0}</p>
                <p className="text-[9px] text-gray-500">With ₹ Amount</p>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">{earnings?.avgRating?.toFixed(1) || myProviderProfile?.rating || '0'}</p>
                <p className="text-[9px] text-gray-500">Avg Rating</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-green-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-green-500" />
                <span className="text-xs text-green-700 font-medium">Zero Commission - You keep 100%!</span>
              </div>
            </div>
            {earnings && earnings.totalBookings > 0 && earnings.paidBookings === 0 && (
              <p className="text-[10px] text-amber-600 mt-2">
                💡 Tip: When marking a booking complete, enter the final amount to track your earnings here.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Profile Completeness */}
        {myProviderProfile && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-800">Profile Strength</p>
                <span className="text-xs text-blue-600 font-medium">
                  {[
                    myProviderProfile.categoryId,
                    myProviderProfile.experience,
                    myProviderProfile.skills,
                    myProviderProfile.description,
                    myProviderProfile.hourlyRate,
                    user?.phone,
                    user?.location,
                    user?.isVerified,
                  ].filter(Boolean).length}/8
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full sintha-gradient rounded-full transition-all"
                  style={{
                    width: `${([
                      myProviderProfile.categoryId,
                      myProviderProfile.experience,
                      myProviderProfile.skills,
                      myProviderProfile.description,
                      myProviderProfile.hourlyRate,
                      user?.phone,
                      user?.location,
                      user?.isVerified,
                    ].filter(Boolean).length / 8) * 100}%`
                  }}
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Complete your profile to get more bookings</p>
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
