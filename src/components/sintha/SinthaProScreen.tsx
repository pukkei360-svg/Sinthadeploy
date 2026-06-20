'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Check, Crown, X, ChevronDown, ChevronUp, Copy, ExternalLink, Loader2, RefreshCw, Smartphone } from 'lucide-react'
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

  // ── UPI Collect state (Option B) ──────────────────────────────
  // UPI Collect sends a payment request directly to the user's UPI app
  // (GPay/PhonePe/Paytm) — bypassing Razorpay's checkout.js popup
  // entirely. This works in WebView where checkout.js fails to detect
  // GPay. Falls back to checkout.js if UPI Collect is unavailable.
  const [upiVpa, setUpiVpa] = useState('') // User's UPI ID, e.g. "ram@okhdfcbank"
  const [upiLoading, setUpiLoading] = useState(false)
  const [upiPaymentId, setUpiPaymentId] = useState<string | null>(null)
  const [upiStatus, setUpiStatus] = useState<string | null>(null) // 'created' | 'captured' | 'failed' | null
  const [upiPolling, setUpiPolling] = useState(false)
  const [showUpiForm, setShowUpiForm] = useState(false)

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

  // ─────────────────────────────────────────────────────────────
  // Payment polling — checks backend every 5 seconds for payment status.
  // This is a CRITICAL fallback for GPay/UPI redirect payments where
  // the Razorpay handler never fires (user leaves the page/app).
  // ─────────────────────────────────────────────────────────────
  const startPaymentPolling = (userId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    pollingCountRef.current = 0
    setAutoVerifying(true)

    pollingRef.current = setInterval(async () => {
      pollingCountRef.current += 1
      // Stop after 5 minutes (60 attempts × 5s)
      if (pollingCountRef.current > 60) {
        if (pollingRef.current) clearInterval(pollingRef.current)
        setAutoVerifying(false)
        return
      }

      try {
        // Check if user's PRO status has been activated
        // (either by webhook, manual verify, or handler)
        const data = await apiFetch(`/razorpay/check-payment`, {
          method: 'POST',
          body: JSON.stringify({ userId }),
        })

        if (data.paid && data.user) {
          // Payment confirmed! Activate PRO.
          if (pollingRef.current) clearInterval(pollingRef.current)
          setAutoVerifying(false)
          setUser(data.user, null)
          toast({
            title: 'PRO Activated!',
            description: 'Payment verified! Your SINTHA PRO is now active.',
          })
          navigate('profile')
        }
      } catch {
        // Silently retry
      }
    }, 5000) // Check every 5 seconds
  }

  const handlePaymentLink = async () => {
    if (!user) {
      toast({ title: 'Error', description: 'Please login first', variant: 'destructive' })
      return
    }

    setPaymentLinkLoading(true)
    try {
      // Step 1: Create a Razorpay order via our backend
      const orderData = await apiFetch('/razorpay/create-order', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id }),
      })

      const orderId = orderData.orderId || orderData.order?.id
      const amount = orderData.amount || orderData.order?.amount
      const currency = orderData.currency || orderData.order?.currency || 'INR'
      const keyId = orderData.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID

      if (!keyId) {
        throw new Error('Razorpay key not configured')
      }

      // Step 2: Load Razorpay checkout.js script
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true

      script.onload = () => {
        // Step 3: Open Razorpay Standard Checkout modal
        const rzp = new (window as any).Razorpay({
          key: keyId,
          amount: amount,
          currency: currency,
          name: 'SINTHA PRO',
          description: 'PRO Subscription — ₹199/month',
          order_id: orderId,
          // Explicitly request all payment methods including UPI
          method: {
            upi: true,
            card: true,
            netbanking: true,
            wallet: true,
          },
          prefill: {
            name: user.name || '',
            email: user.email || '',
          },
          theme: {
            color: '#2563eb',
          },
          // GPay fallback: when checkout.js tries to open GPay via Android
          // intent, most WebViews block it. We intercept the navigation
          // and show a helpful message instead of a blank screen.
          redirect: true,
          handler: async (response: any) => {
            // Step 4: Payment successful — verify signature on backend
            try {
              const verifyData = await apiFetch('/razorpay/verify', {
                method: 'POST',
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  userId: user.id,
                }),
              })

              if (verifyData.user) {
                setUser(verifyData.user, null)
                toast({
                  title: 'PRO Activated!',
                  description: 'Payment verified! Your SINTHA PRO is now active.',
                })
                navigate('profile')
              }
            } catch (verifyErr: unknown) {
              toast({
                title: 'Verification Pending',
                description: 'Payment received! Verifying... Please wait a moment and refresh your profile.',
              })
              // Start polling as fallback in case signature verification fails
              startPaymentPolling(user.id)
            }
          },
          modal: {
            ondismiss: () => {
              // User closed the Razorpay modal.
              // DON'T say "cancelled" — they might have paid via GPay
              // (which redirects away and the modal dismisses).
              // Start polling to check if payment was actually completed.
              toast({
                title: 'Checking Payment...',
                description: 'If you completed payment, your PRO will activate automatically in a few seconds.',
              })
              startPaymentPolling(user.id)
            },
          },
        })

        rzp.on('payment.failed', (response: any) => {
          toast({
            title: 'Payment Failed',
            description: response.error?.description || 'Payment was not completed. Please try again.',
            variant: 'destructive',
          })
        })

        // Start polling immediately when modal opens (in case user pays
        // via GPay redirect and the handler never fires)
        startPaymentPolling(user.id)

        rzp.open()
      }

      script.onerror = () => {
        toast({
          title: 'Error',
          description: 'Could not load Razorpay checkout. Please check your internet connection.',
          variant: 'destructive',
        })
      }

      document.body.appendChild(script)
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: (err as Error).message || 'Failed to start payment',
        variant: 'destructive',
      })
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

  // ── UPI Collect (Option B) ────────────────────────────────────
  // Sends a ₹199 collect request to the user's UPI app. The user opens
  // GPay/PhonePe/Paytm, approves the request, and the webhook activates
  // PRO. We poll the status every 4 seconds.
  const handleUpiCollect = async () => {
    if (!user) {
      toast({ title: 'Please log in', variant: 'destructive' })
      return
    }
    if (!upiVpa.trim() || !upiVpa.includes('@')) {
      toast({ title: 'Invalid UPI ID', description: 'Enter your UPI ID like yourname@okhdfcbank', variant: 'destructive' })
      return
    }

    setUpiLoading(true)
    setUpiStatus(null)
    try {
      const data = await apiFetch('/razorpay/upi-collect', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id, vpa: upiVpa.trim() }),
      })

      setUpiPaymentId(data.paymentId)
      setUpiStatus(data.status || 'created')
      toast({
        title: 'Request sent!',
        description: 'Open your UPI app (GPay/PhonePe/Paytm) and approve the ₹199 request.',
      })

      // Start polling for payment status
      startUpiPolling(data.paymentId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send UPI request'
      toast({ title: 'UPI Request Failed', description: msg, variant: 'destructive' })
      setUpiStatus('failed')
    } finally {
      setUpiLoading(false)
    }
  }

  // Poll /razorpay/upi-status every 4 seconds for up to 5 minutes
  const startUpiPolling = (paymentId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    pollingCountRef.current = 0
    setUpiPolling(true)

    pollingRef.current = setInterval(async () => {
      pollingCountRef.current += 1
      // Stop after 75 attempts (5 minutes)
      if (pollingCountRef.current > 75) {
        if (pollingRef.current) clearInterval(pollingRef.current)
        setUpiPolling(false)
        toast({ title: 'Still waiting', description: 'Tap "Check Status" to verify manually.' })
        return
      }

      try {
        const data = await apiFetch(`/razorpay/upi-status?userId=${user!.id}&paymentId=${paymentId}`)

        if (data.paid && data.user) {
          // Payment captured — PRO activated!
          if (pollingRef.current) clearInterval(pollingRef.current)
          setUpiPolling(false)
          setUpiStatus('captured')
          setUser(data.user, null)
          toast({ title: 'PRO Activated!', description: 'Payment received via UPI! Your SINTHA PRO is now active.' })
          navigate('profile')
        } else if (data.failed) {
          if (pollingRef.current) clearInterval(pollingRef.current)
          setUpiPolling(false)
          setUpiStatus('failed')
          toast({ title: 'Payment Failed', description: data.error || 'The UPI payment was declined.', variant: 'destructive' })
        } else {
          setUpiStatus(data.status || 'created')
        }
      } catch {
        // Silently retry on next interval
      }
    }, 4000) // Check every 4 seconds
  }

  // Manual status check (used by the "Check Status" button)
  const handleCheckUpiStatus = async () => {
    if (!user || !upiPaymentId) return
    setCheckingPayment(true)
    try {
      const data = await apiFetch(`/razorpay/upi-status?userId=${user.id}&paymentId=${upiPaymentId}`)
      if (data.paid && data.user) {
        if (pollingRef.current) clearInterval(pollingRef.current)
        setUpiPolling(false)
        setUpiStatus('captured')
        setUser(data.user, null)
        toast({ title: 'PRO Activated!', description: 'Payment received! Your SINTHA PRO is now active.' })
        navigate('profile')
      } else if (data.failed) {
        setUpiStatus('failed')
        toast({ title: 'Payment Failed', description: data.error || 'The UPI payment was declined.', variant: 'destructive' })
      } else {
        toast({ title: 'Still waiting', description: data.message || 'Open your UPI app to approve the request.' })
      }
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' })
    } finally {
      setCheckingPayment(false)
    }
  }

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

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
        ) : !upiPaymentId && !paymentLinkUrl ? (
          <div className="space-y-4">
            {/* ── Primary: UPI Collect (Option B) ─────────────────────── */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-blue-800 text-sm">Pay via UPI (Recommended)</h3>
              </div>
              <p className="text-xs text-blue-700">
                Enter your UPI ID — we'll send a ₹199 request to your GPay/PhonePe/Paytm.
                Open the app, approve, and PRO activates instantly.
              </p>

              {!showUpiForm ? (
                <Button
                  className="w-full sintha-gradient text-white py-4 font-bold text-sm"
                  onClick={() => setShowUpiForm(true)}
                >
                  <Smartphone className="h-4 w-4 mr-2" /> Pay ₹199 via UPI
                </Button>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="yourname@okhdfcbank"
                    value={upiVpa}
                    onChange={(e) => setUpiVpa(e.target.value)}
                    className="w-full p-3 border border-blue-200 rounded-lg bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-300"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <p className="text-[10px] text-blue-600">
                    💡 Find your UPI ID in GPay → Profile, or PhonePe → Profile
                  </p>
                  <Button
                    className="w-full sintha-gradient text-white py-4 font-bold text-sm"
                    onClick={handleUpiCollect}
                    disabled={upiLoading || !upiVpa.trim()}
                  >
                    {upiLoading ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending request...</>
                    ) : (
                      <><Smartphone className="h-4 w-4 mr-2" /> Send ₹199 Request</>
                    )}
                  </Button>
                  <button
                    onClick={() => setShowUpiForm(false)}
                    className="w-full text-xs text-gray-500 hover:text-gray-700 py-1"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* ── Divider ── */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[10px] text-gray-400 font-medium">OR</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* ── Fallback: Razorpay checkout.js (Card / Net Banking) ── */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
              <p className="text-xs text-gray-600 font-medium text-center">
                Card / Net Banking / Wallet
              </p>
              <Button
                variant="outline"
                className="w-full border-gray-300 text-gray-700 py-4 font-semibold text-sm"
                onClick={handlePaymentLink}
                disabled={paymentLinkLoading}
              >
                {paymentLinkLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Crown className="h-4 w-4 mr-2" />
                )}
                {paymentLinkLoading ? 'Creating...' : 'Pay ₹199 via Card / Net Banking'}
              </Button>
              <p className="text-[10px] text-gray-400 text-center">
                Use this if UPI doesn't work
              </p>
            </div>
          </div>
        ) : upiPaymentId ? (
          /* ── UPI Collect: Waiting for approval ── */
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                {upiStatus === 'failed' ? (
                  <X className="h-8 w-8 text-red-500" />
                ) : upiStatus === 'captured' ? (
                  <Check className="h-8 w-8 text-green-500" />
                ) : (
                  <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                )}
              </div>
              <h3 className="font-bold text-gray-800 text-sm">
                {upiStatus === 'failed'
                  ? 'Payment Failed'
                  : upiStatus === 'captured'
                  ? 'Payment Successful!'
                  : 'Waiting for Approval'}
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                {upiStatus === 'failed'
                  ? 'The UPI payment was declined or timed out. Please try again.'
                  : upiStatus === 'captured'
                  ? 'Your SINTHA PRO is now active!'
                  : `Open your UPI app (${upiVpa}) and approve the ₹199 request from SINTHA.`}
              </p>
            </div>

            {upiPolling && upiStatus !== 'failed' && upiStatus !== 'captured' && (
              <div className="bg-white border border-blue-200 rounded-lg p-2 flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600 shrink-0" />
                <p className="text-[11px] text-blue-700">
                  Auto-checking... PRO will activate automatically once you approve.
                </p>
              </div>
            )}

            {upiStatus === 'failed' ? (
              <Button
                className="w-full sintha-gradient text-white py-3 font-bold text-sm"
                onClick={() => {
                  setUpiPaymentId(null)
                  setUpiStatus(null)
                  setUpiVpa('')
                  if (pollingRef.current) clearInterval(pollingRef.current)
                  setUpiPolling(false)
                }}
              >
                Try Again
              </Button>
            ) : upiStatus !== 'captured' ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 border-blue-300 text-blue-700 py-3 text-xs font-semibold"
                  onClick={handleCheckUpiStatus}
                  disabled={checkingPayment}
                >
                  {checkingPayment ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Checking...</>
                  ) : (
                    <><RefreshCw className="h-3.5 w-3.5 mr-1" /> Check Status</>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1 text-gray-500 py-3 text-xs"
                  onClick={() => {
                    if (pollingRef.current) clearInterval(pollingRef.current)
                    setUpiPolling(false)
                    setUpiPaymentId(null)
                    setUpiStatus(null)
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          /* ── Legacy: Payment link flow (checkout.js fallback) ── */
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
                <p>2. Choose <span className="font-bold">PhonePe / Paytm / UPI / Card</span></p>
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
