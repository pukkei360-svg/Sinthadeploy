'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft, MapPin, IndianRupee, Calendar, Clock, MessageCircle,
  CheckCircle, Crown, Star, Phone, Loader2
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cleanError } from '@/lib/clean-error'

interface Quote {
  id: string
  price: number
  message: string
  estimatedTime: string | null
  status: string
  createdAt: string
  provider: {
    id: string
    name: string
    photoUrl: string | null
    location: string | null
    isVerified: boolean
    isPro: boolean
    proExpiry: string | null
  }
}

interface Job {
  id: string
  title: string
  description: string
  status: string
  location: string | null
  budget: number | null
  preferredDate: string | null
  urgency: string
  createdAt: string
  photoUrls: string | null // JSON array of Cloudinary URLs
  client: { id: string; name: string; phone: string | null }
  category: { id: string; name: string }
  quotes: Quote[]
}

export default function JobDetailScreen() {
  const { navigate, user, viewParams } = useAppStore()
  const { toast } = useToast()
  const jobId = viewParams.jobId

  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  const loadJob = async () => {
    if (!jobId) return
    setLoading(true)
    try {
      const data = await apiFetch(`/jobs/${jobId}`)
      setJob(data.job)
    } catch (err) {
      toast({ title: 'Failed to load job', description: cleanError(err) })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadJob()
  }, [jobId])

  const handleAcceptQuote = async (quoteId: string) => {
    if (!job) return
    if (!confirm('Accept this quote? The provider will be notified.')) return
    setActing(quoteId)
    try {
      await apiFetch(`/jobs/${job.id}/quotes/${quoteId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'accepted' }),
      })
      toast({
        title: 'Quote accepted!',
        description: 'The provider has been notified. They will contact you.',
      })
      await loadJob()
    } catch (err) {
      toast({ title: 'Failed to accept quote', description: cleanError(err) })
    } finally {
      setActing(null)
    }
  }

  const handleCancelJob = async () => {
    if (!job) return
    if (!confirm('Cancel this job? Quotes will be rejected.')) return
    setActing('cancel')
    try {
      await apiFetch(`/jobs/${job.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'cancelled' }),
      })
      toast({ title: 'Job cancelled' })
      await loadJob()
    } catch (err) {
      toast({ title: 'Failed to cancel', description: cleanError(err) })
    } finally {
      setActing(null)
    }
  }

  const isMyJob = user?.id === job?.client.id
  const isAccepted = job?.status === 'awarded'

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white sticky top-0 z-40 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
          <button onClick={() => navigate('my-jobs')} className="text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-gray-800">Job Details</h1>
        </div>
        <div className="p-4 space-y-3">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">Job not found</p>
          <Button className="mt-3" onClick={() => navigate('my-jobs')}>Back to My Jobs</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => isMyJob ? navigate('my-jobs') : navigate('open-jobs')} className="text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">Job Details</h1>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
        {/* Job info */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1">
              <h2 className="font-bold text-gray-800">{job.title}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{job.category.name}</p>
            </div>
            <Badge className={`border-0 text-[10px] ${
              job.status === 'open' ? 'bg-green-100 text-green-700' :
              job.status === 'awarded' ? 'bg-blue-100 text-blue-700' :
              job.status === 'cancelled' ? 'bg-gray-100 text-gray-600' :
              'bg-gray-100 text-gray-600'
            }`}>
              {job.status === 'open' ? 'Open' :
               job.status === 'awarded' ? 'Awarded' :
               job.status === 'cancelled' ? 'Cancelled' : 'Closed'}
            </Badge>
          </div>

          <p className="text-sm text-gray-700 whitespace-pre-wrap mt-2">{job.description}</p>

          {/* Job photos (if any) */}
          {job.photoUrls && (() => {
            try {
              const photos = JSON.parse(job.photoUrls) as string[]
              if (!Array.isArray(photos) || photos.length === 0) return null
              return (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Photos</p>
                  <div className="grid grid-cols-2 gap-2">
                    {photos.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img
                          src={url}
                          alt={`Job photo ${i + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-gray-200"
                        />
                      </a>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Tap to enlarge</p>
                </div>
              )
            } catch {
              return null
            }
          })()}

          <div className="flex items-center gap-3 text-xs text-gray-500 mt-3 flex-wrap">
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {job.location}
              </span>
            )}
            {job.budget && (
              <span className="flex items-center gap-1">
                <IndianRupee className="h-3 w-3" /> {job.budget}
              </span>
            )}
            {job.preferredDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {new Date(job.preferredDate).toLocaleDateString('en-IN')}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {job.urgency === 'today' ? 'Today' : job.urgency === 'this_week' ? 'This week' : 'Flexible'}
            </span>
          </div>
        </div>

        {/* Cancel button (if it's the client's job and still open) */}
        {isMyJob && job.status === 'open' && (
          <Button
            variant="outline"
            className="w-full text-gray-500"
            onClick={handleCancelJob}
            disabled={acting === 'cancel'}
          >
            {acting === 'cancel' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Cancel Job
          </Button>
        )}

        {/* Quotes section */}
        {isMyJob && (
          <div>
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-blue-600" />
              Quotes ({job.quotes.length})
            </h3>

            {job.quotes.length === 0 ? (
              <div className="bg-white rounded-xl p-6 text-center border border-gray-100">
                <MessageCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No quotes yet</p>
                <p className="text-xs text-gray-300 mt-1">Providers will send quotes soon</p>
              </div>
            ) : (
              <div className="space-y-3">
                {job.quotes.map((quote) => {
                  const isPro = quote.provider.isPro && (!quote.provider.proExpiry || new Date(quote.provider.proExpiry) > new Date())
                  return (
                    <div
                      key={quote.id}
                      className={`bg-white rounded-xl p-4 shadow-sm border ${
                        quote.status === 'accepted' ? 'border-green-300 bg-green-50' :
                        quote.status === 'rejected' ? 'border-gray-200 opacity-60' :
                        'border-gray-100'
                      }`}
                    >
                      {/* Provider info */}
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={quote.provider.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(quote.provider.name)}&background=2563eb&color=fff`} />
                          <AvatarFallback>{quote.provider.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-gray-800 truncate">{quote.provider.name}</p>
                            {quote.provider.isVerified && <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                            {isPro && <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                          </div>
                          {quote.provider.location && (
                            <p className="text-[10px] text-gray-500 flex items-center gap-0.5">
                              <MapPin className="h-2.5 w-2.5" /> {quote.provider.location}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold text-green-600">₹{quote.price}</p>
                          {quote.estimatedTime && (
                            <p className="text-[10px] text-gray-400">{quote.estimatedTime}</p>
                          )}
                        </div>
                      </div>

                      {/* Message */}
                      <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-2 mb-3">
                        {quote.message}
                      </p>

                      {/* Action buttons */}
                      {quote.status === 'accepted' ? (
                        <div className="bg-green-100 rounded-lg p-2 text-center">
                          <p className="text-xs font-semibold text-green-700 flex items-center justify-center gap-1">
                            <CheckCircle className="h-3.5 w-3.5" /> Accepted — provider will contact you
                          </p>
                        </div>
                      ) : quote.status === 'rejected' ? (
                        <p className="text-xs text-gray-400 text-center">Rejected</p>
                      ) : job.status === 'open' ? (
                        <Button
                          className="w-full sintha-gradient text-white"
                          onClick={() => handleAcceptQuote(quote.id)}
                          disabled={!!acting}
                        >
                          {acting === quote.id ? (
                            <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Accepting...</>
                          ) : (
                            <>Accept Quote</>
                          )}
                        </Button>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* If this is NOT the client's job (provider viewing), show a "send quote" prompt */}
        {!isMyJob && job.status === 'open' && (
          <SendQuoteCard jobId={job.id} onQuoteSent={loadJob} />
        )}

        {!isMyJob && job.status !== 'open' && (
          <div className="bg-gray-100 rounded-xl p-4 text-center">
            <p className="text-sm text-gray-500">This job is no longer accepting quotes.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Send Quote card (shown to providers viewing a job) ──
function SendQuoteCard({ jobId, onQuoteSent }: { jobId: string; onQuoteSent: () => void }) {
  const { user, navigate } = useAppStore()
  const { toast } = useToast()
  const [price, setPrice] = useState('')
  const [message, setMessage] = useState('')
  const [estimatedTime, setEstimatedTime] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!user) return
    if (!price || Number(price) <= 0) {
      toast({ title: 'Enter a valid price' })
      return
    }
    if (message.trim().length < 5) {
      toast({ title: 'Message too short', description: 'At least 5 characters' })
      return
    }
    setSending(true)
    try {
      await apiFetch(`/jobs/${jobId}/quotes`, {
        method: 'POST',
        body: JSON.stringify({
          providerId: user.id,
          price: Number(price),
          message: message.trim(),
          estimatedTime: estimatedTime.trim() || undefined,
        }),
      })
      toast({ title: 'Quote sent!', description: 'The client will be notified.' })
      onQuoteSent()
    } catch (err) {
      toast({ title: 'Failed to send quote', description: cleanError(err) })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-200">
      <h3 className="font-bold text-gray-800 mb-3">Send a Quote</h3>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-gray-700 flex items-center gap-1 mb-1">
            <IndianRupee className="h-3 w-3" /> Your Price (₹)
          </label>
          <input
            type="number"
            placeholder="e.g. 500"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            min="0"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700 mb-1 block">Message to client</label>
          <textarea
            placeholder="e.g. I can fix this today. I have 8 years of experience with ceiling fans."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={500}
            rows={3}
            className="w-full p-2.5 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700 mb-1 block">Estimated time (optional)</label>
          <input
            type="text"
            placeholder="e.g. 2 hours, 1 day"
            value={estimatedTime}
            onChange={(e) => setEstimatedTime(e.target.value)}
            className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <Button
          className="w-full sintha-gradient text-white"
          onClick={handleSend}
          disabled={sending || !price || !message.trim()}
        >
          {sending ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Sending...</>
          ) : (
            <>Send Quote</>
          )}
        </Button>
      </div>
    </div>
  )
}
