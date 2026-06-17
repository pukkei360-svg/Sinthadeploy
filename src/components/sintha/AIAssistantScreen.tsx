'use client'

import { useState, useRef, useEffect } from 'react'
import { useAppStore, type ProviderProfile } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import BottomNav from './BottomNav'
import { ArrowLeft, Sparkles, Send, Zap } from 'lucide-react'

interface AIChatMessage {
  id: string
  content: string
  isBot: boolean
  timestamp: Date
}

function getAIResponse(message: string, providers: ProviderProfile[]): string {
  const lower = message.toLowerCase()

  // Service-related queries
  if (lower.includes('electrician') || lower.includes('electrical') || lower.includes('wiring')) {
    const electricians = providers.filter(p => p.category?.name?.toLowerCase().includes('home') || p.skills?.toLowerCase().includes('electr'))
    if (electricians.length > 0) {
      const names = electricians.slice(0, 3).map(p => `**${p.user?.name}** (⭐ ${p.rating})`).join(', ')
      return `I found ${electricians.length} home service providers who can help with electrical work! ${names} are available. Would you like to book one?`
    }
    return `I can help you find an electrician! Let me search our verified providers in the Home Services category. You can also browse them directly from the Home screen.`
  }

  if (lower.includes('plumber') || lower.includes('plumbing') || lower.includes('pipe') || lower.includes('water')) {
    const plumbers = providers.filter(p => p.skills?.toLowerCase().includes('plumb') || p.skills?.toLowerCase().includes('pipe'))
    if (plumbers.length > 0) {
      const names = plumbers.slice(0, 3).map(p => `**${p.user?.name}** (⭐ ${p.rating})`).join(', ')
      return `Great news! I found ${plumbers.length} plumbing experts: ${names}. They offer same-day service in many areas!`
    }
    return `I can help you find a plumber! Check our Home Services category for verified plumbing professionals.`
  }

  if (lower.includes('tutor') || lower.includes('teacher') || lower.includes('tuition') || lower.includes('coaching') || lower.includes('study')) {
    const tutors = providers.filter(p => p.category?.name?.toLowerCase().includes('education'))
    if (tutors.length > 0) {
      const names = tutors.slice(0, 3).map(p => `**${p.user?.name}** (⭐ ${p.rating}, ${p.experience})`).join(', ')
      return `We have ${tutors.length} education providers! ${names} are available for coaching and tutoring.`
    }
    return `Check our Education category for verified tutors and coaches in Manipur!`
  }

  if (lower.includes('photo') || lower.includes('wedding') || lower.includes('event') || lower.includes('decorat')) {
    const eventPros = providers.filter(p => p.category?.name?.toLowerCase().includes('event'))
    if (eventPros.length > 0) {
      const names = eventPros.slice(0, 3).map(p => `**${p.user?.name}** (⭐ ${p.rating})`).join(', ')
      return `We have ${eventPros.length} event professionals! ${names} can help with your event.`
    }
    return `Browse our Events category for photographers, decorators, and event planners!`
  }

  if (lower.includes('makeup') || lower.includes('beauty') || lower.includes('bridal') || lower.includes('mehendi')) {
    const beautyPros = providers.filter(p => p.category?.name?.toLowerCase().includes('beauty'))
    if (beautyPros.length > 0) {
      const names = beautyPros.slice(0, 3).map(p => `**${p.user?.name}** (⭐ ${p.rating})`).join(', ')
      return `We have ${beautyPros.length} beauty professionals! ${names} offer bridal and party makeup services.`
    }
    return `Check our Beauty category for makeup artists and beauty professionals!`
  }

  if (lower.includes('repair') || lower.includes('mobile') || lower.includes('computer') || lower.includes('laptop') || lower.includes('phone')) {
    const repairPros = providers.filter(p => p.category?.name?.toLowerCase().includes('repair'))
    if (repairPros.length > 0) {
      const names = repairPros.slice(0, 3).map(p => `**${p.user?.name}** (⭐ ${p.rating})`).join(', ')
      return `We have ${repairPros.length} repair specialists! ${names} can help fix your device.`
    }
    return `Check our Repairs category for mobile and computer repair professionals!`
  }

  if (lower.includes('driver') || lower.includes('transport') || lower.includes('car') || lower.includes('bike')) {
    const transportPros = providers.filter(p => p.category?.name?.toLowerCase().includes('transport'))
    if (transportPros.length > 0) {
      const names = transportPros.slice(0, 3).map(p => `**${p.user?.name}** (⭐ ${p.rating})`).join(', ')
      return `We have ${transportPros.length} transport providers! ${names} are available.`
    }
    return `Check our Transport category for drivers and vehicle services!`
  }

  // Booking help
  if (lower.includes('book') || lower.includes('how to') || lower.includes('hire')) {
    return `To book a service on SINTHA:\n\n1. **Browse** categories on the Home screen\n2. **Select** a provider that matches your needs\n3. **Tap "Book Now"** on their profile\n4. **Fill in** date, time, and address\n5. **Submit** your booking request\n\nThe provider will accept your request and you'll be notified!`
  }

  // General SINTHA info
  if (lower.includes('sintha') || lower.includes('about') || lower.includes('what')) {
    return `**SINTHA** is Manipur's trusted service marketplace! 🌟\n\n✅ Zero commission for providers\n✅ AI-powered matching\n✅ Verified service professionals\n✅ Available in Meitei Mayek\n\nWe connect you with trusted local providers for Home Services, Education, Transport, Events, Beauty, and Repairs.`
  }

  if (lower.includes('pro') || lower.includes('premium') || lower.includes('subscription')) {
    return `**SINTHA PRO** is our premium plan for providers at just ₹199/month!\n\nBenefits include:\n⭐ Higher search ranking\n👑 Featured Provider Badge\n📊 Advanced Analytics\n🤖 AI Auto Replies\n🔔 Priority Notifications\n\nVisit the SINTHA PRO page from your profile to subscribe!`
  }

  if (lower.includes('verify') || lower.includes('verification') || lower.includes('aadhaar')) {
    return `Provider verification on SINTHA involves:\n\n1. **Aadhaar Card** upload\n2. **Selfie Photo** for identity matching\n3. **Address Proof** submission\n\nOur team reviews documents within 24-48 hours. Verified providers get a ✅ badge and more visibility!`
  }

  if (lower.includes('commission') || lower.includes('fee') || lower.includes('charge')) {
    return `Great news! SINTHA charges **ZERO commission** from providers! 💰\n\nUnlike other platforms that take 15-30%, we believe providers deserve 100% of their earnings. We only charge for optional PRO features.`
  }

  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey') || lower.includes('namaste')) {
    return `Hello! 👋 Welcome to SINTHA AI! I can help you:\n\n🔍 Find the best service providers\n📋 Guide you through booking\n💡 Answer questions about SINTHA\n\nWhat can I help you with today?`
  }

  if (lower.includes('thank')) {
    return `You're welcome! 😊 If you need anything else, I'm always here to help. Happy to assist you with any SINTHA services!`
  }

  // Default
  return `I can help you find services, book providers, or answer questions about SINTHA. Try asking me:\n\n• "Find me an electrician"\n• "Best tutor near me"\n• "How to book a service"\n• "What is SINTHA PRO?"\n\nWhat would you like to know?`
}

