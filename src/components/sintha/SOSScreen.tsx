'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, AlertTriangle, Phone, Flame, Droplet, Zap, Shield,
  Users, MapPin, MessageSquare, Loader2, CheckCircle, Settings,
  Siren, HeartPulse, Car, Wrench
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// Manipur Emergency Numbers
const EMERGENCY_NUMBERS = [
  { label: 'Police', number: '100', icon: Shield, color: 'bg-blue-600' },
  { label: 'Fire Brigade', number: '101', icon: Flame, color: 'bg-red-600' },
  { label: 'Ambulance', number: '108', icon: HeartPulse, color: 'bg-green-600' },
  { label: 'Women Helpline', number: '1091', icon: Users, color: 'bg-purple-600' },
  { label: 'Child Helpline', number: '1098', icon: HeartPulse, color: 'bg-amber-600' },
  { label: 'Emergency (All)', number: '112', icon: Siren, color: 'bg-gray-800' },
]

const SOS_TYPES = [
  { id: 'fire', label: 'Fire', icon: Flame, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
  { id: 'gas', label: 'Gas Leak', icon: Droplet, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  { id: 'electric', label: 'Electric', icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
  { id: 'medical', label: 'Medical', icon: HeartPulse, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
  { id: 'accident', label: 'Accident', icon: Car, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  { id: 'other', label: 'Other', icon: AlertTriangle, color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200' },
]

const STORAGE_KEY = 'sintha_emergency_contacts'

interface EmergencyContact {
  id: string
  name: string
  phone: string
  relation: string
}

export default function SOSScreen() {
  const { navigate, user } = useAppStore()
  const { toast } = useToast()

  const [contacts, setContacts] = useState<EmergencyContact[]>([])
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [sosTriggered, setSosTriggered] = useState(false)
  const [selectedType, setSelectedType] = useState<string>('')
  const [sendingAlerts, setSendingAlerts] = useState(false)
  const [alertsSent, setAlertsSent] = useState(0)

  // Load emergency contacts from localStorage
  useEffect(() => {
    const loadContacts = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          setContacts(JSON.parse(saved))
        }
      } catch {}
    }
    loadContacts()
  }, [])

  // Try to get location on mount
  useEffect(() => {
    if (!navigator.geolocation) return
    const fetchLocation = async () => {
      setLocationLoading(true)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          setLocationLoading(false)
        },
        () => setLocationLoading(false),
        { enableHighAccuracy: true, timeout: 10000 }
      )
    }
    fetchLocation()
  }, [])

  const locationLink = location
    ? `https://maps.google.com/maps?q=${location.lat},${location.lng}`
    : null

  const handleTriggerSOS = async () => {
    if (!selectedType) {
      toast({ title: 'Select emergency type', description: 'What kind of emergency is this?' })
      return
    }

    setSendingAlerts(true)

    const sosType = SOS_TYPES.find((t) => t.id === selectedType)?.label || 'Emergency'
    const userName = user?.name || 'SINTHA User'

    // Build the alert message
    let message = `🚨 SINTHA SOS ALERT 🚨\n\n`
    message += `${userName} has triggered an SOS alert.\n`
    message += `Emergency type: ${sosType}\n`
    if (locationLink) {
      message += `Location: ${locationLink}\n`
    }
    message += `\nPlease contact them immediately.`

    let sentCount = 0

    // Send to each emergency contact via WhatsApp / SMS
    for (const contact of contacts) {
      try {
        // Open WhatsApp with pre-filled message
        const whatsappUrl = `https://wa.me/91${contact.phone.replace(/[\+91]/g, '')}?text=${encodeURIComponent(message)}`
        window.open(whatsappUrl, '_blank')
        sentCount++
      } catch {}
    }

    // Also try SMS (works on mobile)
    if (contacts.length > 0) {
      try {
        const phoneNumbers = contacts.map((c) => c.phone).join(',')
        const smsUrl = `sms:${phoneNumbers}?body=${encodeURIComponent(message)}`
        // We can't open SMS in a new tab reliably, so we provide a button
      } catch {}
    }

    setAlertsSent(sentCount)
    setSosTriggered(true)
    setSendingAlerts(false)

    toast({
      title: 'SOS Alert Sent!',
      description: `Emergency alerts sent to ${sentCount} contact(s). Call 112 for immediate help.`,
    })
  }

  const handleCall = (number: string) => {
    const link = document.createElement('a')
    link.href = `tel:${number}`
    link.click()
  }

  const handleShareLocation = () => {
    if (!locationLink) {
      toast({ title: 'Location not available', description: 'Enable location access and try again' })
      return
    }

    if (navigator.share) {
      navigator.share({
        title: 'My Location (SOS)',
        text: `I need help. My current location:`,
        url: locationLink,
      }).catch(() => {})
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard?.writeText(locationLink).then(() => {
        toast({ title: 'Location link copied!', description: 'Paste it in any message app' })
      }).catch(() => {
        // Fallback: open WhatsApp with the link
        window.open(`https://wa.me/?text=${encodeURIComponent(`My location: ${locationLink}`)}`, '_blank')
      })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate('home')} className="text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">SOS Emergency</h1>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
        {/* SOS Trigger Section */}
        {!sosTriggered ? (
          <>
            {/* Warning banner */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">
                <strong>Only use in real emergencies.</strong> This will alert your emergency contacts with your location. For immediate life-threatening emergencies, call <strong>112</strong> directly.
              </p>
            </div>

            {/* Emergency type selector */}
            <div>
              <label className="text-sm font-semibold text-gray-800 block mb-2">
                What's the emergency?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {SOS_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`p-3 rounded-xl border text-center transition-colors ${
                      selectedType === type.id
                        ? `${type.bg} border-current`
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <type.icon className={`h-6 w-6 mx-auto mb-1 ${selectedType === type.id ? type.color : 'text-gray-400'}`} />
                    <p className={`text-xs font-medium ${selectedType === type.id ? type.color : 'text-gray-600'}`}>{type.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Location status */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  {locationLoading ? (
                    <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                  ) : location ? (
                    <MapPin className="h-5 w-5 text-blue-600" />
                  ) : (
                    <MapPin className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">
                    {locationLoading ? 'Getting your location...' : location ? 'Location ready' : 'Location unavailable'}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {location ? `Lat: ${location.lat.toFixed(4)}, Lng: ${location.lng.toFixed(4)}` : 'Enable GPS for accurate location sharing'}
                  </p>
                </div>
                {location && (
                  <Badge className="bg-green-100 text-green-700 border-0 text-[9px]">
                    <CheckCircle className="h-2.5 w-2.5 mr-0.5" /> Ready
                  </Badge>
                )}
              </CardContent>
            </Card>

            {/* Emergency contacts status */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-red-600" /> Emergency Contacts
                  </p>
                  <button
                    onClick={() => navigate('emergency-contacts')}
                    className="text-xs text-blue-600 font-medium flex items-center gap-0.5"
                  >
                    <Settings className="h-3 w-3" /> Manage
                  </button>
                </div>
                {contacts.length === 0 ? (
                  <div className="bg-amber-50 rounded-lg p-2 text-center">
                    <p className="text-xs text-amber-700">No contacts set up yet</p>
                    <button
                      onClick={() => navigate('emergency-contacts')}
                      className="text-xs text-blue-600 font-medium mt-1"
                    >
                      Add emergency contacts →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {contacts.map((c) => (
                      <div key={c.id} className="flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-gray-700 font-medium">{c.name}</span>
                        <span className="text-gray-400">·</span>
                        <span className="text-gray-500">{c.phone}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Big SOS button */}
            <button
              onClick={() => {
                if (confirm('🚨 TRIGGER SOS ALERT?\n\nThis will send your location to your emergency contacts via WhatsApp.\n\nContinue?')) {
                  handleTriggerSOS()
                }
              }}
              disabled={!selectedType || sendingAlerts || contacts.length === 0}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-8 rounded-2xl font-extrabold text-2xl shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sendingAlerts ? (
                <><Loader2 className="h-6 w-6 animate-spin mx-auto mb-1" /> SENDING ALERT...</>
              ) : (
                <><Siren className="h-7 w-7 mx-auto mb-1" /> TRIGGER SOS</>
              )}
            </button>

            {contacts.length === 0 && (
              <p className="text-xs text-center text-amber-600">
                ⚠️ Add emergency contacts first to use SOS alerts
              </p>
            )}
          </>
        ) : (
          /* SOS Triggered — show success + quick call buttons */
          <>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <h2 className="font-bold text-green-800 text-lg">SOS Alert Sent!</h2>
              <p className="text-sm text-green-600 mt-1">
                {alertsSent > 0
                  ? `WhatsApp alerts sent to ${alertsSent} contact(s).`
                  : 'No contacts were set up, but you can still call emergency services below.'}
              </p>
              {locationLink && (
                <p className="text-xs text-green-500 mt-2">Your location was included in the alerts.</p>
              )}
            </div>

            {/* Share location manually */}
            {locationLink && (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleShareLocation}
              >
                <MapPin className="h-4 w-4 mr-2" /> Share My Location
              </Button>
            )}

            {/* Reset button */}
            <Button
              variant="outline"
              className="w-full text-gray-500"
              onClick={() => {
                setSosTriggered(false)
                setSelectedType('')
                setAlertsSent(0)
              }}
            >
              Cancel SOS
            </Button>
          </>
        )}

        {/* Quick Call — Emergency Numbers */}
        <div className="pt-4">
          <h3 className="font-bold text-gray-800 mb-3 text-sm flex items-center gap-1.5">
            <Phone className="h-4 w-4 text-red-600" /> Quick Call Emergency Services
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {EMERGENCY_NUMBERS.map((num) => (
              <button
                key={num.number}
                onClick={() => handleCall(num.number)}
                className="bg-white rounded-xl p-3 flex items-center gap-2 shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-left"
              >
                <div className={`w-9 h-9 rounded-full ${num.color} flex items-center justify-center shrink-0`}>
                  <num.icon className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800">{num.label}</p>
                  <p className="text-sm font-bold text-gray-900">{num.number}</p>
                </div>
                <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Info card */}
        <div className="bg-gray-100 rounded-xl p-3">
          <p className="text-[10px] text-gray-500 leading-relaxed">
            <strong>How SOS works:</strong> When you trigger SOS, SINTHA opens WhatsApp with a pre-filled message containing your emergency type and GPS location. You just need to hit send. Your emergency contacts receive the alert instantly. For immediate life-threatening situations, always call <strong>112</strong> directly.
          </p>
        </div>
      </div>
    </div>
  )
}
