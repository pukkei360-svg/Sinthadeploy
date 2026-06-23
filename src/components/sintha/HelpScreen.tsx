'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import BottomNav from './BottomNav'
import {
  ArrowLeft, ChevronDown, HelpCircle, Mail,
  Shield, CreditCard, Calendar, User, AlertCircle
} from 'lucide-react'

interface FAQItem {
  q: string
  a: string
}

const FAQS: { category: string; icon: typeof User; items: FAQItem[] }[] = [
  {
    category: 'Bookings',
    icon: Calendar,
    items: [
      {
        q: 'How do I book a service?',
        a: 'Browse categories from the home screen, select a provider, tap "Book Now", choose your date/time and address, then confirm. The provider will accept your booking and start the service.',
      },
      {
        q: 'Can I reschedule my booking?',
        a: 'Yes. Open the booking details and tap "Reschedule". Pick a new date and time. The provider will be notified of the new schedule instantly.',
      },
      {
        q: 'How do I cancel a booking?',
        a: 'Open the booking details and tap "Cancel". You\'ll be asked to choose a reason so the provider understands. The provider is notified immediately.',
      },
      {
        q: 'What happens after the service is done?',
        a: 'The provider taps "Mark Complete" once the work is finished. You\'ll then be able to rate your experience and book the same provider again with one tap.',
      },
    ],
  },
  {
    category: 'Payments',
    icon: CreditCard,
    items: [
      {
        q: 'How do I pay for a service?',
        a: 'You pay the provider directly — SINTHA takes 0% commission. Cash, UPI, or any method you and the provider agree on. SINTHA does NOT process service payments (yet).',
      },
      {
        q: 'What is SINTHA PRO?',
        a: 'PRO is a ₹199/month subscription for providers that boosts their search ranking, adds a PRO badge, and shows them on the homepage. It does NOT affect what clients pay.',
      },
      {
        q: 'How do I cancel my PRO subscription?',
        a: 'PRO is pay-as-you-go monthly. Just don\'t renew — your PRO status expires automatically at the end of the billing period. No cancellation fees.',
      },
    ],
  },
  {
    category: 'Account',
    icon: User,
    items: [
      {
        q: 'How do I become a verified provider?',
        a: 'Go to your profile and tap "Get Verified". Upload your Aadhaar card (front and back) and a passport photo. Verification usually takes 1-2 business days.',
      },
      {
        q: 'Can I switch between client and provider?',
        a: 'Currently, one account = one role. To switch, you\'d need a separate account with a different email/phone. We\'re working on multi-role accounts.',
      },
      {
        q: 'How do I change my phone number or email?',
        a: 'Contact support via the WhatsApp button below. For security reasons, identity changes can\'t be done in-app.',
      },
    ],
  },
  {
    category: 'Trust & Safety',
    icon: Shield,
    items: [
      {
        q: 'Are providers background-checked?',
        a: 'Verified providers (✓ badge) have completed Aadhaar + photo verification. We recommend choosing verified providers, especially for in-home services.',
      },
      {
        q: 'How do I report a problem with a provider?',
        a: 'Open the booking details, scroll to the bottom, and tap "Report Provider". Choose the issue type and describe what happened. Our team reviews every report.',
      },
      {
        q: 'What if a provider doesn\'t show up?',
        a: 'First, try calling or messaging them via the booking screen. If they don\'t respond within 30 minutes of the scheduled time, cancel the booking with the reason "Provider didn\'t respond" and report them.',
      },
    ],
  },
]

export default function HelpScreen() {
  const { navigate, user } = useAppStore()
  const [openCategory, setOpenCategory] = useState<string | null>('Bookings')

  const supportEmail = 'sinthahelp@gmail.com'

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate('profile')} className="text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">Help & Support</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Quick contact card — email only.
            WhatsApp and Call removed to avoid unwanted calls/messages to
            personal numbers. Users can email for support; the FAQ below
            answers most common questions instantly. */}
        <div className="sintha-gradient rounded-2xl p-5 text-white relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="h-5 w-5" />
              <h2 className="text-lg font-bold">Need help?</h2>
            </div>
            <p className="text-sm opacity-90 mb-4">
              Check the FAQ below — most questions are answered there. For anything else, email us and we&apos;ll respond within 24 hours.
            </p>
            <a
              href={`mailto:${supportEmail}`}
              className="bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-xl p-3 flex items-center justify-center gap-2 transition-colors"
            >
              <Mail className="h-5 w-5" />
              <span className="text-sm font-medium">{supportEmail}</span>
            </a>
          </div>
        </div>

        {/* FAQ accordion */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-800 px-1">Frequently Asked Questions</h3>
          {FAQS.map((section) => {
            const isOpen = openCategory === section.category
            return (
              <div key={section.category} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <button
                  onClick={() => setOpenCategory(isOpen ? null : section.category)}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <section.icon className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="flex-1 font-semibold text-gray-800 text-sm">{section.category}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-3 space-y-3 border-t border-gray-50">
                    {section.items.map((item, idx) => (
                      <details key={idx} className="group pt-2">
                        <summary className="text-sm font-medium text-gray-800 cursor-pointer list-none flex items-start gap-2">
                          <span className="flex-1">{item.q}</span>
                          <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5 group-open:rotate-180 transition-transform" />
                        </summary>
                        <p className="text-xs text-gray-600 mt-1.5 leading-relaxed pl-1">
                          {item.a}
                        </p>
                      </details>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Report a serious issue */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">Report a serious issue</p>
              <p className="text-xs text-amber-700 mt-0.5 mb-3">
                Fraud, safety concern, or abusive behavior? Report it directly to our team.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-100 text-xs"
                onClick={() => navigate('report-provider')}
              >
                Report a problem
              </Button>
            </div>
          </div>
        </div>

        {/* App info */}
        <div className="text-center pt-2">
          <p className="text-xs text-gray-400">SINTHA · v1.6.5</p>
          <p className="text-[10px] text-gray-300 mt-1">Trusted Hands. Trusted Services.</p>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
