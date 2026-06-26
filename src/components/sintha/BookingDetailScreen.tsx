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
  CheckCircle, XCircle, Play, Star, Copy, RotateCcw, AlertCircle, X
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { dialPhone, normalizePhoneNumber, getDigitsOnly } from '@/lib/phone'
import WhatsAppIcon from './WhatsAppIcon'
import { cleanError } from '@/lib/clean-error'

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  accepted: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
}

const statusSteps = ['accepted', 'in_progress', 'completed']

export default function BookingDetailScreen() {
  const { navigate, goBack, viewParams, user, updateBooking } = useAppStore()
  const { toast } = useToast()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')

  // Phase 2 marketplace enhancement state
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [showReschedule, setShowReschedule] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [completePrice, setCompletePrice] = useState('')
  const [showPhotos, setShowPhotos] = useState(false)

  const bookingId = viewParams?.bookingId

  useEffect(() => {
    const loadBooking = async () => {
      setLoading(true)
      try {
        const data = await apiFetch(`/bookings/${bookingId}`)
        setBooking(data.booking)
      } catch {
        toast({ title: 'Error', description: 'Failed to load booking' })
      } finally {
        setLoading(false)
      }
    }
    if (bookingId) loadBooking()
  }, [bookingId, toast])

  const updateStatus = async (status: string, extra: Record<string, unknown> = {}) => {
    setActionLoading(true)
    try {
      const data = await apiFetch(`/bookings/${bookingId}`, {
        method: 'PUT',
        body: JSON.stringify({ status, ...extra }),
      })
      setBooking(data.booking)
      updateBooking(bookingId, { status: data.booking.status })
      toast({ title: 'Updated', description: `Booking ${status.replace('_', ' ')}` })
    } catch (err: unknown) {
      toast({ title: 'Error', description: cleanError(err) })
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast({ title: 'Reason required', description: 'Please select a reason for cancellation' })
      return
    }
    setShowCancelDialog(false)
    await updateStatus('cancelled', {
      cancelReason: cancelReason.trim(),
      cancelledBy: isClient ? 'client' : 'provider',
    })
    setCancelReason('')
  }

  const handleReschedule = async () => {
    if (!newDate) {
      toast({ title: 'Date required', description: 'Please pick a new date' })
      return
    }
    setActionLoading(true)
    try {
      const data = await apiFetch(`/bookings/${bookingId}/reschedule`, {
        method: 'POST',
        body: JSON.stringify({
          newDate,
          newTime: newTime || undefined,
          requestedBy: isClient ? 'client' : 'provider',
        }),
      })
      setBooking(data.booking)
      toast({ title: 'Rescheduled', description: 'The other party has been notified' })
      setShowReschedule(false)
      setNewDate('')
      setNewTime('')
    } catch (err: unknown) {
      toast({ title: 'Error', description: cleanError(err) })
    } finally {
      setActionLoading(false)
    }
  }

  const handleComplete = async () => {
    const priceNum = completePrice ? parseFloat(completePrice) : undefined
    if (completePrice && (isNaN(priceNum as number) || (priceNum as number) < 0)) {
      toast({ title: 'Invalid price', description: 'Enter a valid amount in ₹' })
      return
    }
    setShowCompleteDialog(false)
    await updateStatus('completed', {
      ...(priceNum ? { price: priceNum } : {}),
    })
    setCompletePrice('')
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
      toast({ title: 'Error', description: cleanError(err) })
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
        <button
          onClick={() => {
            // Role-aware back button with ROLE-SPECIFIC valid back-targets.
            // Providers never get sent back to the client 'home' screen (and vice
            // versa). This fixes the bug where a provider who had previously
            // visited 'home' would land on the client home when tapping back from
            // Booking Detail.
            const { previousViews } = useAppStore.getState()
            const lastView = previousViews[previousViews.length - 1]
            const isProvider = user?.role === 'provider'
            const providerBackTargets = ['my-bookings', 'provider-dashboard', 'chat-list', 'chat-room', 'notifications']
            const clientBackTargets = ['my-bookings', 'home', 'chat-list', 'chat-room', 'notifications']
            const validBackTargets = isProvider ? providerBackTargets : clientBackTargets
            if (lastView && validBackTargets.includes(lastView)) {
              goBack()
            } else {
              navigate(isProvider ? 'provider-dashboard' : 'my-bookings')
            }
          }}
          className="text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">Booking Details</h1>
        <div className="flex-1" />
        <Badge className={`${statusColors[booking.status] || ''} border-0 text-xs`}>
          {booking.status.replace('_', ' ')}
        </Badge>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto pb-32">
        {/* Provider Alert Banner — prompts the provider about the very next action they must take.
            This is critical because ratings depend on the booking being marked complete.
            Placed at the TOP so the provider sees it before scrolling. */}
        {!isClient && booking.status !== 'cancelled' && booking.status !== 'completed' && (
          <div className={`rounded-xl p-3 flex items-start gap-3 shadow-sm border ${
            booking.status === 'pending'
              ? 'bg-amber-50 border-amber-200'
              : booking.status === 'accepted'
              ? 'bg-blue-50 border-blue-200'
              : 'bg-green-50 border-green-200'
          }`}>
            <AlertCircle className={`h-5 w-5 mt-0.5 shrink-0 ${
              booking.status === 'pending' ? 'text-amber-600' :
              booking.status === 'accepted' ? 'text-blue-600' :
              'text-green-600'
            }`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold ${
                booking.status === 'pending' ? 'text-amber-800' :
                booking.status === 'accepted' ? 'text-blue-800' :
                'text-green-800'
              }`}>
                {booking.status === 'pending' && 'New booking request — respond now'}
                {booking.status === 'accepted' && 'Accept ✓ done — Start the service'}
                {booking.status === 'in_progress' && 'Service in progress — Mark complete to get rated'}
              </p>
              <p className={`text-xs mt-0.5 ${
                booking.status === 'pending' ? 'text-amber-700' :
                booking.status === 'accepted' ? 'text-blue-700' :
                'text-green-700'
              }`}>
                {booking.status === 'pending' && 'Tap Accept or Reject below to respond to the client.'}
                {booking.status === 'accepted' && 'Tap “Start Service” below when you begin the work.'}
                {booking.status === 'in_progress' && 'Tap “Mark Complete” below when done — the client can then rate you.'}
              </p>
            </div>
          </div>
        )}

        {/* Completed-without-review nudge for provider — ratings are important for them too */}
        {!isClient && booking.status === 'completed' && !booking.review && (
          <div className="rounded-xl p-3 flex items-start gap-3 shadow-sm border bg-amber-50 border-amber-200">
            <Star className="h-5 w-5 mt-0.5 shrink-0 text-amber-600" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-800">Rate this client</p>
              <p className="text-xs mt-0.5 text-amber-700">Help other providers — tap “Rate Client” below to leave a quick review.</p>
            </div>
          </div>
        )}

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

          {/* Book Again — one-tap re-booking of the same provider+service.
              Shown only after completion (the repeat-business moment).
              'Share Provider' was removed per user request — it added clutter
              without enough value for a Manipur-local marketplace. */}
          {isClient && booking.status === 'completed' && (
            <button
              onClick={() =>
                navigate('booking-form', {
                  providerId: booking.providerId,
                  providerName: booking.provider?.name || 'Provider',
                  service: booking.service,
                })
              }
              className="mt-4 w-full flex items-center justify-center gap-2 sintha-btn-filled py-2.5 text-sm font-semibold"
            >
              <RotateCcw className="h-4 w-4" />
              Book Again
            </button>
          )}
        </div>

        {/* Cancel reason + who cancelled — shown when booking is cancelled */}
        {booking.status === 'cancelled' && (booking.cancelReason || booking.cancelledBy) && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800">
                  Cancelled by {booking.cancelledBy === 'client' ? 'client' : booking.cancelledBy === 'provider' ? 'provider' : 'a party'}
                </p>
                {booking.cancelReason && (
                  <p className="text-sm text-red-700 mt-1">
                    <span className="font-medium">Reason:</span> {booking.cancelReason}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Reschedule history — shown when booking has been rescheduled */}
        {booking.rescheduledFrom && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-3">
            <Calendar className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-blue-800">Rescheduled</p>
              {(() => {
                try {
                  const prev = JSON.parse(booking.rescheduledFrom)
                  const prevDate = new Date(prev.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  return (
                    <p className="text-[11px] text-blue-700 mt-0.5">
                      Previously: {prevDate}{prev.time ? ` at ${prev.time}` : ''}
                    </p>
                  )
                } catch {
                  return null
                }
              })()}
            </div>
          </div>
        )}

        {/* Service price — shown when booking is completed with a price */}
        {booking.status === 'completed' && typeof booking.price === 'number' && booking.price > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-green-700">Service amount</p>
              <p className="text-2xl font-bold text-green-800 mt-0.5">₹{booking.price}</p>
            </div>
            <p className="text-[10px] text-green-600 max-w-[50%]">
              Pay the provider directly via cash/UPI. SINTHA takes 0% commission.
            </p>
          </div>
        )}

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
                    // Use <a> tag with target=_blank — Capacitor opens this in the
                    // system browser (not the WebView). The system browser handles
                    // the wa.me → WhatsApp redirect correctly.
                    const anchor = document.createElement('a')
                    anchor.href = `https://wa.me/${fullNumber}?text=${msg}`
                    anchor.target = '_blank'
                    anchor.rel = 'noopener noreferrer'
                    anchor.style.position = 'fixed'
                    anchor.style.top = '0'
                    anchor.style.left = '0'
                    anchor.style.opacity = '0'
                    document.body.appendChild(anchor)
                    anchor.click()
                    setTimeout(() => { if (anchor.parentNode) anchor.parentNode.removeChild(anchor) }, 200)
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

      {/* Sticky bottom action bar — provider never needs to scroll to take the next action.
          This is the most important UX change: Accept / Start / Mark Complete / Rate are all reachable
          from a persistent bar pinned to the bottom of the viewport.
          Ratings depend on the booking being marked complete, so “Mark Complete” is the highest-stakes button. */}
      {(() => {
        // Determine which (if any) primary action the current viewer should be able to take.
        const showProviderPending = !isClient && booking.status === 'pending'
        const showProviderStart = !isClient && booking.status === 'accepted'
        const showProviderComplete = !isClient && booking.status === 'in_progress'
        const showClientCancel = isClient && booking.status === 'accepted'
        const showClientReview = isClient && booking.status === 'completed' && !booking.review
        const showProviderReview = !isClient && booking.status === 'completed' && !booking.review

        if (!showProviderPending && !showProviderStart && !showProviderComplete && !showClientCancel && !showClientReview && !showProviderReview) {
          return null
        }

        return (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] safe-area-bottom">
            <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-2">
              {/* Provider: pending → Accept + Reject (with reason) */}
              {showProviderPending && (
                <>
                  <Button
                    className="flex-1 sintha-gradient text-white"
                    onClick={() => updateStatus('accepted')}
                    disabled={actionLoading}
                  >
                    <CheckCircle className="h-4 w-4 mr-1.5" /> Accept
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => setShowCancelDialog(true)}
                    disabled={actionLoading}
                  >
                    <XCircle className="h-4 w-4 mr-1.5" /> Reject
                  </Button>
                </>
              )}

              {/* Provider: accepted → Start Service + Reschedule */}
              {showProviderStart && (
                <>
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => updateStatus('in_progress')}
                    disabled={actionLoading}
                  >
                    <Play className="h-4 w-4 mr-1.5" /> Start Service
                  </Button>
                  <Button
                    variant="outline"
                    className="border-blue-200 text-blue-600 hover:bg-blue-50"
                    onClick={() => setShowReschedule(true)}
                    disabled={actionLoading}
                  >
                    <Calendar className="h-4 w-4 mr-1.5" /> Reschedule
                  </Button>
                </>
              )}

              {/* Provider: in_progress → Mark Complete (with price + photos prompt) */}
              {showProviderComplete && (
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => setShowCompleteDialog(true)}
                  disabled={actionLoading}
                >
                  <CheckCircle className="h-4 w-4 mr-1.5" /> Mark Complete & Get Rated
                </Button>
              )}

              {/* Client: accepted → Reschedule + Cancel (with reason) */}
              {showClientCancel && (
                <>
                  <Button
                    variant="outline"
                    className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50"
                    onClick={() => setShowReschedule(true)}
                    disabled={actionLoading}
                  >
                    <Calendar className="h-4 w-4 mr-1.5" /> Reschedule
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => setShowCancelDialog(true)}
                    disabled={actionLoading}
                  >
                    <XCircle className="h-4 w-4 mr-1.5" /> Cancel
                  </Button>
                </>
              )}

              {/* Completed + no review → Rate (both roles) */}
              {(showClientReview || showProviderReview) && (
                <Button
                  className="flex-1 sintha-gradient text-white"
                  onClick={() => setShowReview(true)}
                >
                  <Star className="h-4 w-4 mr-1.5" /> {isClient ? 'Rate Provider' : 'Rate Client'}
                </Button>
              )}
            </div>
          </div>
        )
      })()}

      {/* ── Cancel-with-reason dialog ─────────────────────────────────── */}
      {showCancelDialog && booking && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">
                {isClient ? 'Cancel booking?' : 'Reject booking?'}
              </h3>
              <button
                onClick={() => { setShowCancelDialog(false); setCancelReason('') }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600">
              Please choose a reason so the other party understands. They will be notified immediately.
            </p>
            <div className="space-y-2">
              {[
                'Schedule conflict',
                'No longer needed',
                'Provider unavailable',
                'Found another provider',
                'Emergency came up',
                'Other',
              ].map((reason) => {
                const isSelected = cancelReason === reason
                return (
                  <button
                    key={reason}
                    onClick={() => setCancelReason(reason)}
                    className={
                      isSelected
                        ? 'w-full text-left px-3 py-2.5 rounded-lg border text-sm border-blue-500 bg-blue-50 text-blue-700 font-medium'
                        : 'w-full text-left px-3 py-2.5 rounded-lg border text-sm border-gray-200 text-gray-700 hover:bg-gray-50'
                    }
                  >
                    {reason}
                  </button>
                )
              })}
            </div>
            {cancelReason === 'Other' && (
              <input
                type="text"
                placeholder="Tell us more..."
                value={cancelReason === 'Other' ? '' : cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            )}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setShowCancelDialog(false); setCancelReason('') }}
                disabled={actionLoading}
              >
                Keep booking
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleCancel}
                disabled={actionLoading || !cancelReason.trim()}
              >
                {actionLoading ? 'Cancelling...' : 'Confirm cancel'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reschedule dialog ─────────────────────────────────────────── */}
      {showReschedule && booking && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">Reschedule booking</h3>
              <button
                onClick={() => { setShowReschedule(false); setNewDate(''); setNewTime('') }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600">
              Pick a new date and time. The other party will be notified of the new schedule.
            </p>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">New date *</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">New time (optional)</label>
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setShowReschedule(false); setNewDate(''); setNewTime('') }}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 sintha-gradient text-white"
                onClick={handleReschedule}
                disabled={actionLoading || !newDate}
              >
                {actionLoading ? 'Rescheduling...' : 'Confirm reschedule'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mark-complete dialog (with price input) ───────────────────── */}
      {showCompleteDialog && booking && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">Mark service complete?</h3>
              <button
                onClick={() => { setShowCompleteDialog(false); setCompletePrice('') }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600">
              The client will be notified and can rate you. Enter the final agreed amount so it appears in your earnings.
            </p>
            <div>
              <label className="text-xs font-medium text-gray-600">Final amount (₹) — optional</label>
              <input
                type="number"
                inputMode="decimal"
                placeholder="e.g. 500"
                value={completePrice}
                onChange={(e) => setCompletePrice(e.target.value)}
                className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Leave blank if no money changed hands or you prefer not to share.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setShowCompleteDialog(false); setCompletePrice('') }}
                disabled={actionLoading}
              >
                Not yet
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                onClick={handleComplete}
                disabled={actionLoading}
              >
                {actionLoading ? 'Completing...' : 'Mark complete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
