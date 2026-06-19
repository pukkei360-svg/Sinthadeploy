'use client'

import { useEffect, useState } from 'react'
import { useAppStore, type Booking } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft, Calendar, Clock, MapPin, FileText, MessageCircle, Phone,
  CheckCircle, XCircle, Play, Star, Copy
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { dialPhone, normalizePhoneNumber, getDigitsOnly } from '@/lib/phone'
import WhatsAppIcon from './WhatsAppIcon'

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  accepted: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
}

const statusSteps = ['accepted', 'in_progress', 'completed']

export default function BookingDetailScreen() {
  const { navigate, viewParams, user, updateBooking } = useAppStore()
  const { toast } = useToast()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')

  const bookingId = viewParams?.bookingId

  useEffect(() => {
    const loadBooking = async () => {
      setLoading(true)
      try {
        const data = await apiFetch(`/bookings/${bookingId}`)
        setBooking(data.booking)
      } catch {
        toast({ title: 'Error', description: 'Failed to load booking', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }
    if (bookingId) loadBooking()
  }, [bookingId, toast])

  const updateStatus = async (status: string) => {
    setActionLoading(true)
    try {
      const data = await apiFetch(`/bookings/${bookingId}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      })
      setBooking(data.booking)
      updateBooking(bookingId, { status: data.booking.status })
      toast({ title: 'Updated', description: `Booking ${status.replace('_', ' ')}` })
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' })
    } finally {
      setActionLoading(false)
    }
  }

  const submitReview = async () => {
    if (!booking || !user) return
    setActionLoading(true)
    try {
      await apiFetch('/reviews', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: booking.id,
          authorId: user.id,
          targetId: user.role === 'client' ? booking.providerId : booking.clientId,
          rating: reviewRating,
          comment: reviewComment,
        }),
      })
      toast({ title: 'Review Submitted!', description: 'Thank you for your feedback.' })
      setShowReview(false)
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' })
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-4 space-y-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-40" />
        <Skeleton className="h-24" />
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-400">Booking not found</p>
      </div>
    )
  }

  const currentStepIndex = statusSteps.indexOf(booking.status)
  const isClient = user?.role === 'client'
  const otherPerson = isClient ? booking.provider : booking.client
  const otherPersonPhone = otherPerson?.phone

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate('my-bookings')} className="text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">Booking Details</h1>
        <div className="flex-1" />
        <Badge className={`${statusColors[booking.status] || ''} border-0 text-xs`}>
          {booking.status.replace('_', ' ')}
        </Badge>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
        {/* Service Info */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800">{booking.service}</h2>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4 text-gray-400" />
              {new Date(booking.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            {booking.time && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4 text-gray-400" />
                {booking.time}
              </div>
            )}
            {booking.address && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4 text-gray-400" />
                {booking.address}
              </div>
            )}
            {booking.description && (
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                {booking.description}
              </div>
            )}
          </div>
        </div>

        {/* Status Timeline */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-3">Status</h3>
          <div className="flex items-center justify-between">
            {statusSteps.map((step, i) => (
              <div key={step} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      i <= currentStepIndex
                        ? 'sintha-gradient text-white'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {i < currentStepIndex ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1 capitalize">
                    {step.replace('_', ' ')}
                  </span>
                </div>
                {i < statusSteps.length - 1 && (
                  <div
                    className={`h-0.5 w-12 mx-1 ${
                      i < currentStepIndex ? 'bg-blue-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Other Person with Phone Number */}
        {otherPerson && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={otherPerson.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherPerson.name)}&background=2563eb&color=fff`} />
                <AvatarFallback>{otherPerson.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold text-gray-800">{otherPerson.name}</p>
                <p className="text-xs text-gray-500">{isClient ? 'Provider' : 'Client'}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  navigate('chat-room', {
                    providerId: isClient ? booking.providerId : booking.clientId,
                    providerName: otherPerson.name,
                  })
                }
              >
                <MessageCircle className="h-4 w-4 mr-1" /> Chat
              </Button>
            </div>
            {/* Show phone number for confirmed bookings */}
            {otherPersonPhone && booking.status !== 'cancelled' && (
              <div className="border-t border-gray-100 pt-3 mt-1 space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Contact</p>
                {/* Phone number display */}
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-lg font-bold text-gray-800 tracking-wide text-center">{otherPersonPhone}</p>
                </div>
                {/* Call button — opens dialer, falls back to copy if dialer not available */}
                <button
                  onClick={async () => {
                    const result = await dialPhone(otherPersonPhone)
                    if (result.method === 'dialer') {
                      toast({ title: 'Opening dialer...', description: result.number })
                    } else if (result.method === 'copied') {
                      toast({
                        title: 'Number copied',
                        description: `Dialer unavailable — paste ${result.number} in your phone app`,
                      })
                    } else {
                      toast({ title: 'Number', description: result.number })
                    }
                  }}
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 text-sm font-semibold transition-colors w-full"
                >
                  <Phone className="h-4 w-4" />
                  Call
                </button>
                {/* WhatsApp button — green with proper WhatsApp logo */}
                <button
                  onClick={() => {
                    const cleaned = getDigitsOnly(otherPersonPhone)
                    const fullNumber = `91${cleaned}`
                    const msg = encodeURIComponent(`Hi ${otherPerson.name}, regarding my SINTHA booking.`)
                    window.open(`https://wa.me/${fullNumber}?text=${msg}`, '_blank')
                  }}
                  className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-lg py-3 text-sm font-semibold transition-colors w-full shadow-sm"
                >
                  <WhatsAppIcon className="h-5 w-5" />
                  WhatsApp
                </button>
                {/* Small "copy number" link as a fallback for users who prefer to copy */}
                <button
                  onClick={async () => {
                    const cleaned = normalizePhoneNumber(otherPersonPhone)
                    try {
                      if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(cleaned)
                      } else {
                        const textarea = document.createElement('textarea')
                        textarea.value = cleaned
                        textarea.style.position = 'fixed'
                        textarea.style.opacity = '0'
                        document.body.appendChild(textarea)
                        textarea.select()
                        document.execCommand('copy')
                        document.body.removeChild(textarea)
                      }
                      toast({ title: 'Copied!', description: `Number ${cleaned} copied to clipboard` })
                    } catch {
                      toast({ title: 'Number', description: cleaned })
                    }
                  }}
                  className="flex items-center justify-center gap-1.5 text-gray-500 hover:text-gray-700 text-xs font-medium transition-colors w-full"
                >
                  <Copy className="h-3 w-3" />
                  Copy number instead
                </button>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-3">Actions</h3>
          <div className="flex flex-wrap gap-2">
            {isClient && (booking.status === 'accepted') && (
              <Button variant="destructive" size="sm" onClick={() => updateStatus('cancelled')} disabled={actionLoading}>
                <XCircle className="h-4 w-4 mr-1" /> Cancel
              </Button>
            )}
            {!isClient && booking.status === 'pending' && (
              <>
                <Button size="sm" className="sintha-gradient text-white" onClick={() => updateStatus('accepted')} disabled={actionLoading}>
                  <CheckCircle className="h-4 w-4 mr-1" /> Accept
                </Button>
                <Button variant="destructive" size="sm" onClick={() => updateStatus('cancelled')} disabled={actionLoading}>
                  <XCircle className="h-4 w-4 mr-1" /> Reject
                </Button>
              </>
            )}
            {!isClient && booking.status === 'accepted' && (
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => updateStatus('in_progress')} disabled={actionLoading}>
                <Play className="h-4 w-4 mr-1" /> Start
              </Button>
            )}
            {!isClient && booking.status === 'in_progress' && (
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => updateStatus('completed')} disabled={actionLoading}>
                <CheckCircle className="h-4 w-4 mr-1" /> Mark Complete
              </Button>
            )}
            {booking.status === 'completed' && !booking.review && isClient && (
              <Button size="sm" className="sintha-gradient text-white" onClick={() => setShowReview(true)}>
                <Star className="h-4 w-4 mr-1" /> Leave Review
              </Button>
            )}
          </div>
        </div>

        {/* Review Form */}
        {showReview && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-3">Leave a Review</h3>
            <div className="flex items-center gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} onClick={() => setReviewRating(s)}>
                  <Star className={`h-7 w-7 ${s <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                </button>
              ))}
            </div>
            <textarea
              className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none"
              rows={3}
              placeholder="Write your review..."
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
            />
            <Button className="w-full mt-3 sintha-gradient text-white" onClick={submitReview} disabled={actionLoading}>
              {actionLoading ? 'Submitting...' : 'Submit Review'}
            </Button>
          </div>
        )}

        {/* Existing Review */}
        {booking.review && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-2">Review</h3>
            <div className="flex items-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`h-4 w-4 ${s <= booking.review!.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
              ))}
              <span className="text-sm text-gray-500 ml-2">{booking.review.rating}/5</span>
            </div>
            {booking.review.comment && (
              <p className="text-sm text-gray-600">{booking.review.comment}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
