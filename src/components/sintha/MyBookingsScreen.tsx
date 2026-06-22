'use client'

import { useEffect, useState } from 'react'
import { useAppStore, type Booking } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import BottomNav from './BottomNav'
import { ArrowLeft, Calendar, Clock } from 'lucide-react'

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  accepted: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
  disputed: 'bg-purple-100 text-purple-700',
}

export default function MyBookingsScreen() {
  const { navigate, goBack, user, bookings, setBookings } = useAppStore()
  const [loading, setLoading] = useState(false)
  // Always default to 'all' so users see their bookings immediately (fixes "No bookings found")
  const [activeTab, setActiveTab] = useState('all')

  const tabs = ['all', 'pending', 'accepted', 'in_progress', 'completed', 'cancelled']

  useEffect(() => {
    const loadBookings = async () => {
      if (!user) return
      setLoading(true)
      try {
        const data = await apiFetch(`/bookings?${user.role === 'provider' ? 'providerId' : 'clientId'}=${user.id}`)
        setBookings(data.bookings || [])
      } catch (err) {
        console.error('Failed to load bookings:', err)
      } finally {
        setLoading(false)
      }
    }
    loadBookings()
  }, [user, setBookings])

  const filtered = activeTab === 'all'
    ? bookings
    : bookings.filter((b) => b.status === activeTab)

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button
          onClick={() => {
            // Role-aware back button: providers land on their dashboard, clients on home.
            // The valid back-targets list is ROLE-SPECIFIC so a provider never gets
            // sent back to the client 'home' screen (and vice versa). This was the
            // bug in the previous version: 'home' was in the shared valid list, so
            // providers whose previous view was 'home' (e.g. they navigated Home →
            // some screen → My Bookings) would land on the client home on back.
            const { previousViews } = useAppStore.getState()
            const lastView = previousViews[previousViews.length - 1]
            const isProvider = user?.role === 'provider'
            const providerBackTargets = ['provider-dashboard', 'chat-list', 'chat-room', 'notifications', 'profile', 'my-bookings', 'booking-detail']
            const clientBackTargets = ['home', 'chat-list', 'chat-room', 'notifications', 'profile', 'my-bookings', 'booking-detail']
            const validBackTargets = isProvider ? providerBackTargets : clientBackTargets
            if (lastView && validBackTargets.includes(lastView)) {
              goBack()
            } else {
              navigate(isProvider ? 'provider-dashboard' : 'home')
            }
          }}
          className="text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">My Bookings</h1>
      </div>

      {/* Tab Filters */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto bg-white border-b border-gray-100">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === tab
                ? 'sintha-gradient text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {tab === 'all' ? 'All' : tab.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Booking List */}
      <div className="px-4 py-4 space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">No bookings found</p>
          </div>
        ) : (
          filtered.map((booking: Booking) => (
            <button
              key={booking.id}
              onClick={() => navigate('booking-detail', { bookingId: booking.id })}
              className="w-full bg-white rounded-xl p-4 shadow-sm text-left sintha-card-hover"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-800">{booking.service}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {user?.role === 'provider' ? booking.client?.name : booking.provider?.name}
                  </p>
                </div>
                <Badge className={`${statusColors[booking.status] || 'bg-gray-100 text-gray-600'} text-[10px] border-0`}>
                  {booking.status.replace('_', ' ')}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(booking.date).toLocaleDateString()}
                </span>
                {booking.time && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {booking.time}
                  </span>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  )
}
