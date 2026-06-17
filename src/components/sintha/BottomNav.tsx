'use client'

import { useAppStore } from '@/lib/store'
import { Home, Calendar, MessageCircle, Sparkles, User, Briefcase, LayoutDashboard } from 'lucide-react'

export default function BottomNav() {
  const { navigate, user, notifications, conversations, currentView } = useAppStore()

  const unreadNotifs = notifications.filter((n) => !n.isRead).length
  const unreadMsgs = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)
  const badge = unreadNotifs + unreadMsgs

  const isProvider = user?.role === 'provider'

  // Different nav items based on role
  const clientItems = [
    { icon: Home, label: 'Home', view: 'home' as const },
    { icon: Calendar, label: 'Bookings', view: 'my-bookings' as const },
    { icon: MessageCircle, label: 'Chat', view: 'chat-list' as const },
    { icon: Sparkles, label: 'AI', view: 'ai-assistant' as const },
    { icon: User, label: 'Profile', view: 'profile' as const },
  ]

  const providerItems = [
    { icon: LayoutDashboard, label: 'Dashboard', view: 'provider-dashboard' as const },
    { icon: Calendar, label: 'Bookings', view: 'my-bookings' as const },
    { icon: MessageCircle, label: 'Chat', view: 'chat-list' as const },
    { icon: Sparkles, label: 'AI', view: 'ai-assistant' as const },
    { icon: User, label: 'Profile', view: 'profile' as const },
  ]

  const items = isProvider ? providerItems : clientItems

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 safe-area-bottom">
      <div className="max-w-lg mx-auto flex items-center justify-around py-2">
        {items.map((item) => {
          const isActive = currentView === item.view
          return (
            <button
              key={item.view}
              onClick={() => navigate(item.view)}
              className={`flex flex-col items-center py-1 px-3 rounded-lg transition-colors relative ${
                isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <item.icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : ''}`} />
              <span className={`text-[10px] mt-1 font-medium ${isActive ? 'text-blue-600' : ''}`}>{item.label}</span>
              {item.view === 'chat-list' && badge > 0 && (
                <span className="absolute -top-1 right-0 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
