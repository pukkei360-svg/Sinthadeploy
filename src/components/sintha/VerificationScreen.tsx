'use client'

import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { uploadVerificationPhoto } from '@/lib/cloudinary'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft, Upload, CheckCircle, Clock, XCircle, FileText, Camera,
  User, Loader2, ShieldCheck, Lock
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ExistingVerification {
  id: string
  status: string
  fullNameAsPerAadhaar?: string
  aadhaarPhotoUrl?: string
  aadhaarBackPhotoUrl?: string
  passportPhotoUrl?: string
  reviewNote?: string
  createdAt: string
}

export default function VerificationScreen() {
  const { navigate, user } = useAppStore()
  const { toast } = useToast()

  // Form state
  const [fullName, setFullName] = useState('')
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null)
  const [aadhaarPreview, setAadhaarPreview] = useState<string | null>(null)
  const [aadhaarBackFile, setAadhaarBackFile] = useState<File | null>(null)
  const [aadhaarBackPreview, setAadhaarBackPreview] = useState<string | null>(null)
  const [passportFile, setPassportFile] = useState<File | null>(null)
  const [passportPreview, setPassportPreview] = useState<string | null>(null)

  // Upload state
  const [uploadingField, setUploadingField] = useState<'aadhaar' | 'aadhaarBack' | 'passport' | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Existing verification (if user already submitted)
  const [existing, setExisting] = useState<ExistingVerification | null>(null)
  const [loadingExisting, setLoadingExisting] = useState(true)

  const aadhaarInputRef = useRef<HTMLInputElement>(null)
  const aadhaarBackInputRef = useRef<HTMLInputElement>(null)
  const passportInputRef = useRef<HTMLInputElement>(null)

  // Load existing verification status on mount
  useEffect(() => {
    if (!user) return
    const loadExisting = async () => {
      try {
        const data = await apiFetch(`/verification?userId=${user.id}`)
        const userVerifications = data.verifications || []
        // Find the most recent identity verification
        const identityVerif = userVerifications.find(
          (v: ExistingVerification) => v.fullNameAsPerAadhaar || v.aadhaarPhotoUrl
        )
        if (identityVerif) {
          setExisting(identityVerif)
          // Pre-fill the name field if they're re-submitting
          if (identityVerif.fullNameAsPerAadhaar) {
            setFullName(identityVerif.fullNameAsPerAadhaar)
          }
        }
      } catch {
        // Ignore — user can still submit fresh
      } finally {
        setLoadingExisting(false)
      }
    }
    loadExisting()
  }, [user])

  const handleAadhaarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please select an image file (JPG, PNG)', variant: 'destructive' })
      return
    }
    setAadhaarFile(file)
    setAadhaarPreview(URL.createObjectURL(file))
    toast({ title: 'Aadhaar front photo selected', description: 'Tap Submit to upload' })
  }

  const handleAadhaarBackSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please select an image file (JPG, PNG)', variant: 'destructive' })
      return
    }
    setAadhaarBackFile(file)
    setAadhaarBackPreview(URL.createObjectURL(file))
    toast({ title: 'Aadhaar back photo selected', description: 'Tap Submit to upload' })
  }

  const handlePassportSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please select an image file (JPG, PNG)', variant: 'destructive' })
      return
    }
    setPassportFile(file)
    setPassportPreview(URL.createObjectURL(file))
    toast({ title: 'Passport photo selected', description: 'Tap Submit to upload' })
  }

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: 'Please log in', variant: 'destructive' })
      return
    }
    if (!fullName.trim() || fullName.trim().length < 2) {
      toast({ title: 'Name required', description: 'Enter your full name as per Aadhaar', variant: 'destructive' })
      return
    }
    if (!aadhaarFile && !aadhaarPreview) {
      toast({ title: 'Aadhaar front photo required', variant: 'destructive' })
      return
    }
    if (!passportFile && !passportPreview) {
      toast({ title: 'Passport photo required', variant: 'destructive' })
      return
    }

    setSubmitting(true)

    let aadhaarUrl: string | null = null
    let aadhaarBackUrl: string | null = null
    let passportUrl: string | null = null

    try {
      // Step 1: Upload Aadhaar FRONT photo
      if (aadhaarFile) {
        setUploadingField('aadhaar')
        const aadhaarResult = await uploadVerificationPhoto(aadhaarFile, 'verifications/aadhaar')
        if (!aadhaarResult.success || !aadhaarResult.url) {
          throw new Error(aadhaarResult.error || 'Failed to upload Aadhaar front photo')
        }
        aadhaarUrl = aadhaarResult.url
      } else if (existing?.aadhaarPhotoUrl) {
        aadhaarUrl = existing.aadhaarPhotoUrl
      }

      // Step 2: Upload Aadhaar BACK photo (optional)
      if (aadhaarBackFile) {
        setUploadingField('aadhaarBack')
        const aadhaarBackResult = await uploadVerificationPhoto(aadhaarBackFile, 'verifications/aadhaar')
        if (!aadhaarBackResult.success || !aadhaarBackResult.url) {
          throw new Error(aadhaarBackResult.error || 'Failed to upload Aadhaar back photo')
        }
        aadhaarBackUrl = aadhaarBackResult.url
      } else if (existing?.aadhaarBackPhotoUrl) {
        aadhaarBackUrl = existing.aadhaarBackPhotoUrl
      }

      // Step 3: Upload passport photo
      if (passportFile) {
        setUploadingField('passport')
        const passportResult = await uploadVerificationPhoto(passportFile, 'verifications/passport')
        if (!passportResult.success || !passportResult.url) {
          throw new Error(passportResult.error || 'Failed to upload passport photo')
        }
        passportUrl = passportResult.url
      } else if (existing?.passportPhotoUrl) {
        passportUrl = existing.passportPhotoUrl
      }

      setUploadingField(null)

      // Step 4: Submit to backend
      const data = await apiFetch('/verification', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          fullNameAsPerAadhaar: fullName.trim(),
          aadhaarPhotoUrl: aadhaarUrl,
          aadhaarBackPhotoUrl: aadhaarBackUrl,
          passportPhotoUrl: passportUrl,
        }),
      })

      toast({
        title: 'Verification submitted!',
        description: 'Our admin team will review your documents within 24-48 hours.',
      })

      // Update existing state — form will now be locked
      setExisting({
        id: data.verification.id,
        status: 'pending',
        fullNameAsPerAadhaar: fullName.trim(),
        aadhaarPhotoUrl: aadhaarUrl || undefined,
        aadhaarBackPhotoUrl: aadhaarBackUrl || undefined,
        passportPhotoUrl: passportUrl || undefined,
        createdAt: new Date().toISOString(),
      })

      // Clear file inputs (keep the name)
      setAadhaarFile(null)
      setAadhaarBackFile(null)
      setPassportFile(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Submission failed'
      toast({ title: 'Submission failed', description: msg, variant: 'destructive' })
    } finally {
      setUploadingField(null)
      setSubmitting(false)
    }
  }

  const isVerified = user?.isVerified
  const hasPending = existing?.status === 'pending'
  const hasRejected = existing?.status === 'rejected'
  // Form is locked when verification is under review (pending) or already verified.
  // User can only re-submit if their previous submission was REJECTED.
  const isFormLocked = isVerified || hasPending

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate('profile')} className="text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">Identity Verification</h1>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
        {/* Status Banner */}
        {loadingExisting ? (
          <div className="rounded-xl p-4 bg-gray-50 border border-gray-200 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : isVerified ? (
          <div className="rounded-xl p-4 bg-green-50 border border-green-200 text-center">
            <ShieldCheck className="h-10 w-10 text-green-500 mx-auto mb-2" />
            <h2 className="font-bold text-green-800">Verified!</h2>
            <p className="text-sm text-green-600">Your identity is verified. The green ✓ badge now appears on your profile.</p>
          </div>
        ) : hasPending ? (
          <div className="rounded-xl p-4 bg-blue-50 border border-blue-200 text-center">
            <Clock className="h-10 w-10 text-blue-500 mx-auto mb-2" />
            <h2 className="font-bold text-blue-800">Under Review</h2>
            <p className="text-sm text-blue-600">
              Your documents are being reviewed by our admin team. This typically takes 24-48 hours.
            </p>
            <p className="text-xs text-blue-500 mt-2">
              You cannot re-submit while your verification is under review.
            </p>
          </div>
        ) : hasRejected ? (
          <div className="rounded-xl p-4 bg-red-50 border border-red-200 text-center">
            <XCircle className="h-10 w-10 text-red-500 mx-auto mb-2" />
            <h2 className="font-bold text-red-800">Verification Rejected</h2>
            <p className="text-sm text-red-600">
              {existing?.reviewNote || 'Your verification was rejected. Please re-submit with correct documents.'}
            </p>
          </div>
        ) : (
          <div className="rounded-xl p-4 bg-amber-50 border border-amber-200 text-center">
            <ShieldCheck className="h-10 w-10 text-amber-500 mx-auto mb-2" />
            <h2 className="font-bold text-amber-800">Get Verified</h2>
            <p className="text-sm text-amber-600">
              Verify your identity to earn the green ✓ badge. Clients trust verified providers more.
            </p>
          </div>
        )}

        {/* Verification form — show if not verified AND not under review */}
        {!isFormLocked && (
          <>
            {/* What we need */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <h3 className="font-bold text-gray-800 text-sm mb-2">What you'll need:</h3>
                <ul className="text-xs text-gray-600 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                    <span>Your <strong>full name as per Aadhaar</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                    <span>Aadhaar card <strong>front side</strong> photo (has your name + photo) <span className="text-red-500">*</span></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                    <span>Aadhaar card <strong>back side</strong> photo (has your address) <span className="text-gray-400">(optional but recommended)</span></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                    <span>A <strong>passport-size photo</strong> <span className="text-red-500">*</span></span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Full Name */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 space-y-2">
                <label className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                  <User className="h-4 w-4 text-blue-600" />
                  Full Name (as per Aadhaar) <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Rajesh Kumar Singh"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={100}
                  disabled={submitting}
                />
                <p className="text-[10px] text-gray-400">
                  Enter your name exactly as it appears on your Aadhaar card.
                </p>
              </CardContent>
            </Card>

            {/* Aadhaar Front Photo Upload */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <label className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Aadhaar Card — Front Side <span className="text-red-500">*</span>
                </label>
                <input
                  ref={aadhaarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAadhaarSelect}
                  className="hidden"
                  disabled={submitting}
                />
                {aadhaarPreview ? (
                  <div className="relative">
                    <img src={aadhaarPreview} alt="Aadhaar front" className="w-full rounded-lg border border-gray-200 max-h-48 object-contain bg-gray-50" />
                    <button
                      onClick={() => { setAadhaarFile(null); setAadhaarPreview(null); if (aadhaarInputRef.current) aadhaarInputRef.current.value = '' }}
                      className="absolute top-2 right-2 bg-white rounded-full p-1 shadow hover:bg-gray-100"
                      disabled={submitting}
                    >
                      <XCircle className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => aadhaarInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors"
                    disabled={submitting}
                  >
                    <Upload className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 font-medium">Upload Aadhaar front side</p>
                    <p className="text-[10px] text-gray-400 mt-1">JPG or PNG · The side with your name + photo</p>
                  </button>
                )}
              </CardContent>
            </Card>

            {/* Aadhaar Back Photo Upload (optional) */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <label className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Aadhaar Card — Back Side
                  <span className="text-[10px] text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  ref={aadhaarBackInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAadhaarBackSelect}
                  className="hidden"
                  disabled={submitting}
                />
                {aadhaarBackPreview ? (
                  <div className="relative">
                    <img src={aadhaarBackPreview} alt="Aadhaar back" className="w-full rounded-lg border border-gray-200 max-h-48 object-contain bg-gray-50" />
                    <button
                      onClick={() => { setAadhaarBackFile(null); setAadhaarBackPreview(null); if (aadhaarBackInputRef.current) aadhaarBackInputRef.current.value = '' }}
                      className="absolute top-2 right-2 bg-white rounded-full p-1 shadow hover:bg-gray-100"
                      disabled={submitting}
                    >
                      <XCircle className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => aadhaarBackInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors"
                    disabled={submitting}
                  >
                    <Upload className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 font-medium">Upload Aadhaar back side</p>
                    <p className="text-[10px] text-gray-400 mt-1">The side with your address · Optional but recommended</p>
                  </button>
                )}
              </CardContent>
            </Card>

            {/* Passport Photo Upload */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <label className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                  <Camera className="h-4 w-4 text-blue-600" />
                  Passport-Size Photo <span className="text-red-500">*</span>
                </label>
                <input
                  ref={passportInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePassportSelect}
                  className="hidden"
                  disabled={submitting}
                />
                {passportPreview ? (
                  <div className="relative">
                    <img src={passportPreview} alt="Passport" className="w-full rounded-lg border border-gray-200 max-h-48 object-contain bg-gray-50" />
                    <button
                      onClick={() => { setPassportFile(null); setPassportPreview(null); if (passportInputRef.current) passportInputRef.current.value = '' }}
                      className="absolute top-2 right-2 bg-white rounded-full p-1 shadow hover:bg-gray-100"
                      disabled={submitting}
                    >
                      <XCircle className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => passportInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors"
                    disabled={submitting}
                  >
                    <Camera className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 font-medium">Upload passport photo</p>
                    <p className="text-[10px] text-gray-400 mt-1">Clear face photo</p>
                  </button>
                )}
              </CardContent>
            </Card>

            {/* Privacy note */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-[10px] text-gray-500 flex items-start gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5 text-gray-400" />
                <span>
                  Your documents are stored securely on Cloudinary and only visible to SINTHA admins for verification. They are never shared with clients or other providers.
                </span>
              </p>
            </div>

            {/* Submit button */}
            <Button
              className="w-full sintha-gradient text-white py-5 font-bold"
              onClick={handleSubmit}
              disabled={submitting || !fullName.trim() || (!aadhaarFile && !existing?.aadhaarPhotoUrl) || (!passportFile && !existing?.passportPhotoUrl)}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {uploadingField === 'aadhaar' ? 'Uploading Aadhaar front...' : uploadingField === 'aadhaarBack' ? 'Uploading Aadhaar back...' : uploadingField === 'passport' ? 'Uploading passport...' : 'Submitting...'}
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  {hasRejected ? 'Re-submit Verification' : 'Submit for Verification'}
                </>
              )}
            </Button>
          </>
        )}

        {/* Locked notice — shown when form is hidden because pending */}
        {hasPending && !isVerified && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-2">
                <Lock className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-blue-800 text-sm">Submission Locked</h3>
                  <p className="text-xs text-blue-700 mt-1">
                    You have a verification request under review. The upload form is locked until the admin
                    approves or rejects it. You'll be notified when the review is complete.
                  </p>
                </div>
              </div>

              {/* Show what was submitted */}
              {existing && (
                <div className="bg-white rounded-lg p-3 space-y-2 border border-blue-100">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase">Submitted Documents</p>
                  <div className="grid grid-cols-3 gap-2">
                    {existing.aadhaarPhotoUrl && (
                      <div>
                        <p className="text-[9px] text-gray-400 mb-1">Aadhaar Front</p>
                        <img src={existing.aadhaarPhotoUrl} alt="Aadhaar front" className="w-full h-20 object-cover rounded border border-gray-200" />
                      </div>
                    )}
                    {existing.aadhaarBackPhotoUrl && (
                      <div>
                        <p className="text-[9px] text-gray-400 mb-1">Aadhaar Back</p>
                        <img src={existing.aadhaarBackPhotoUrl} alt="Aadhaar back" className="w-full h-20 object-cover rounded border border-gray-200" />
                      </div>
                    )}
                    {existing.passportPhotoUrl && (
                      <div>
                        <p className="text-[9px] text-gray-400 mb-1">Passport</p>
                        <img src={existing.passportPhotoUrl} alt="Passport" className="w-full h-20 object-cover rounded border border-gray-200" />
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Submitted on {new Date(existing.createdAt).toLocaleDateString()}
                  </p>
                </div>
              )}

              <div className="bg-white border border-blue-100 rounded-lg p-3">
                <h3 className="font-bold text-blue-800 text-sm mb-2">What happens next?</h3>
                <ol className="text-xs text-blue-700 space-y-1.5 list-decimal list-inside">
                  <li>Our admin team reviews your documents</li>
                  <li>We compare your entered name with the name on your Aadhaar</li>
                  <li>We verify your passport photo shows a clear face</li>
                  <li>If approved, you get the green ✓ Verified badge within 24-48 hours</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
