'use client'

import { useEffect, useState } from 'react'
import { useAppStore, type Notification } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Calendar, MessageCircle, Star, Bell, Crown } from 'lucide-react'

const typeIcons: Record<string, typeof Bell> = {
  booking: Calendar,
  chat: MessageCircle,
  review: Star,
  system: Bell,
  pro: Crown,
}

const typeColors: Record<string, string> = {
  booking: 'bg-blue-100 text-blue-600',
  chat: 'bg-green-100 text-green-600',
  review: 'bg-amber-100 text-amber-600',
  system: 'bg-gray-100 text-gray-600',
  pro: 'bg-purple-100 text-purple-600',
}

export default function NotificationsScreen() {
  const { navigate, user, notifications, setNotifications } = useAppStore()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const loadNotifications = async () => {
      if (!user) return
      setLoading(true)
      try {
        const data = await apiFetch(`/notifications?userId=${user.id}`)
        setNotifications(data.notifications || [])
      } catch {
        // Use store data
      } finally {
        setLoading(false)
      }
    }
    loadNotifications()
  }, [user, setNotifications])

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate('profile')} className="text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">Notifications</h1>
      </div>

      <div className="divide-y divide-gray-100">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="p-4 flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">No notifications yet</p>
          </div>
        ) : (
          notifications.map((notif: Notification) => {
            const IconComp = typeIcons[notif.type] || Bell
            const colorClass = typeColors[notif.type] || 'bg-gray-100 text-gray-600'
            return (
              <div
                key={notif.id}
                className={`p-4 flex items-start gap-3 ${!notif.isRead ? 'bg-blue-50/50' : 'bg-white'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                  <IconComp className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{notif.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{notif.message}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{formatTime(notif.createdAt)}</p>
                </div>
                {!notif.isRead && (
                  <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-2" />
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
