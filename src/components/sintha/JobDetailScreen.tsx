'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { cleanError } from '@/lib/clean-error'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft, MapPin, IndianRupee, Calendar, Clock, MessageCircle,
  CheckCircle, Crown, Loader2,
} from 'lucide-react'

interface JobUser {
  id: string
  name: string
  photoUrl?: string | null
  location?: string | null
  phone?: string | null
  isVerified?: boolean
  isPro?: boolean
  proExpiry?: string | null
}
interface JobQuote {
  id: string
  price: number
  message: string
  estimatedTime?: string | null
  status: string
  createdAt: string
  provider: JobUser
}
interface JobDetail {
  id: string
  title: string
  description: string
  status: string
  location?: string | null
  budget?: number | null
  preferredDate?: string | null
  urgency?: string
  photoUrls?: string | null
  createdAt: string
  clientId: string
  categoryId: string
  client?: JobUser
  category?: { id: string; name: string }
  quotes?: JobQuote[]
}

const statusStyles: Record<string, { label: string; className: string }> = {
  open: { label: 'Open', className: 'bg-green-100 text-green-700' },
  awarded: { label: 'Awarded', className: 'bg-blue-100 text-blue-700' },
  closed: { label: 'Closed', className: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
}

const urgencyLabels: Record<string, string> = {
  urgent: 'Today',
  soon: 'This Week',
  flexible: 'Flexible',
}

function parsePhotoUrls(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.filter((u): u is string => typeof u === 'string' && u.length > 0)
    }
  } catch {
    // malformed
  }
  return []
}

function isProActive(q: JobQuote): boolean {
  if (!q.provider.isPro) return false
  if (!q.provider.proExpiry) return true
  try {
    return new Date(q.provider.proExpiry).getTime() > Date.now()
  } catch {
    return true
  }
}

