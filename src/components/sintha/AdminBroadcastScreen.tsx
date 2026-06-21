'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Megaphone, Loader2, CheckCircle, Users } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cleanError } from '@/lib/clean-error'

const AUDIENCE_OPTIONS = [
  { id: 'all', label: 'All Users', desc: 'Everyone on SINTHA' },
  { id: 'client', label: 'Clients Only', desc: 'Users looking for services' },
  { id: 'provider', label: 'Providers Only', desc: 'Service providers' },
  { id: 'admin', label: 'Admins Only', desc: 'Admin team members' },
]

export default function AdminBroadcastScreen() {
  const { navigate, user } = useAppStore()
  const { toast } = useToast()

  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [audience, setAudience] = useState('all')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; pushSent: number; message: string } | null>(null)

  const handleSend = async () => {
    if (!user) return
    if (title.trim().length < 3) {
      toast({ title: 'Title too short', description: 'At least 3 characters' })
      return
    }
    if (message.trim().length < 5) {
      toast({ title: 'Message too short', description: 'At least 5 characters' })
      return
    }

    setSending(true)
    setResult(null)
    try {
      const data = await apiFetch('/admin/broadcast', {
        method: 'POST',
        body: JSON.stringify({
          adminId: user.id,
          title: title.trim(),
          message: message.trim(),
          targetRole: audience,
        }),
      })

      setResult({
        sent: data.sent,
        pushSent: data.pushSent,
        message: data.message,
      })

      toast({
        title: 'Broadcast sent!',
        description: data.message,
      })

      // Clear the form
      setTitle('')
      setMessage('')
    } catch (err) {
      toast({ title: 'Broadcast failed', description: cleanError(err) })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate('admin-dashboard')} className="text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">Broadcast Message</h1>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
          <Megaphone className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            Send a push notification + in-app message to a group of users. Useful for announcements, updates, or maintenance alerts.
          </p>
        </div>

        {/* Result banner (shown after sending) */}
        {result && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-green-800">Broadcast sent!</p>
              <p className="text-xs text-green-700 mt-0.5">{result.message}</p>
            </div>
          </div>
        )}

        {/* Audience selector */}
        <div>
          <label className="text-sm font-semibold text-gray-800 block mb-2 flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> Send To
          </label>
          <div className="grid grid-cols-2 gap-2">
            {AUDIENCE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setAudience(opt.id)}
                className={`p-3 rounded-xl border text-center transition-colors ${
                  audience === opt.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <p className="text-xs font-semibold text-gray-800">{opt.label}</p>
                <p className="text-[9px] text-gray-500 mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-sm font-semibold text-gray-800 block mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="e.g. SINTHA now supports GPay!"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            disabled={sending}
          />
          <p className="text-[10px] text-gray-400 mt-1">{title.length}/100</p>
        </div>

        {/* Message */}
        <div>
          <label className="text-sm font-semibold text-gray-800 block mb-2">
            Message <span className="text-red-500">*</span>
          </label>
          <textarea
            placeholder="e.g. Great news! You can now pay for SINTHA PRO using GPay, PhonePe, or any UPI app. Try it today!"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={500}
            rows={5}
            disabled={sending}
            className="w-full p-3 border border-gray-200 rounded-xl bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <p className="text-[10px] text-gray-400 mt-1">{message.length}/500</p>
        </div>

        {/* Preview */}
        {title.trim() && message.trim() && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-3">
              <p className="text-[10px] font-semibold text-blue-700 uppercase mb-1">Preview</p>
              <p className="text-sm font-bold text-gray-800">{title.trim()}</p>
              <p className="text-xs text-gray-600 mt-0.5">{message.trim()}</p>
            </CardContent>
          </Card>
        )}

        {/* Send button */}
        <Button
          className="w-full sintha-gradient text-white py-5 font-bold"
          onClick={handleSend}
          disabled={sending || !title.trim() || !message.trim()}
        >
          {sending ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending Broadcast...</>
          ) : (
            <><Megaphone className="h-4 w-4 mr-2" /> Send Broadcast</>
          )}
        </Button>

        <p className="text-[10px] text-center text-gray-400">
          This sends a push notification + bell-icon notification to all selected users.
        </p>
      </div>
    </div>
  )
}
