'use client'

import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import BottomNav from './BottomNav'
import { ArrowLeft, Sparkles, Send, Loader2, CheckCircle, Crown, Star, ChevronRight } from 'lucide-react'

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
              {/* AI response text — render with basic markdown formatting */}
              {msg.isBot ? (
                <div className="text-sm leading-relaxed">
                  {msg.content.split('\n').map((line, i) => {
                    // Render **bold** text
                    const parts = line.split(/(\*\*[^*]+\*\*)/g)
                    const rendered = parts.map((part, j) => {
                      if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={j} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>
                      }
                      return <span key={j}>{part}</span>
                    })
                    // Check if line is a numbered list item (1. 2. etc.)
                    if (/^\d+\.\s/.test(line.trim())) {
                      return <div key={i} className="ml-3 mb-0.5">{rendered}</div>
                    }
                    // Check if line is a bullet (- or *)
                    if (/^[-*]\s/.test(line.trim())) {
                      return <div key={i} className="ml-3 mb-0.5 flex gap-1"><span className="text-blue-500">•</span><span>{rendered}</span></div>
                    }
                    if (line.trim() === '') return <div key={i} className="h-2" />
                    return <p key={i} className="mb-1">{rendered}</p>
                  })}
                </div>
              ) : (
                <p className="text-sm whitespace-pre-line">{msg.content}</p>
              )}
              {/* Clickable provider recommendation cards — polished design */}
              {msg.isBot && msg.providerMatches && msg.providerMatches.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Recommended Providers</p>
                  {msg.providerMatches.map((pm, i) => (
                    <button
                      key={i}
                      onClick={() => navigate('provider-profile', { providerId: pm.providerId })}
                      className="w-full bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 rounded-xl p-3 flex items-center gap-3 text-left transition-all border border-blue-100 active:scale-[0.98]"
                    >
                      <div className="relative shrink-0">
                        <img
                          src={pm.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(pm.name)}&background=2563eb&color=fff&size=48`}
                          alt={pm.name}
                          className="w-11 h-11 rounded-full border-2 border-white shadow-sm"
                        />
                        {pm.verified && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                            <CheckCircle className="h-2.5 w-2.5 text-white" />
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-gray-800 truncate">{pm.name}</p>
                          {pm.pro && (
                            <span className="text-[8px] bg-gradient-to-r from-amber-400 to-orange-400 text-white px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                              <Crown className="h-2.5 w-2.5" />PRO
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-gray-500 truncate">{pm.category}</span>
                          {typeof pm.rating === 'number' && pm.rating > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-gray-600">
                              <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                              {pm.rating.toFixed(1)}
                            </span>
                          )}
                          {pm.hourlyRate ? (
                            <span className="text-[10px] font-semibold text-green-600">₹{pm.hourlyRate}/hr</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-1">
                        <span className="text-[10px] text-blue-600 font-bold">View</span>
                        <ChevronRight className="h-3.5 w-3.5 text-blue-400" />
                      </div>
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