export default function JobDetailScreen() {
  const { navigate, user, viewParams } = useAppStore()
  const { toast } = useToast()
  const jobId = viewParams?.jobId

  const [loading, setLoading] = useState(true)
  const [job, setJob] = useState<JobDetail | null>(null)

  // Send-quote form state
  const [quotePrice, setQuotePrice] = useState('')
  const [quoteMessage, setQuoteMessage] = useState('')
  const [quoteEstimatedTime, setQuoteEstimatedTime] = useState('')
  const [sendingQuote, setSendingQuote] = useState(false)

  // In-flight action tracking (cancel job / accept quote)
  const [cancelling, setCancelling] = useState(false)
  const [acceptingQuoteId, setAcceptingQuoteId] = useState<string | null>(null)

  useEffect(() => {
    const loadJob = async () => {
      if (!jobId) return
      setLoading(true)
      try {
        const data = await apiFetch<{ job: JobDetail }>(`/jobs/${jobId}`)
        setJob(data.job)
      } catch (err) {
        toast({ title: 'Could not load job', description: cleanError(err), variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }
    loadJob()
  }, [jobId])

  const isOwner = !!user && !!job && user.id === job.clientId
  const isOpen = job?.status === 'open'
  const photos = parsePhotoUrls(job?.photoUrls)

  // Has the current provider already quoted on this job?
  const myExistingQuote = job?.quotes?.find((q) => q.provider.id === user?.id)
  const hasAlreadyQuoted = !!myExistingQuote

  const handleCancelJob = async () => {
    if (!job) return
    setCancelling(true)
    try {
      const data = await apiFetch<{ job: JobDetail }>(`/jobs/${job.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'cancelled' }),
      })
      setJob(data.job)
      toast({ title: 'Job cancelled', description: 'The job has been cancelled.' })
    } catch (err) {
      toast({ title: 'Could not cancel job', description: cleanError(err), variant: 'destructive' })
    } finally {
      setCancelling(false)
    }
  }

  const handleAcceptQuote = async (quoteId: string) => {
    if (!job) return
    setAcceptingQuoteId(quoteId)
    try {
      const data = await apiFetch<{ job: JobDetail }>(`/jobs/${job.id}/quotes/${quoteId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'accepted' }),
      })
      setJob(data.job)
      toast({
        title: 'Quote accepted! 🎉',
        description: 'The provider has been notified. Other quotes were rejected.',
      })
    } catch (err) {
      toast({ title: 'Could not accept quote', description: cleanError(err), variant: 'destructive' })
    } finally {
      setAcceptingQuoteId(null)
    }
  }

  const handleSendQuote = async () => {
    if (!job || !user) return

    const priceNum = Number(quotePrice)
    if (!quotePrice || isNaN(priceNum) || priceNum <= 0) {
      toast({ title: 'Invalid price', description: 'Enter a positive amount.' })
      return
    }
    if (!quoteMessage.trim()) {
      toast({ title: 'Message required', description: 'Tell the client what you can do.' })
      return
    }

    setSendingQuote(true)
    try {
      const data = await apiFetch<{ quote: JobQuote }>(`/jobs/${job.id}/quotes`, {
        method: 'POST',
        body: JSON.stringify({
          providerId: user.id,
          price: priceNum,
          message: quoteMessage.trim(),
          estimatedTime: quoteEstimatedTime.trim() || undefined,
        }),
      })
      // Append the new quote to the local state so the UI flips to
      // "Already quoted" without a refetch.
      setJob((prev) =>
        prev
          ? { ...prev, quotes: [...(prev.quotes || []), data.quote] }
          : prev,
      )
      toast({ title: 'Quote sent!', description: 'The client has been notified.' })
      setQuotePrice('')
      setQuoteMessage('')
      setQuoteEstimatedTime('')
    } catch (err) {
      toast({ title: 'Could not send quote', description: cleanError(err), variant: 'destructive' })
    } finally {
      setSendingQuote(false)
    }
  }

  // ─── Loading skeleton ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white sticky top-0 z-40 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
          <button onClick={() => navigate('my-jobs')} className="text-gray-600" aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-gray-800">Job Details</h1>
        </div>
        <div className="px-4 py-4 space-y-3 max-w-lg mx-auto">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    )
  }

  // ─── Not found / no jobId ───────────────────────────────────────────
  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white sticky top-0 z-40 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
          <button onClick={() => navigate('my-jobs')} className="text-gray-600" aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-gray-800">Job Details</h1>
        </div>
        <div className="text-center py-20 px-4 max-w-lg mx-auto">
          <p className="text-gray-500">This job could not be found.</p>
          <Button className="sintha-gradient text-white mt-4" onClick={() => navigate('my-jobs')}>
            Back to My Jobs
          </Button>
        </div>
      </div>
    )
  }

  const status = statusStyles[job.status] || statusStyles.open
  const quotes = job.quotes || []

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button
          onClick={() => navigate(isOwner ? 'my-jobs' : 'open-jobs')}
          className="text-gray-600"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">Job Details</h1>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
        {/* Job info card */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-gray-800">{job.title}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{job.category?.name || 'Uncategorized'}</p>
            </div>
            <Badge className={`${status.className} text-[10px] border-0 whitespace-nowrap`}>
              {status.label}
            </Badge>
          </div>

          <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">{job.description}</p>

          {/* Photos */}
          {photos.length > 0 && (
            <div className="flex gap-2 mb-3">
              {photos.map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  alt={`Job photo ${idx + 1}`}
                  className="w-20 h-20 rounded-lg object-cover border border-gray-200"
                />
              ))}
            </div>
          )}

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {job.location && (
              <div className="flex items-center gap-1.5 text-gray-600">
                <MapPin className="h-3.5 w-3.5 text-gray-400" />
                <span className="truncate">{job.location}</span>
              </div>
            )}
            {job.budget != null && job.budget > 0 ? (
              <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                <IndianRupee className="h-3.5 w-3.5 text-gray-400" />
                {job.budget.toLocaleString('en-IN')}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-blue-600 font-medium">
                <IndianRupee className="h-3.5 w-3.5" />
                Open to quotes
              </div>
            )}
            {job.preferredDate && (
              <div className="flex items-center gap-1.5 text-gray-600">
                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                {new Date(job.preferredDate).toLocaleDateString()}
              </div>
            )}
            {job.urgency && urgencyLabels[job.urgency] && (
              <div className="flex items-center gap-1.5 text-gray-600">
                <Clock className="h-3.5 w-3.5 text-gray-400" />
                {urgencyLabels[job.urgency]}
              </div>
            )}
          </div>

          {/* Posted-by line for providers viewing someone else's job */}
          {!isOwner && job.client && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
              <Avatar className="h-7 w-7">
                <AvatarImage
                  src={
                    job.client.photoUrl ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(job.client.name)}&background=0F4C81&color=fff`
                  }
                />
                <AvatarFallback>{job.client.name?.[0] || 'C'}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-gray-500">
                Posted by <span className="font-medium text-gray-700">{job.client.name}</span>
              </span>
            </div>
          )}
        </div>

        {/* ─── Owner view: cancel + quotes list ─────────────────────── */}
        {isOwner && (
          <>
            {isOpen && (
              <Button
                variant="outline"
                className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 py-5"
                onClick={handleCancelJob}
                disabled={cancelling}
              >
                {cancelling ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Cancelling...</>
                ) : (
                  <>Cancel Job</>
                )}
              </Button>
            )}

            {/* Quotes list */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                <MessageCircle className="h-4 w-4 text-gray-500" />
                Quotes ({quotes.length})
              </h3>

              {quotes.length === 0 ? (
                <div className="bg-white rounded-xl p-6 text-center shadow-sm">
                  <MessageCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No quotes yet.</p>
                  <p className="text-xs text-gray-400 mt-1">
                    You'll be notified when providers send quotes.
                  </p>
                </div>
              ) : (
                quotes.map((quote) => {
                  const pro = isProActive(quote)
                  const accepted = quote.status === 'accepted'
                  const rejected = quote.status === 'rejected'
                  return (
                    <div
                      key={quote.id}
                      className={`bg-white rounded-xl p-4 shadow-sm border ${
                        accepted ? 'border-green-300' : rejected ? 'border-gray-200 opacity-70' : 'border-transparent'
                      }`}
                    >
                      {/* Provider row */}
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="h-9 w-9">
                          <AvatarImage
                            src={
                              quote.provider.photoUrl ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(quote.provider.name)}&background=0F4C81&color=fff`
                            }
                          />
                          <AvatarFallback>{quote.provider.name?.[0] || 'P'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 flex-wrap">
                            <p className="text-sm font-semibold text-gray-800 truncate">
                              {quote.provider.name}
                            </p>
                            {quote.provider.isVerified && (
                              <Badge className="bg-blue-100 text-blue-700 border-0 text-[9px] px-1.5 py-0">
                                <CheckCircle className="h-2.5 w-2.5 mr-0.5" /> Verified
                              </Badge>
                            )}
                            {pro && (
                              <Badge className="sintha-pro-badge text-[9px] px-1.5 py-0 border-0">
                                <Crown className="h-2.5 w-2.5 mr-0.5" /> PRO
                              </Badge>
                            )}
                          </div>
                          {quote.provider.location && (
                            <p className="text-[10px] text-gray-400 flex items-center gap-0.5">
                              <MapPin className="h-2.5 w-2.5" />
                              {quote.provider.location}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-base font-bold text-gray-800 flex items-center">
                            <IndianRupee className="h-3.5 w-3.5" />
                            {quote.price.toLocaleString('en-IN')}
                          </p>
                          {quote.estimatedTime && (
                            <p className="text-[10px] text-gray-400 flex items-center gap-0.5 justify-end">
                              <Clock className="h-2.5 w-2.5" />
                              {quote.estimatedTime}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Quote message */}
                      <p className="text-xs text-gray-600 whitespace-pre-wrap mb-3">
                        {quote.message}
                      </p>

                      {/* Action button / status pill */}
                      {accepted ? (
                        <div className="flex items-center justify-center gap-1.5 bg-green-50 text-green-700 rounded-lg py-2 text-xs font-semibold">
                          <CheckCircle className="h-3.5 w-3.5" /> Quote Accepted
                        </div>
                      ) : rejected ? (
                        <div className="flex items-center justify-center gap-1.5 bg-gray-100 text-gray-500 rounded-lg py-2 text-xs font-medium">
                          Rejected
                        </div>
                      ) : isOpen ? (
                        <Button
                          className="w-full sintha-gradient text-white py-4 text-sm"
                          onClick={() => handleAcceptQuote(quote.id)}
                          disabled={acceptingQuoteId !== null}
                        >
                          {acceptingQuoteId === quote.id ? (
                            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Accepting...</>
                          ) : (
                            <>Accept Quote</>
                          )}
                        </Button>
                      ) : null}
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}

        {/* ─── Provider view: send-quote form / already-quoted ──────── */}
        {!isOwner && user?.role === 'provider' && (
          <>
            {hasAlreadyQuoted ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-green-800">Already quoted</p>
                <p className="text-xs text-green-700 mt-1">
                  You sent a quote of ₹{Number(myExistingQuote?.price || 0).toLocaleString('en-IN')}
                  {myExistingQuote?.status === 'accepted' && ' — and it was accepted! 🎉'}
                  {myExistingQuote?.status === 'rejected' && ' — but it was not selected this time.'}
                </p>
              </div>
            ) : isOpen ? (
              <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                  <MessageCircle className="h-4 w-4 text-gray-500" /> Send a Quote
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="quotePrice" className="text-xs font-medium text-gray-700 mb-1 block">
                      Your Price (₹) <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="quotePrice"
                        type="number"
                        inputMode="numeric"
                        min="0"
                        placeholder="500"
                        className="pl-9"
                        value={quotePrice}
                        onChange={(e) => setQuotePrice(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="quoteEstimatedTime" className="text-xs font-medium text-gray-700 mb-1 block">
                      Est. Time
                    </Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="quoteEstimatedTime"
                        placeholder="e.g., 2 hours"
                        className="pl-9"
                        value={quoteEstimatedTime}
                        onChange={(e) => setQuoteEstimatedTime(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="quoteMessage" className="text-xs font-medium text-gray-700 mb-1 block">
                    Message <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="quoteMessage"
                    placeholder="Tell the client what you'll do, your experience, any conditions..."
                    rows={3}
                    value={quoteMessage}
                    onChange={(e) => setQuoteMessage(e.target.value)}
                  />
                </div>

                <Button
                  className="w-full sintha-gradient text-white py-5 font-semibold"
                  onClick={handleSendQuote}
                  disabled={sendingQuote}
                >
                  {sendingQuote ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending...</>
                  ) : (
                    <>Send Quote</>
                  )}
                </Button>
              </div>
            ) : (
              <div className="bg-gray-100 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-500">
                  This job is no longer accepting quotes.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
