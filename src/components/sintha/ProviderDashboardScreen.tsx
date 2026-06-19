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
import WhatsAppIcon from './WhatsAppIcon'
import {
  Bell, Calendar, CheckCircle, Clock, Star, Crown, User,
  ToggleLeft, ToggleRight, Briefcase, TrendingUp, PenLine, Shield,
  MapPin, MessageCircle, Bot, Zap, Eye, IndianRupee, Users,
  QrCode, Share2, Package, Tag, BarChart3, Copy
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
  const activeBookings = bookings.filter((b) => b.status === 'accepted' || b.status === 'in_progress')

  // Calculate estimated earnings (from completed bookings)
  const estimatedEarnings = completedBookings.length * (myProviderProfile?.hourlyRate || 0)

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

        {/* Active Bookings */}
        {activeBookings.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-5 w-5 text-blue-500" />
              <h3 className="font-bold text-gray-800">Active ({activeBookings.length})</h3>
            </div>
            <div className="space-y-2">
              {activeBookings.map((booking: Booking) => (
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
                      booking.status === 'in_progress' ? 'bg-green-100 text-green-700' :
                      'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {booking.status === 'in_progress' ? 'In Progress' : 'Accepted'}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        )}

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
                <p className="text-xs text-gray-300 mt-1">Bookings will appear when clients book your services</p>
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
          <div className="grid grid-cols-3 gap-2">
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

        {/* Earnings Summary */}
        <Card className="border-0 shadow-sm bg-gradient-to-r from-green-50 to-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <IndianRupee className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-gray-800 text-sm">Earnings Overview</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-2xl font-bold text-green-700">
                  ₹{myProviderProfile?.hourlyRate || 0}
                </p>
                <p className="text-[10px] text-gray-500">Per Hour Rate</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">
                  {completedBookings.length}
                </p>
                <p className="text-[10px] text-gray-500">Paid Bookings</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-green-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-green-500" />
                <span className="text-xs text-green-700 font-medium">Zero Commission - You keep 100%!</span>
              </div>
            </div>
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

      {/* ═══════════════════════════════════════════════════════════
          PRO BUSINESS TOOLS — Only visible to PRO subscribers
          1. Shareable Storefront Link
          2. QR Code Business Card
          3. Business Analytics
          4. Service Packages
          5. Promotional Offers
          ═══════════════════════════════════════════════════════════ */}
      {user?.isPro && user?.proExpiry && new Date(user.proExpiry) > new Date() && myProviderProfile && (
        <div className="px-4 pt-6 pb-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-bold text-gray-800">PRO Business Tools</h2>
          </div>

          {/* 1. SHAREABLE STOREFRONT LINK */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Share2 className="h-4 w-4 text-blue-600" />
                <h3 className="font-semibold text-gray-800 text-sm">Share Your Storefront</h3>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Share this link on WhatsApp, Facebook, or Instagram. Anyone who opens it can view your profile and book you directly.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    const url = `https://sinthadeploy.vercel.app/?book=${myProviderProfile.id}`
                    navigator.clipboard?.writeText(url)
                    toast({ title: 'Link Copied!', description: 'Paste it anywhere to share your profile' })
                  }}
                >
                  <Copy className="h-3 w-3 mr-1" /> Copy Link
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-[#25D366] hover:bg-[#1ebe5d] text-white"
                  onClick={() => {
                    const url = `https://sinthadeploy.vercel.app/?book=${myProviderProfile.id}`
                    const msg = encodeURIComponent(`Book my services on SINTHA! ${url}`)
                    window.open(`https://wa.me/?text=${msg}`, '_blank')
                  }}
                >
                  <WhatsAppIcon className="h-3 w-3 mr-1" /> Share on WhatsApp
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 2. QR CODE BUSINESS CARD */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <QrCode className="h-4 w-4 text-purple-600" />
                <h3 className="font-semibold text-gray-800 text-sm">QR Code Business Card</h3>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Print this QR code and put it on your shop, vehicle, or flyers. People scan it to book you instantly.
              </p>
              {showQR ? (
                <div className="text-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://sinthadeploy.vercel.app/?book=${myProviderProfile.id}`}
                    alt="QR Code"
                    className="mx-auto rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-2">Scan to book {user?.name}</p>
                  <a
                    href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=https://sinthadeploy.vercel.app/?book=${myProviderProfile.id}`}
                    download="sintha-qr.png"
                    className="inline-block mt-2 text-xs text-blue-600 hover:underline font-medium"
                  >
                    Download QR Code
                  </a>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="w-full" onClick={() => setShowQR(true)}>
                  <QrCode className="h-3 w-3 mr-1" /> Show QR Code
                </Button>
              )}
            </CardContent>
          </Card>

          {/* 3. BUSINESS ANALYTICS */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-green-600" />
                <h3 className="font-semibold text-gray-800 text-sm">Business Analytics</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <Calendar className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                  <p className="text-xl font-bold text-gray-800">{bookings.length}</p>
                  <p className="text-[10px] text-gray-500">Total Bookings</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <Star className="h-4 w-4 text-amber-500 mx-auto mb-1" />
                  <p className="text-xl font-bold text-gray-800">{myProviderProfile.rating?.toFixed(1) || '0.0'}</p>
                  <p className="text-[10px] text-gray-500">Avg Rating</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <IndianRupee className="h-4 w-4 text-green-600 mx-auto mb-1" />
                  <p className="text-xl font-bold text-gray-800">₹{(bookings.length * (myProviderProfile.hourlyRate || 0)).toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-gray-500">Est. Earnings</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <Users className="h-4 w-4 text-purple-600 mx-auto mb-1" />
                  <p className="text-xl font-bold text-gray-800">{myProviderProfile.totalReviews || 0}</p>
                  <p className="text-[10px] text-gray-500">Reviews</p>
                </div>
              </div>
              <div className="mt-3 bg-blue-50 rounded-lg p-2">
                <p className="text-[10px] text-blue-700 text-center">
                  💡 Respond to bookings within 5 minutes to get 3x more bookings!
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 4. SERVICE PACKAGES */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-orange-600" />
                  <h3 className="font-semibold text-gray-800 text-sm">Service Packages</h3>
                </div>
                <Button size="sm" variant="outline" onClick={() => setShowPackageForm(!showPackageForm)}>
                  {showPackageForm ? 'Cancel' : '+ Add'}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Create fixed-price packages. Clients prefer packages over hourly rates.
              </p>

              {/* Package Form */}
              {showPackageForm && (
                <div className="space-y-2 mb-3 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="text"
                    placeholder="Package name (e.g. Full Home Cleaning)"
                    value={newPackage.name}
                    onChange={(e) => setNewPackage({ ...newPackage, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                  />
                  <input
                    type="number"
                    placeholder="Price in ₹ (e.g. 999)"
                    value={newPackage.price}
                    onChange={(e) => setNewPackage({ ...newPackage, price: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Description (e.g. 3BHK deep clean, 2 hours)"
                    value={newPackage.description}
                    onChange={(e) => setNewPackage({ ...newPackage, description: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                  />
                  <Button
                    size="sm"
                    className="w-full sintha-gradient text-white"
                    onClick={async () => {
                      if (!newPackage.name || !newPackage.price) return
                      const pkgs = packages || []
                      const updated = [...pkgs, { ...newPackage, id: Date.now().toString() }]
                      setPackages(updated)
                      setNewPackage({ name: '', price: '', description: '' })
                      setShowPackageForm(false)
                      // Save to backend
                      try {
                        await apiFetch(`/providers/${myProviderProfile.id}`, {
                          method: 'PUT',
                          body: JSON.stringify({ packages: JSON.stringify(updated) }),
                        })
                        toast({ title: 'Package Added!', description: 'Clients can now book this package' })
                      } catch {
                        toast({ title: 'Saved locally', description: 'Will sync when online' })
                      }
                    }}
                  >
                    Save Package
                  </Button>
                </div>
              )}

              {/* Existing Packages */}
              {packages.length > 0 ? (
                <div className="space-y-2">
                  {packages.map((pkg) => (
                    <div key={pkg.id} className="flex items-center justify-between bg-orange-50 rounded-lg p-2">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{pkg.name}</p>
                        <p className="text-[10px] text-gray-500">{pkg.description}</p>
                      </div>
                      <span className="text-sm font-bold text-orange-600">₹{pkg.price}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-2">No packages yet. Create one to attract more clients!</p>
              )}
            </CardContent>
          </Card>

          {/* 5. PROMOTIONAL OFFERS */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-red-600" />
                  <h3 className="font-semibold text-gray-800 text-sm">Promotional Offers</h3>
                </div>
                <Button size="sm" variant="outline" onClick={() => setShowOfferForm(!showOfferForm)}>
                  {showOfferForm ? 'Cancel' : '+ Add'}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Create limited-time discounts to attract new clients.
              </p>

              {/* Offer Form */}
              {showOfferForm && (
                <div className="space-y-2 mb-3 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="text"
                    placeholder="Offer title (e.g. First-time 20% off)"
                    value={newOffer.title}
                    onChange={(e) => setNewOffer({ ...newOffer, title: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                  />
                  <input
                    type="number"
                    placeholder="Discount % (e.g. 20)"
                    value={newOffer.discount}
                    onChange={(e) => setNewOffer({ ...newOffer, discount: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Description (e.g. New customers only)"
                    value={newOffer.description}
                    onChange={(e) => setNewOffer({ ...newOffer, description: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                  />
                  <Button
                    size="sm"
                    className="w-full sintha-gradient text-white"
                    onClick={async () => {
                      if (!newOffer.title || !newOffer.discount) return
                      const existingOffers = offers || []
                      const expiry = new Date()
                      expiry.setDate(expiry.getDate() + parseInt(newOffer.validDays))
                      const updated = [...existingOffers, { ...newOffer, id: Date.now().toString(), expiry: expiry.toISOString() }]
                      setOffers(updated)
                      setNewOffer({ title: '', discount: '', description: '', validDays: '7' })
                      setShowOfferForm(false)
                      try {
                        await apiFetch(`/providers/${myProviderProfile.id}`, {
                          method: 'PUT',
                          body: JSON.stringify({ offers: JSON.stringify(updated) }),
                        })
                        toast({ title: 'Offer Created!', description: 'It will show on your profile' })
                      } catch {
                        toast({ title: 'Saved locally', description: 'Will sync when online' })
                      }
                    }}
                  >
                    Create Offer
                  </Button>
                </div>
              )}

              {/* Existing Offers */}
              {offers.length > 0 ? (
                <div className="space-y-2">
                  {offers.map((offer) => (
                    <div key={offer.id} className="flex items-center justify-between bg-red-50 rounded-lg p-2">
                      <div>
                        <p className="text-sm font-medium text-gray-800">🏷️ {offer.title}</p>
                        <p className="text-[10px] text-gray-500">{offer.description}</p>
                        <p className="text-[9px] text-gray-400">Expires: {new Date(offer.expiry).toLocaleDateString()}</p>
                      </div>
                      <span className="text-sm font-bold text-red-600">-{offer.discount}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-2">No offers yet. Create one to get more bookings!</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Non-PRO upsell banner */}
      {(!user?.isPro || !user?.proExpiry || new Date(user.proExpiry) <= new Date()) && (
        <div className="px-4 pt-4">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 text-center">
            <Crown className="h-8 w-8 text-amber-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-gray-800">Unlock Business Tools with PRO</p>
            <p className="text-xs text-gray-500 mb-3">QR Code, Shareable Link, Analytics, Packages, Offers</p>
            <Button size="sm" className="sintha-gradient text-white" onClick={() => navigate('sintha-pro')}>
              Upgrade to PRO — ₹1/month
            </Button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
