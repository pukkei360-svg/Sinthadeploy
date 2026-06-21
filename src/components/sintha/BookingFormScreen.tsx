'use client'

import { useState } from 'react'
import { useAppStore, type Booking } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Calendar, Clock, MapPin, FileText, CheckCircle, MessageCircle, Copy, Phone, Share2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { dialPhone, normalizePhoneNumber, getDigitsOnly } from '@/lib/phone'
import WhatsAppIcon from './WhatsAppIcon'
import { cleanError } from '@/lib/clean-error'

export default function BookingFormScreen() {
  const { navigate, viewParams, user, addBooking } = useAppStore()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null)

  const providerId = viewParams?.providerId
  const providerName = viewParams?.providerName || 'Provider'
  const service = viewParams?.service || ''

  const [serviceField, setServiceField] = useState(service)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')

  const handleSubmit = async () => {
    if (!serviceField || !date) {
      toast({ title: 'Error', description: 'Service and date are required' })
      return
    }
    if (!user) {
      toast({ title: 'Error', description: 'Please login first' })
      return
    }

    setLoading(true)
    try {
      const data = await apiFetch('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          clientId: user.id,
          providerId: providerId,
          service: serviceField,
          description,
          date,
          time,
          address,
        }),
      })
      addBooking(data.booking)
      setCreatedBooking(data.booking)
      setSuccess(true)
      toast({ title: 'Booking Confirmed!', description: 'Your booking has been auto-confirmed.' })
    } catch (err: unknown) {
      toast({ title: 'Booking Failed', description: cleanError(err) })
    } finally {
      setLoading(false)
    }
  }

  if (success && createdBooking) {
    const providerPhone = createdBooking.provider?.phone
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Booking Confirmed!</h2>
        <p className="text-gray-500 text-center mb-6">
          Your booking with {providerName} has been auto-confirmed.
        </p>

        {/* Provider Contact Card */}
        <Card className="w-full max-w-sm border-0 shadow-lg mb-6">
          <CardContent className="p-5">
            <h3 className="font-semibold text-gray-800 mb-3">Contact Provider</h3>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full sintha-gradient flex items-center justify-center text-white font-bold text-lg">
                {providerName[0]}
              </div>
              <div>
                <p className="font-semibold text-gray-800">{providerName}</p>
                <p className="text-xs text-green-600 font-medium">Booking Confirmed</p>
              </div>
            </div>
            {providerPhone && (
              <div className="space-y-2">
                {/* Phone number display */}
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Provider Phone Number</p>
                  <p className="text-lg font-bold text-gray-800 tracking-wide text-center">{providerPhone}</p>
                </div>
                {/* Call button — opens dialer, falls back to copy if dialer not available */}
                <button
                  onClick={async () => {
                    const result = await dialPhone(providerPhone)
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
                {/* WhatsApp button — proper WhatsApp logo on green background */}
                <button
                  onClick={() => {
                    const cleaned = getDigitsOnly(providerPhone)
                    const fullNumber = `91${cleaned}`
                    const msg = encodeURIComponent(`Hi ${providerName}, I booked your service on SINTHA.`)
                    // Use anchor tag click so WebViewInterceptor catches the wa.me link
                    const anchor = document.createElement('a')
                    anchor.href = `https://wa.me/${fullNumber}?text=${msg}`
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
                    const cleaned = normalizePhoneNumber(providerPhone)
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
            {!providerPhone && (
              <p className="text-sm text-gray-400">Provider has not shared their phone number yet.</p>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3 w-full max-w-sm">
          <Button
            variant="outline"
            className="flex-1 py-5"
            onClick={() => navigate('my-bookings')}
          >
            My Bookings
          </Button>
          <Button
            className="flex-1 sintha-gradient text-white py-5"
            onClick={() => navigate('home')}
          >
            Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate('home')} className="text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">Book Service</h1>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
        {/* Provider Info */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full sintha-gradient flex items-center justify-center text-white font-bold">
              {providerName[0]}
            </div>
            <div>
              <p className="font-semibold text-gray-800">{providerName}</p>
              <p className="text-xs text-gray-500">{service}</p>
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="service">Service</Label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="service"
                placeholder="e.g., Electrical Wiring"
                className="pl-10"
                value={serviceField}
                onChange={(e) => setServiceField(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="date"
                  type="date"
                  className="pl-10"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="time"
                  type="time"
                  className="pl-10"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="address"
                placeholder="Your address"
                className="pl-10"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Notes / Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what you need..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <Button
            className="w-full sintha-gradient text-white py-6 font-semibold text-base"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Submit Booking'}
          </Button>
        </div>
      </div>
    </div>
  )
}