export default function AIAssistantScreen() {
  const { navigate, providers } = useAppStore()
  const [chatMessages, setChatMessages] = useState<AIChatMessage[]>([
    {
      id: 'welcome',
      content: "Hi! I'm SINTHA AI. How can I help you today?",
      isBot: true,
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const quickActions = [
    'Find best electrician',
    'Book a plumber',
    'Need a tutor',
    'Event photographer',
  ]

  const sendMessage = (text?: string) => {
    const msgText = text || input.trim()
    if (!msgText) return

    const userMsg: AIChatMessage = {
      id: `user-${Date.now()}`,
      content: msgText,
      isBot: false,
      timestamp: new Date(),
    }

    setChatMessages((prev) => [...prev, userMsg])
    setInput('')

    // Simulate AI thinking
    setTimeout(() => {
      const response = getAIResponse(msgText, providers)
      const botMsg: AIChatMessage = {
        id: `bot-${Date.now()}`,
        content: response,
        isBot: true,
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, botMsg])
    }, 500)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate('home')} className="text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="w-8 h-8 rounded-full sintha-gradient flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-gray-800">SINTHA AI</h1>
          <p className="text-[10px] text-green-500">Online</p>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 sintha-scrollbar">
        {chatMessages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.isBot
                  ? 'bg-white text-gray-800 shadow-sm rounded-bl-md'
                  : 'sintha-gradient text-white rounded-br-md'
              }`}
            >
              <p className="text-sm whitespace-pre-line">{msg.content}</p>
              <p className={`text-[10px] mt-1 ${msg.isBot ? 'text-gray-400' : 'text-white/60'}`}>
                {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {chatMessages.length <= 1 && (
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
          {quickActions.map((action) => (
            <Button
              key={action}
              variant="outline"
              size="sm"
              className="whitespace-nowrap text-xs rounded-full"
              onClick={() => sendMessage(action)}
            >
              <Zap className="h-3 w-3 mr-1" />
              {action}
            </Button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-gray-100 p-3 sticky bottom-16">
        <div className="flex items-center gap-2 max-w-lg mx-auto">
          <Input
            placeholder="Ask SINTHA AI..."
            className="flex-1 bg-gray-50 border-0 rounded-full"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          />
          <Button
            size="icon"
            className="sintha-gradient text-white rounded-full h-9 w-9 shrink-0"
            onClick={() => sendMessage()}
            disabled={!input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
