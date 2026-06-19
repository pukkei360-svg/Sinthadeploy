'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Check, Crown, X, ChevronDown, ChevronUp, Copy, ExternalLink, Loader2, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const benefits = [
  'Higher search ranking',
  'Featured Provider Badge',
  'Homepage visibility',
  'Priority Support',
]

const faqs = [
  { q: 'What is SINTHA PRO?', a: 'SINTHA PRO is our premium subscription plan for service providers. It gives you enhanced visibility and priority support to grow your business.' },
  { q: 'How much does it cost?', a: 'SINTHA PRO is just ₹199/month. No hidden fees, no long-term commitment. Cancel anytime.' },
  { q: 'Can I cancel anytime?', a: 'Yes! You can cancel your PRO subscription at any time. You\'ll continue to have PRO features until the end of your billing period.' },
  { q: 'Will I get more bookings?', a: 'PRO providers get higher search rankings and homepage visibility, which typically leads to 3-5x more booking requests.' },
  { q: 'Is there a free trial?', a: 'Currently we don\'t offer a free trial, but at just ₹199/month, it\'s very affordable. Most PRO providers earn back the subscription in their first booking!' },
]

export default function SinthaProScreen() {
  const { navigate, user, setUser } = useAppStore()
  const { toast } = useToast()
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [paymentLinkLoading, setPaymentLinkLoading] = useState(false)
  const [paymentLinkId, setPaymentLinkId] = useState<string | null>(null)
  const [paymentLinkUrl, setPaymentLinkUrl] = useState<string | null>(null)
  const [checkingPayment, setCheckingPayment] = useState(false)
  const [autoVerifying, setAutoVerifying] = useState(false)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const pollingCountRef = useRef(0)

  // Auto-polling: check payment status every 5 seconds after payment link is opened
  const startPolling = useCallback((linkId: string) => {
    // Clear any existing polling
    if (pollingRef.current) clearInterval(pollingRef.current)
    pollingCountRef.current = 0
    setAutoVerifying(true)

    pollingRef.current = setInterval(async () => {
      pollingCountRef.current += 1
      // Stop polling after 60 attempts (5 minutes)
      if (pollingCountRef.current > 60) {
        if (pollingRef.current) clearInterval(pollingRef.current)
        setAutoVerifying(false)
        toast({ title: 'Auto-check stopped', description: 'Timed out. Tap "Verify Payment" manually.' })
        return
      }

      try {
        const data = await apiFetch('/razorpay/check-payment', {
          method: 'POST',
          body: JSON.stringify({ userId: user!.id, paymentLinkId: linkId }),
        })

        if (data.paid && data.user) {
          // Payment confirmed — stop polling and activate!
          if (pollingRef.current) clearInterval(pollingRef.current)
          setAutoVerifying(false)
          setUser(data.user, null)
          toast({ title: 'PRO Activated!', description: 'Payment auto-verified! Your SINTHA PRO is now active.' })
          navigate('profile')
        }
      } catch {
        // Silently retry on next interval
      }
    }, 5000) // Check every 5 seconds
  }, [user, setUser, navigate, toast])

  // Also check when user returns to the app (visibility change)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && paymentLinkId && !user?.isPro) {
        // User came back to the app — check immediately
        handleVerifyPayment()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [paymentLinkId, user?.isPro])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

  const handlePaymentLink = async () => {
    if (!user) {
      toast({ title: 'Error', description: 'Please login first', variant: 'destructive' })
      return
    }

    setPaymentLinkLoading(true)
    try {
      const data = await apiFetch('/razorpay/payment-link', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id }),
      })

      setPaymentLinkId(data.paymentLinkId)
      setPaymentLinkUrl(data.paymentLinkUrl)

      // Open in external browser — this works in WebView because it's https://
      window.open(data.paymentLinkUrl, '_blank')

      // Start auto-polling — will auto-detect when payment is completed
      startPolling(data.paymentLinkId)

      toast({ title: 'Payment Link Opened', description: 'Complete payment in your browser. PRO will auto-activate when payment is done!' })
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message || 'Failed to create payment link', variant: 'destructive' })
    } finally {
      setPaymentLinkLoading(false)
    }
  }

  const handleVerifyPayment = async () => {
    if (!user || !paymentLinkId) return

    setCheckingPayment(true)
    try {
      const data = await apiFetch('/razorpay/check-payment', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id, paymentLinkId }),
      })

      if (data.paid && data.user) {
        setUser(data.user, null)
        toast({ title: 'PRO Activated!', description: 'Payment verified! Your SINTHA PRO is now active.' })
        navigate('profile')
      } else {
        toast({ title: 'Payment Pending', description: data.message || 'Payment not completed yet. Please complete payment first.' })
      }
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message || 'Failed to verify payment', variant: 'destructive' })
    } finally {
      setCheckingPayment(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('profile')} className="text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">SINTHA PRO</h1>
      </div>

      {/* Hero Banner */}
      <div className="mx-4 rounded-2xl sintha-gradient p-6 text-white relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
        <div className="absolute right-12 bottom-0 w-20 h-20 bg-white/5 rounded-full" />
        <div className="relative z-10">
          <Badge className="sintha-pro-badge text-white px-3 py-1 mb-3 border-0">
            <Crown className="h-3 w-3 mr-1" /> PRO
          </Badge>
          <h2 className="text-2xl font-bold mb-1">Unlock Premium</h2>
          <p className="text-sm opacity-80">Grow your business with SINTHA PRO</p>
          <div className="mt-4">
            <span className="text-3xl font-extrabold">₹199</span>
            <span className="text-sm opacity-70">/month</span>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="px-4 py-6">
        <h3 className="font-bold text-gray-800 mb-3">What you get:</h3>
        <div className="space-y-2.5">
          {benefits.map((benefit) => (
            <div key={benefit} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <Check className="h-3.5 w-3.5 text-green-600" />
              </div>
              <span className="text-sm text-gray-700">{benefit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Subscribe Section */}
      <div className="px-4 pb-4 space-y-3">
        {user?.isPro ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <Crown className="h-10 w-10 text-yellow-500 mx-auto mb-2" />
            <h3 className="font-bold text-green-800 mb-1">You're a PRO Member!</h3>
            <p className="text-xs text-green-600">Your SINTHA PRO subscription is active.</p>
          </div>
        ) : !paymentLinkUrl ? (
          <div className="space-y-3">
            {/* Single clean Pay button */}
            <Button
              className="w-full sintha-gradient text-white py-6 font-bold text-base"
              onClick={handlePaymentLink}
              disabled={paymentLinkLoading}
            >
              {paymentLinkLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Crown className="h-5 w-5 mr-2" />}
              {paymentLinkLoading ? 'Creating Payment...' : 'Pay ₹199 & Activate PRO'}
            </Button>
            <p className="text-[11px] text-center text-gray-500">
              Pay with Google Pay, PhonePe, Paytm, UPI, Cards, or Net Banking
            </p>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
            {/* Auto-verify status indicator */}
            {autoVerifying && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <div>
                  <p className="text-xs font-semibold text-blue-800">Auto-checking payment...</p>
                  <p className="text-[10px] text-blue-600">PRO will activate automatically once payment is done</p>
                </div>
              </div>
            )}

            {/* Open payment link button */}
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white py-5 font-bold text-sm"
              onClick={() => window.open(paymentLinkUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Payment Link
            </Button>

            {/* Copy link option */}
            <div className="flex items-center gap-2">
              <p className="text-[11px] text-gray-600 truncate flex-1 bg-white rounded px-2 py-1.5">{paymentLinkUrl}</p>
              <button
                onClick={async () => {
                  try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      await navigator.clipboard.writeText(paymentLinkUrl)
                    } else {
                      const textarea = document.createElement('textarea')
                      textarea.value = paymentLinkUrl
                      textarea.style.position = 'fixed'
                      textarea.style.opacity = '0'
                      document.body.appendChild(textarea)
                      textarea.select()
                      document.execCommand('copy')
                      document.body.removeChild(textarea)
                    }
                    toast({ title: 'Copied!', description: 'Link copied to clipboard.' })
                  } catch {
                    toast({ title: 'Link', description: paymentLinkUrl })
                  }
                }}
                className="flex items-center gap-1 bg-gray-700 hover:bg-gray-800 text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors shrink-0"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </button>
            </div>

            {/* Instructions */}
            <div className="bg-white rounded-xl p-3">
              <p className="text-[11px] text-green-700 font-semibold mb-2">How to pay:</p>
              <div className="text-[11px] text-green-600 space-y-1">
                <p>1. Tap "Open Payment Link" above</p>
                <p>2. Choose <span className="font-bold">Google Pay / PhonePe / UPI / Card</span></p>
                <p>3. Complete ₹199 payment</p>
                <p>4. Come back here — <span className="font-bold">PRO auto-activates!</span></p>
              </div>
            </div>

            {/* Manual verify fallback */}
            <Button
              variant="outline"
              className="w-full border-green-300 text-green-700 py-4 font-bold text-sm"
              onClick={handleVerifyPayment}
              disabled={checkingPayment}
            >
              {checkingPayment ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              {checkingPayment ? 'Verifying...' : 'Check Payment Status'}
            </Button>
          </div>
        )}
      </div>

      {/* Comparison Table */}
      <div className="px-4 py-4">
        <h3 className="font-bold text-gray-800 mb-3">Free vs PRO</h3>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <div className="grid grid-cols-3 text-center text-sm">
              <div className="p-3 font-semibold text-gray-500 border-b">Feature</div>
              <div className="p-3 font-semibold text-gray-500 border-b">Free</div>
              <div className="p-3 font-semibold sintha-gradient-text border-b">PRO</div>

              <div className="p-2.5 text-xs text-gray-600 border-b">Search Ranking</div>
              <div className="p-2.5 border-b"><X className="h-4 w-4 text-gray-300 mx-auto" /></div>
              <div className="p-2.5 border-b"><Check className="h-4 w-4 text-green-500 mx-auto" /></div>

              <div className="p-2.5 text-xs text-gray-600 border-b">Featured Badge</div>
              <div className="p-2.5 border-b"><X className="h-4 w-4 text-gray-300 mx-auto" /></div>
              <div className="p-2.5 border-b"><Check className="h-4 w-4 text-green-500 mx-auto" /></div>

              <div className="p-2.5 text-xs text-gray-600 border-b">Homepage Visibility</div>
              <div className="p-2.5 border-b"><X className="h-4 w-4 text-gray-300 mx-auto" /></div>
              <div className="p-2.5 border-b"><Check className="h-4 w-4 text-green-500 mx-auto" /></div>

              <div className="p-2.5 text-xs text-gray-600">Priority Support</div>
              <div className="p-2.5"><X className="h-4 w-4 text-gray-300 mx-auto" /></div>
              <div className="p-2.5"><Check className="h-4 w-4 text-green-500 mx-auto" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FAQ */}
      <div className="px-4 py-4 pb-12">
        <h3 className="font-bold text-gray-800 mb-3">FAQ</h3>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-gray-50 rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-4 text-left"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span className="text-sm font-medium text-gray-800">{faq.q}</span>
                {openFaq === i ? (
                  <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                )}
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4 text-sm text-gray-600">{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
