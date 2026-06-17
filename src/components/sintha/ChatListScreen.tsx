'use client'

import { useEffect, useState } from 'react'
import { useAppStore, type Conversation } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import BottomNav from './BottomNav'
import { ArrowLeft, MessageCircle } from 'lucide-react'

export default function ChatListScreen() {
  const { navigate, user, conversations, setConversations } = useAppStore()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const loadConversations = async () => {
      if (!user) return
      setLoading(true)
      try {
        const data = await apiFetch(`/chat/conversations?userId=${user.id}`)
        setConversations(data.conversations || [])
      } catch (err) {
        console.error('Failed to load conversations:', err)
      } finally {
        setLoading(false)
      }
    }
    loadConversations()
  }, [user, setConversations])

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'now'
    if (diffMins < 60) return `${diffMins}m`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h`
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate('home')} className="text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">Messages</h1>
      </div>

      <div className="px-4 py-4 space-y-1">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))
        ) : conversations.length === 0 ? (
          <div className="text-center py-16">
            <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">No conversations yet</p>
            <p className="text-xs text-gray-300 mt-1">Start chatting by booking a service</p>
          </div>
        ) : (
          conversations.map((conv: Conversation) => (
            <button
              key={conv.id}
              onClick={() => navigate('chat-room', {
                conversationId: conv.id,
                providerName: conv.otherUser?.name || 'User',
                providerId: conv.otherUser?.id || '',
              })}
              className="w-full flex items-center gap-3 py-3 px-1 hover:bg-gray-50 rounded-lg transition-colors text-left"
            >
              <Avatar className="h-12 w-12 shrink-0">
                <AvatarImage src={conv.otherUser?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.otherUser?.name || 'U')}&background=2563eb&color=fff`} />
                <AvatarFallback>{conv.otherUser?.name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-800 text-sm truncate">{conv.otherUser?.name}</p>
                  <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                    {conv.lastMessageAt ? formatTime(conv.lastMessageAt) : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 truncate">{conv.lastMessage || 'No messages yet'}</p>
                  {(conv.unreadCount || 0) > 0 && (
                    <span className="bg-blue-600 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center shrink-0 ml-2 font-bold">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  )
}
