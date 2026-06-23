'use client'

import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import BottomNav from './BottomNav'
import { ArrowLeft, Sparkles, Send, Loader2 } from 'lucide-react'

interface ProviderMatch {
  providerId: string
  name: string
  photoUrl?: string
  category?: string
  rating: number
  hourlyRate?: number
  verified?: boolean
  pro?: boolean
}

interface AIChatMessage {
  id: string
  content: string
  isBot: boolean
  timestamp: Date
  poweredBy?: string
  providerMatches?: ProviderMatch[]
}

export default function AIAssistantScreen() {
  const { navigate } = useAppStore()
  const [chatMessages, setChatMessages] = useState<AIChatMessage[]>([
    {
      id: 'welcome',
      content: "Hi! I'm SINTHA AI, your smart assistant. I can help you find providers, guide you through booking, and answer any questions about SINTHA. What can I help you with today?",
      isBot: true,
      timestamp: new Date(),
      poweredBy: 'SINTHA AI',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const quickActions = [
    'Find me an electrician',
    'How do I book a service?',
    'What is SINTHA PRO?',
    'Best tutor near me',
  ]

  const sendMessage = async (text?: string) => {
    const msgText = text || input.trim()
    if (!msgText || loading) return

    const userMsg: AIChatMessage = {
      id: `user-${Date.now()}`,
      content: msgText,
      isBot: false,
      timestamp: new Date(),
    }
    setChatMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const conversationHistory = chatMessages
        .slice(-6)
        .map((msg) => ({
          role: msg.isBot ? 'assistant' : 'user',
          content: msg.content,
        }))

      const data = await apiFetch('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: msgText,
          conversationHistory,
        }),
      })

      const botMsg: AIChatMessage = {
        id: `bot-${Date.now()}`,
        content: data.response || "I'm sorry, I couldn't process that. Please try again.",
        isBot: true,
        timestamp: new Date(),
        poweredBy: data.poweredBy,
        providerMatches: data.providerMatches || [],
      }
      setChatMessages((prev) => [...prev, botMsg])
    } catch (err: unknown) {
      const botMsg: AIChatMessage = {
        id: `bot-${Date.now()}`,
        content: "I'm having trouble connecting right now. Please try again, or browse providers from the Home screen!",
        isBot: true,
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, botMsg])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-20">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 px-4 py-3 flex items-center gap-3 border-b border-[#E2E8F0]">
        <button onClick={() => navigate('home')} className="text-[#64748B]">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="w-8 h-8 rounded-full sintha-gradient flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-[#1E293B]">SINTHA AI</h1>
          <p className="text-[10px] text-[#10B981] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
            Online
          </p>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 sintha-scrollbar">
        {chatMessages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.isBot
                  ? 'bg-white text-[#1E293B] shadow-sm rounded-bl-md border border-[#E2E8F0]'
                  : 'sintha-gradient text-white rounded-br-md'
              }`}
            >
              <p className="text-sm whitespace-pre-line">{msg.content}</p>
              {/* Clickable provider recommendation cards — shown when the AI
                  mentions specific providers in its response. Each card links
                  to the provider's profile page. */}
              {msg.isBot && msg.providerMatches && msg.providerMatches.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {msg.providerMatches.map((pm, i) => (
                    <button
                      key={i}
                      onClick={() => navigate('provider-profile', { providerId: pm.providerId })}
                      className="w-full bg-blue-50 hover:bg-blue-100 rounded-lg p-2 flex items-center gap-2 text-left transition-colors border border-blue-100"
                    >
                      <img
                        src={pm.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(pm.name)}&background=2563eb&color=fff&size=40`}
                        alt={pm.name}
                        className="w-8 h-8 rounded-full shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-xs font-medium text-gray-800 truncate">{pm.name}</p>
                          {pm.verified && <span className="text-[9px] text-green-600">✓</span>}
                          {pm.pro && <span className="text-[8px] bg-amber-100 text-amber-700 px-1 rounded">PRO</span>}
                        </div>
                        <p className="text-[9px] text-gray-500">
                          {pm.category} · ⭐{pm.rating}
                          {pm.hourlyRate ? ` · ₹${pm.hourlyRate}/hr` : ''}
                        </p>
                      </div>
                      <span className="text-[9px] text-blue-600 font-medium shrink-0">View →</span>
                    </button>
                  ))}
                </div>
              )}
              <div className={`flex items-center gap-2 mt-1 ${msg.isBot ? 'text-[#94A3B8]' : 'text-white/60'}`}>
                <p className="text-[10px]">
                  {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
                {msg.isBot && msg.poweredBy && (
                  <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                    {msg.poweredBy}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white text-[#1E293B] shadow-sm rounded-2xl rounded-bl-md border border-[#E2E8F0] px-4 py-3 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-[#0F4C81]" />
              <span className="text-sm text-[#64748B]">SINTHA AI is thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {chatMessages.length <= 1 && !loading && (
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
          {quickActions.map((action) => (
            <Button
              key={action}
              variant="outline"
              size="sm"
              className="whitespace-nowrap text-xs rounded-full border-[#0F4C81] text-[#0F4C81] hover:bg-[#0F4C81] hover:text-white"
              onClick={() => sendMessage(action)}
            >
              <Sparkles className="h-3 w-3 mr-1" />
              {action}
            </Button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-[#E2E8F0] p-3 sticky bottom-16">
        <div className="flex items-center gap-2 max-w-lg mx-auto">
          <Input
            placeholder="Ask SINTHA AI anything..."
            className="flex-1 bg-[#F8FAFC] border-[#E2E8F0] rounded-full"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loading && sendMessage()}
            disabled={loading}
          />
          <Button
            size="icon"
            className="sintha-gradient text-white rounded-full h-9 w-9 shrink-0"
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
