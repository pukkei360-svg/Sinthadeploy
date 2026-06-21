'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Flag, Loader2, AlertTriangle } from 'lucide-react'
import { cleanError } from '@/lib/clean-error'

// Must match the backend valid types/severities
const CLAIM_TYPES = [
  { id: 'fraud', label: 'Fraud / Scam', desc: 'Asked for advance payment and disappeared, fake services' },
  { id: 'misconduct', label: 'Misconduct', desc: 'Inappropriate behavior, harassment, abuse' },
  { id: 'no_show', label: 'No-Show', desc: 'Did not show up for the booked appointment' },
  { id: 'quality', label: 'Poor Quality', desc: 'Service was significantly below what was promised' },
  { id: 'payment', label: 'Payment Dispute', desc: 'Overcharged, hidden fees, payment-related issues' },
  { id: 'abuse', label: 'Abusive Language', desc: 'Used abusive/threatening language' },
  { id: 'other', label: 'Other', desc: 'Something else (describe in detail below)' },
]

const SEVERITIES = [
  { id: 'low', label: 'Low', color: 'text-green-600 bg-green-50 border-green-200' },
  { id: 'medium', label: 'Medium', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { id: 'high', label: 'High', color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { id: 'critical', label: 'Critical', color: 'text-red-600 bg-red-50 border-red-200' },
]

export default function ReportProviderScreen() {
  const { navigate, user, viewParams } = useAppStore()
  const { toast } = useToast()

  const subjectId = viewParams.subjectId || viewParams.providerId || ''
  const subjectName = viewParams.subjectName || viewParams.providerName || 'this provider'
  const bookingId = viewParams.bookingId || ''

  const [type, setType] = useState<string>('')
  const [severity, setSeverity] = useState<string>('medium')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: 'Please log in', description: 'You must be logged in to file a report' })
      return
    }
    if (!subjectId) {
      toast({ title: 'Error', description: 'No provider selected to report' })
      return
    }
    if (!type) {
      toast({ title: 'Select a type', description: 'Please choose what kind of issue this is' })
      return
    }
    if (!title.trim()) {
      toast({ title: 'Title required', description: 'Please add a short title for your report' })
      return
    }
    if (description.trim().length < 20) {
      toast({
        title: 'More detail needed',
        description: 'Please describe what happened in at least 20 characters',
      })
      return
    }

    setSubmitting(true)
    try {
      await apiFetch('/claims', {
        method: 'POST',
        body: JSON.stringify({
          reporterId: user.id,
          subjectId,
          bookingId: bookingId || undefined,
          type,
          severity,
          title: title.trim(),
          description: description.trim(),
        }),
      })
      toast({
        title: 'Report submitted',
        description: 'Our admin team will review this report and take appropriate action.',
      })
      navigate('home')
    } catch (err) {
      toast({
        title: 'Failed to submit',
        description: cleanError(err),
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate('home')} className="text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">Report Provider</h1>
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* Subject info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2">
          <Flag className="h-4 w-4 text-blue-600 shrink-0" />
          <p className="text-xs text-blue-800">
            Reporting: <strong>{subjectName}</strong>
          </p>
        </div>

        {/* Warning */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            False reports may result in action against your own account. Please only
            report genuine issues you have personally experienced.
          </p>
        </div>

        {/* Type */}
        <div>
          <label className="text-sm font-semibold text-gray-800 block mb-2">
            What happened? <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {CLAIM_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id)}
                className={`w-full text-left p-3 rounded-xl border transition-colors ${
                  type === t.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <p className="text-sm font-semibold text-gray-800">{t.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Severity */}
        <div>
          <label className="text-sm font-semibold text-gray-800 block mb-2">
            How serious is this?
          </label>
          <div className="grid grid-cols-4 gap-2">
            {SEVERITIES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSeverity(s.id)}
                className={`p-2 rounded-lg border text-xs font-semibold transition-colors ${
                  severity === s.id
                    ? s.color + ' border-current'
                    : 'border-gray-200 bg-white text-gray-500'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-sm font-semibold text-gray-800 block mb-2">
            Short title <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="e.g. Took advance payment and never showed up"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
          />
          <p className="text-[10px] text-gray-400 mt-1">{title.length}/100</p>
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-semibold text-gray-800 block mb-2">
            Describe what happened <span className="text-red-500">*</span>
          </label>
          <textarea
            placeholder="Please provide as much detail as possible — dates, what was agreed, what went wrong, any evidence you have (screenshots, chat logs, etc.)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            rows={6}
            className="w-full p-3 border border-gray-200 rounded-xl bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <p className="text-[10px] text-gray-400 mt-1">{description.length}/2000</p>
        </div>

        {/* Submit */}
        <Button
          className="w-full sintha-gradient text-white py-5 font-bold"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</>
          ) : (
            <><Flag className="h-4 w-4 mr-2" /> Submit Report</>
          )}
        </Button>

        <p className="text-[10px] text-center text-gray-400">
          Your report is confidential. The provider will not see who reported them.
        </p>
      </div>
    </div>
  )
}
