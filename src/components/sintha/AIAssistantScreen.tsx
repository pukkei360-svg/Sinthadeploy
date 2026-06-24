'use client'

import { useAppStore } from '@/lib/store'
import BottomNav from './BottomNav'
import { ArrowLeft, HelpCircle, Mail, ChevronDown } from 'lucide-react'
import { useState } from 'react'

const QUICK_ANSWERS = [
  {
    q: 'How do I book a service?',
    a: 'Browse categories from Home → select a provider → tap "Book Now" → fill date/time/address → submit. The booking is auto-confirmed!',
  },
  {
    q: 'What is SINTHA PRO?',
    a: 'PRO is a monthly subscription for providers (₹199/month). Benefits: higher search ranking, PRO badge, homepage visibility. Tap "SINTHA PRO" in your Profile to subscribe.',
  },
  {
    q: 'How does the referral program work?',
    a: 'Share your referral code (Profile → Refer & Earn). When someone signs up with your code and buys PRO, you earn 30% — every month, for life!',
  },
  {
    q: 'How do I reschedule a booking?',
    a: 'Open the booking → tap "Reschedule" → pick a new date/time. The other party is notified instantly.',
  },
  {
    q: 'How do I cancel a booking?',
    a: 'Open the booking → tap "Cancel" → choose a reason. The other party is notified with the reason.',
  },
  {
    q: 'Is SINTHA free?',
    a: 'Yes! Zero commission — providers keep 100% of earnings. Only PRO subscription is optional (₹199/month). Clients pay providers directly for services.',
  },
  {
    q: 'How do I become a verified provider?',
    a: 'Go to Profile → Get Verified. Upload your Aadhaar (front + back) and a passport photo. Admin reviews within 1-2 business days.',
  },
  {
    q: 'Need more help?',
    a: 'Email us at sinthahelp@gmail.com — we respond within 24 hours.',
  },
]

export default function AIAssistantScreen() {
  const { navigate } = useAppStore()
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-20">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 px-4 py-3 flex items-center gap-3 border-b border-[#E2E8F0]">
        <button onClick={() => navigate('home')} className="text-[#64748B]">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="w-8 h-8 rounded-full sintha-gradient flex items-center justify-center">
          <HelpCircle className="h-4 w-4 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-[#1E293B]">Help & FAQ</h1>
          <p className="text-[10px] text-[#10B981] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
            Quick answers
          </p>
        </div>
      </div>

      {/* Quick answers */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        <p className="text-xs text-[#64748B] mb-2">
          Tap a question to see the answer:
        </p>
        {QUICK_ANSWERS.map((item, i) => (
          <div key={i} className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full px-4 py-3 flex items-center justify-between text-left"
            >
              <span className="text-sm font-medium text-[#1E293B]">{item.q}</span>
              <ChevronDown
                className={`h-4 w-4 text-[#94A3B8] transition-transform shrink-0 ml-2 ${
                  openIndex === i ? 'rotate-180' : ''
                }`}
              />
            </button>
            {openIndex === i && (
              <div className="px-4 pb-3">
                <p className="text-sm text-[#64748B] leading-relaxed">{item.a}</p>
              </div>
            )}
          </div>
        ))}

        {/* Contact support */}
        <div className="sintha-gradient rounded-2xl p-5 text-white mt-4">
          <h3 className="font-bold mb-1">Still need help?</h3>
          <p className="text-sm opacity-90 mb-3">
            Email us and we&apos;ll respond within 24 hours.
          </p>
          <a
            href="mailto:sinthahelp@gmail.com"
            className="bg-white/20 hover:bg-white/30 rounded-xl px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
          >
            <Mail className="h-4 w-4" />
            sinthahelp@gmail.com
          </a>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
