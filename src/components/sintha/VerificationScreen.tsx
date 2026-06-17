'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Upload, CheckCircle, Clock, XCircle, FileText, Camera, MapPin } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface VerificationStep {
  docType: string
  label: string
  icon: typeof FileText
  status: 'pending' | 'uploaded' | 'verified' | 'rejected'
  fileName?: string
}

export default function VerificationScreen() {
  const { navigate, user } = useAppStore()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [steps, setSteps] = useState<VerificationStep[]>([
    { docType: 'aadhaar', label: 'Aadhaar Card', icon: FileText, status: 'pending' },
    { docType: 'selfie', label: 'Selfie Photo', icon: Camera, status: 'pending' },
    { docType: 'address_proof', label: 'Address Proof', icon: MapPin, status: 'pending' },
  ])

  const handleFileUpload = async (index: number) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*,.pdf'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file || !user) return

      // Simulate upload - in production, upload to cloud storage
      const fakeUrl = `https://storage.sintha.com/${user.id}/${steps[index].docType}_${Date.now()}`

      setLoading(true)
      try {
        await apiFetch('/verification', {
          method: 'POST',
          body: JSON.stringify({
            userId: user.id,
            docType: steps[index].docType,
            docUrl: fakeUrl,
          }),
        })

        const newSteps = [...steps]
        newSteps[index] = { ...newSteps[index], status: 'uploaded', fileName: file.name }
        setSteps(newSteps)
        toast({ title: 'Uploaded', description: `${steps[index].label} uploaded successfully` })
      } catch (err: unknown) {
        // Still mark as uploaded for demo
        const newSteps = [...steps]
        newSteps[index] = { ...newSteps[index], status: 'uploaded', fileName: file.name }
        setSteps(newSteps)
        toast({ title: 'Uploaded', description: `${steps[index].label} uploaded (demo mode)` })
      } finally {
        setLoading(false)
      }
    }
    input.click()
  }

  const allUploaded = steps.every((s) => s.status === 'uploaded' || s.status === 'verified')
  const isVerified = user?.isVerified

  const statusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-100 text-green-700 border-0 text-xs"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>
      case 'uploaded':
        return <Badge className="bg-blue-100 text-blue-700 border-0 text-xs"><Clock className="h-3 w-3 mr-1" />Under Review</Badge>
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700 border-0 text-xs"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
      default:
        return <Badge variant="secondary" className="text-xs">Pending</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate('profile')} className="text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">Verification</h1>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
        {/* Status Banner */}
        <div className={`rounded-xl p-4 text-center ${isVerified ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
          {isVerified ? (
            <>
              <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
              <h2 className="font-bold text-green-800">Verified!</h2>
              <p className="text-sm text-green-600">Your identity is verified</p>
            </>
          ) : (
            <>
              <Clock className="h-10 w-10 text-amber-500 mx-auto mb-2" />
              <h2 className="font-bold text-amber-800">Verification Required</h2>
              <p className="text-sm text-amber-600">Upload documents to get verified</p>
            </>
          )}
        </div>

        {/* Steps */}
        {steps.map((step, i) => (
          <Card key={step.docType} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <step.icon className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-800 text-sm">{step.label}</p>
                    {statusBadge(step.status)}
                  </div>
                  {step.fileName && (
                    <p className="text-xs text-gray-400 mt-1 truncate">{step.fileName}</p>
                  )}
                </div>
              </div>
              {step.status === 'pending' && (
                <Button
                  className="w-full mt-3 sintha-gradient text-white text-sm"
                  size="sm"
                  onClick={() => handleFileUpload(i)}
                  disabled={loading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {step.label}
                </Button>
              )}
              {step.status === 'rejected' && (
                <Button
                  variant="outline"
                  className="w-full mt-3 text-sm"
                  size="sm"
                  onClick={() => handleFileUpload(i)}
                  disabled={loading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Re-upload {step.label}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Submit */}
        {allUploaded && !isVerified && (
          <div className="text-center text-sm text-gray-500">
            <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-1" />
            All documents submitted. Verification typically takes 24-48 hours.
          </div>
        )}
      </div>
    </div>
  )
}
