'use client'

import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import BottomNav from './BottomNav'
import { ArrowLeft, Sparkles, Send, Zap, Loader2 } from 'lucide-react'

interface AIChatMessage {
  id: string
  content: string
  isBot: boolean
  timestamp: Date
}

export default function AIAssistantScreen() {
  const { navigate } = useAppStore()
  const [chatMessages, setChatMessages] = useState<AIChatMessage[]>([
    {
      id: 'welcome',
      content: "Hi! I'm SINTHA AI, your smart assistant. I can help you find providers, guide you through booking, and answer any questions about SINTHA. What can I help you with today?",
      isBot: true,
      timestamp: new Date(),
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

    // Add user message
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
      // Build conversation history for the AI (last 6 messages)
      const conversationHistory = chatMessages
        .slice(-6)
        .map((msg) => ({
          role: msg.isBot ? 'assistant' : 'user',
          content: msg.content,
        }))

      // Call the real AI API
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
      }
      setChatMessages((prev) => [...prev, botMsg])
    } catch (err: unknown) {
      // Fallback if API fails
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
            Online · Real AI
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
              <p className={`text-[10px] mt-1 ${msg.isBot ? 'text-[#94A3B8]' : 'text-white/60'}`}>
                {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
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
              <Zap className="h-3 w-3 mr-1" />
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
