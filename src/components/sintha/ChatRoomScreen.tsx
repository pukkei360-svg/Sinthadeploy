'use client'

import { useEffect, useState, useRef } from 'react'
import { useAppStore, type ChatMessage } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeft, Send, Image as ImageIcon, Mic, MapPin, Lock } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function ChatRoomScreen() {
  const { navigate, viewParams, user, messages, setMessages, addMessage, conversations } = useAppStore()
  const { toast } = useToast()
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [bookingVerified, setBookingVerified] = useState<boolean | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const providerId = viewParams?.providerId
  const providerName = viewParams?.providerName || 'Chat'
  const existingConvId = viewParams?.conversationId

  useEffect(() => {
    const initChat = async () => {
      if (!user) return
      setLoading(true)

      // SECURITY CHECK: Verify booking exists before opening chat
      if (providerId && providerId !== user.id) {
        try {
          const bookingData = await apiFetch(`/bookings?clientId=${user.id}&providerId=${providerId}`)
          const bookings = bookingData.bookings || []
          const activeBooking = bookings.find((b: { status: string }) => b.status !== 'cancelled')
          if (!activeBooking) {
            setBookingVerified(false)
            setLoading(false)
            return
          }
          setBookingVerified(true)
        } catch {
          // If we can't verify, allow only if there's an existing conversation (e.g. from chat-list)
          if (!existingConvId) {
            setBookingVerified(false)
            setLoading(false)
            return
          }
          setBookingVerified(true)
        }
      } else {
        setBookingVerified(true)
      }

      if (existingConvId) {
        setConversationId(existingConvId)
        try {
          const data = await apiFetch(`/chat/conversations/${existingConvId}/messages`)
          setMessages(data.messages || [])
        } catch {
          setMessages([])
        }
      } else if (providerId && providerId !== user.id) {
        try {
          const convData = await apiFetch('/chat/conversations', {
            method: 'POST',
            body: JSON.stringify({
              participantA: user.id,
              participantB: providerId,
            }),
          })
          const convId = convData.conversation?.id || convData.conversation?.id
          setConversationId(convId)
          if (convId) {
            const msgData = await apiFetch(`/chat/conversations/${convId}/messages`)
            setMessages(msgData.messages || [])
          }
        } catch {
          setMessages([])
        }
      }
      setLoading(false)
    }
    initChat()
  }, [user, providerId, existingConvId, setMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!newMsg.trim() || !conversationId || !user) return
    setSending(true)
    try {
      const data = await apiFetch(`/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          senderId: user.id,
          content: newMsg.trim(),
          type: 'text',
        }),
      })
      addMessage(data.message)
      setNewMsg('')
    } catch (err: unknown) {
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  }

  if (bookingVerified === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-sm">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">Chat Locked</h2>
          <p className="text-sm text-gray-500 mb-5">
            You need to book this provider first to start chatting with them.
          </p>
          <Button
            className="w-full sintha-gradient text-white py-3 font-semibold"
            onClick={() => navigate('home')}
          >
            Browse Providers
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate('chat-list')} className="text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Avatar className="h-8 w-8">
          <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(providerName)}&background=2563eb&color=fff`} />
          <AvatarFallback>{providerName[0]}</AvatarFallback>
        </Avatar>
        <h1 className="text-sm font-bold text-gray-800">{providerName}</h1>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 sintha-scrollbar">
        {loading ? (
          <div className="text-center py-8 text-gray-400 text-sm">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            No messages yet. Say hello!
          </div>
        ) : (
          messages.map((msg: ChatMessage) => {
            const isSent = msg.senderId === user?.id
            return (
              <div
                key={msg.id}
                className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                    isSent
                      ? 'sintha-gradient text-white rounded-br-md'
                      : 'bg-white text-gray-800 shadow-sm rounded-bl-md'
                  }`}
                >
                  {msg.type === 'text' && (
                    <p className="text-sm">{msg.content}</p>
                  )}
                  {msg.type === 'image' && (
                    <div className="bg-black/10 rounded-lg p-4 flex items-center gap-2">
                      <ImageIcon className="h-5 w-5" />
                      <span className="text-sm">Photo</span>
                    </div>
                  )}
                  {msg.type === 'voice' && (
                    <div className="bg-black/10 rounded-lg p-3 flex items-center gap-2">
                      <Mic className="h-5 w-5" />
                      <span className="text-sm">Voice message</span>
                    </div>
                  )}
                  {msg.type === 'location' && (
                    <div className="bg-black/10 rounded-lg p-3 flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      <span className="text-sm">Location shared</span>
                    </div>
                  )}
                  <p className={`text-[10px] mt-1 ${isSent ? 'text-white/60' : 'text-gray-400'}`}>
                    {formatTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="bg-white border-t border-gray-100 p-3 sticky bottom-0">
        <div className="flex items-center gap-2 max-w-lg mx-auto">
          <div className="flex gap-1">
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <ImageIcon className="h-5 w-5" />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <Mic className="h-5 w-5" />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <MapPin className="h-5 w-5" />
            </button>
          </div>
          <Input
            placeholder="Type a message..."
            className="flex-1 bg-gray-50 border-0 rounded-full"
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          />
          <Button
            size="icon"
            className="sintha-gradient text-white rounded-full h-9 w-9 shrink-0"
            onClick={sendMessage}
            disabled={!newMsg.trim() || sending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
