'use client'

import { useEffect, useState } from 'react'
import { useAppStore, type Booking } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Calendar } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  accepted: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
}

export default function AdminBookingsScreen() {
  const { navigate } = useAppStore()
  const { toast } = useToast()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadBookings = async () => {
      try {
        const data = await apiFetch('/admin/bookings')
        setBookings(data.bookings || [])
      } catch {
        toast({ title: 'Error', description: 'Failed to load bookings', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }
    loadBookings()
  }, [toast])

  const filters = ['all', 'pending', 'accepted', 'in_progress', 'completed', 'cancelled']
  const filtered = filter === 'all' ? bookings : bookings.filter((b) => b.status === filter)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white sticky top-0 z-40 px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate('admin-dashboard')} className="text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-gray-800">Bookings</h1>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                filter === f ? 'sintha-gradient text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {f === 'all' ? 'All' : f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="p-4 flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Calendar className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            No bookings found
          </div>
        ) : (
          filtered.map((booking: Booking) => (
            <button
              key={booking.id}
              onClick={() => navigate('booking-detail', { bookingId: booking.id })}
              className="w-full p-4 bg-white flex items-center gap-3 text-left hover:bg-gray-50"
            >
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{booking.service}</p>
                <p className="text-xs text-gray-500">
                  {booking.client?.name} → {booking.provider?.name}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {new Date(booking.date).toLocaleDateString()}
                </p>
              </div>
              <Badge className={`${statusColors[booking.status] || ''} text-[9px] border-0 shrink-0`}>
                {booking.status.replace('_', ' ')}
              </Badge>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
