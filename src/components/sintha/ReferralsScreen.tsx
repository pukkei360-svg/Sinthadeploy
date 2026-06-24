'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import BottomNav from './BottomNav'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft, Gift, Copy, Share2, IndianRupee, Users, TrendingUp, Crown,
  CheckCircle, Info
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cleanError } from '@/lib/clean-error'
import WhatsAppIcon from './WhatsAppIcon'

interface ReferralData {
  referralCode: string
  referredBy: string | null
  totalEarnings: number
  pendingEarnings: number
  paidEarnings: number
  referralCount: number
  proReferralCount: number
  referrals: Array<{
    name: string
    joinedAt: string
    hasPro: boolean
    earnedAmount: number
  }>
}

export default function ReferralsScreen() {
  const { navigate, user } = useAppStore()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ReferralData | null>(null)
  const [copied, setCopied] = useState(false)

  const loadReferrals = async () => {
    if (!user) return
    setLoading(true)
    try {
      const result = await apiFetch(`/referrals?userId=${user.id}`)
      setData(result)
    } catch (err) {
      console.error('Failed to load referrals:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReferrals()
  }, [user])

  const copyCode = async () => {
    if (!data?.referralCode) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(data.referralCode)
      } else {
        const ta = document.createElement('textarea')
        ta.value = data.referralCode
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
      toast({ title: 'Copied!', description: `Referral code ${data.referralCode} copied` })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ title: 'Copy failed', description: `Your code: ${data.referralCode}` })
    }
  }

  const shareCode = async () => {
    if (!data?.referralCode) return
    // Use a short, clean branded URL that redirects to the real Vercel URL.
    // The share text shows "sintha.app/r/CODE" (looks professional) but
    // the actual clickable link goes to sinthadeploy.vercel.app/r/CODE (works).
    const realUrl = `https://sinthadeploy.vercel.app/r/${data.referralCode}`
    const displayUrl = `sintha.app/r/${data.referralCode}`
    const shareText = `Join me on SINTHA — Manipur's trusted service marketplace! Use my referral code ${data.referralCode} when you sign up. When you go PRO, I earn 30% commission (at no cost to you). ${displayUrl}`
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Join SINTHA',
          text: shareText,
          url: realUrl,
        })
      } else {
        // Fallback: copy to clipboard
        try {
          await navigator.clipboard?.writeText(`${shareText} (Link: ${realUrl})`)
          toast({ title: 'Copied!', description: 'Share message copied — paste it anywhere' })
        } catch {
          toast({ title: 'Share', description: shareText })
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        toast({ title: 'Could not share', description: cleanError(err) })
      }
    }
  }

  // Share via WhatsApp — opens wa.me with pre-filled message.
  // Uses the same anchor-click pattern as the dial button in BookingDetailScreen
  // to work inside Android WebView (Capacitor).
  const shareViaWhatsApp = () => {
    if (!data?.referralCode) return
    const realUrl = `https://sinthadeploy.vercel.app/r/${data.referralCode}`
    const msg = encodeURIComponent(`Join me on SINTHA — Manipur's trusted service marketplace! Use my referral code ${data.referralCode} when you sign up. When you go PRO, I earn 30% commission (at no cost to you). ${realUrl}`)
    const anchor = document.createElement('a')
    anchor.href = `https://wa.me/?text=${msg}`
    anchor.target = '_blank'
    anchor.rel = 'noopener noreferrer'
    anchor.style.position = 'fixed'
    anchor.style.top = '0'
    anchor.style.left = '0'
    anchor.style.opacity = '0'
    document.body.appendChild(anchor)
    anchor.click()
    setTimeout(() => { if (anchor.parentNode) anchor.parentNode.removeChild(anchor) }, 200)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate('profile')} className="text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">Refer & Earn</h1>
      </div>

      {loading ? (
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      ) : data ? (
        <div className="px-4 py-4 space-y-4">
          {/* Hero — referral code card */}
          <div className="sintha-gradient rounded-2xl p-6 text-white relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
            <div className="absolute right-12 -bottom-6 w-20 h-20 bg-white/5 rounded-full" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="h-5 w-5" />
                <h2 className="text-lg font-bold">Your Referral Code</h2>
              </div>
              <p className="text-sm opacity-90 mb-4">
                Share this code with friends. You earn <strong>30%</strong> every time they subscribe to SINTHA PRO — for life!
              </p>

              {/* The referral code — big and copyable */}
              <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 mb-3">
                <p className="text-[10px] opacity-70 uppercase tracking-wide mb-1">Your code</p>
                <p className="text-3xl font-extrabold tracking-wider font-mono break-all">
                  {data.referralCode}
                </p>
              </div>

              {/* Action buttons — 3 buttons: Copy, WhatsApp, Share */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={copyCode}
                  className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                    copied
                      ? 'bg-green-500 text-white'
                      : 'bg-white text-[#0F4C81] hover:bg-gray-100'
                  }`}
                >
                  {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={shareViaWhatsApp}
                  className="flex items-center justify-center gap-1.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
                >
                  <WhatsAppIcon className="h-4 w-4" />
                  WhatsApp
                </button>
                <button
                  onClick={shareCode}
                  className="flex items-center justify-center gap-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
              </div>
            </div>
          </div>

          {/* Earnings summary */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-xl p-3 text-center shadow-sm">
              <IndianRupee className="h-5 w-5 text-green-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-800">
                ₹{data.totalEarnings.toFixed(2)}
              </p>
              <p className="text-[10px] text-gray-500">Total Earned</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center shadow-sm">
              <TrendingUp className="h-5 w-5 text-amber-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-800">
                ₹{data.pendingEarnings.toFixed(2)}
              </p>
              <p className="text-[10px] text-gray-500">Pending</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center shadow-sm">
              <Users className="h-5 w-5 text-blue-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-800">{data.referralCount}</p>
              <p className="text-[10px] text-gray-500">Referred</p>
            </div>
          </div>

          {/* How it works */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-4 w-4 text-blue-600" />
              <h3 className="font-semibold text-gray-800 text-sm">How it works</h3>
            </div>
            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">1</span>
                <p>Share your referral code with friends via WhatsApp, SMS, or social media.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">2</span>
                <p>They enter your code when signing up on SINTHA.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">3</span>
                <p>When they subscribe to SINTHA PRO, you earn <strong>30% of the PRO price</strong> — every month they renew, for life!</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 bg-green-50 -mx-4 -mb-4 px-4 py-2 rounded-b-xl">
              <p className="text-[11px] text-green-700">
                💡 Example: If PRO is ₹199/month, you earn ₹59.70 per active referral every month. 10 active referrals = ₹597/month passive income!
              </p>
            </div>
          </div>

          {/* Referred users list */}
          {data.referrals.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-3 px-1">People you&apos;ve referred ({data.referrals.length})</h3>
              <div className="space-y-2">
                {data.referrals.map((ref, idx) => (
                  <div key={idx} className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-green-100 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-gray-600">
                        {ref.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{ref.name}</p>
                      <p className="text-[10px] text-gray-400">
                        Joined {new Date(ref.joinedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {ref.hasPro ? (
                        <>
                          <p className="text-sm font-bold text-green-600">+₹{ref.earnedAmount.toFixed(2)}</p>
                          <div className="flex items-center gap-1 justify-end">
                            <Crown className="h-3 w-3 text-amber-500" />
                            <span className="text-[10px] text-amber-600 font-medium">PRO</span>
                          </div>
                        </>
                      ) : (
                        <span className="text-[10px] text-gray-400">Not PRO yet</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* If user was referred by someone, show that */}
          {data.referredBy && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-600 shrink-0" />
              <p className="text-xs text-blue-700">
                You were referred by code <strong className="font-mono">{data.referredBy}</strong>
              </p>
            </div>
          )}

          {/* Payout info */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs text-amber-800 font-medium mb-1">💰 Payouts</p>
            <p className="text-[11px] text-amber-700">
              Earnings accumulate as &quot;pending&quot;. Contact <a href="mailto:sinthahelp@gmail.com" className="underline font-medium">sinthahelp@gmail.com</a> to request a payout when your balance reaches ₹500+. Payouts are processed via UPI within 3 business days.
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-16">
          <Gift className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Could not load referral data</p>
          <Button onClick={loadReferrals} variant="outline" size="sm" className="mt-3">
            Retry
          </Button>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
