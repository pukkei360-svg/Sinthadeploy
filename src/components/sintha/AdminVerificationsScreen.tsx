'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft, CheckCircle, XCircle, Clock, User, FileText, Camera,
  ShieldCheck, AlertCircle, ExternalLink, Loader2
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface VerificationDoc {
  id: string
  docType: string
  docUrl: string
  status: string
  reviewNote?: string
  createdAt: string
  // Phase 1 identity verification fields
  fullNameAsPerAadhaar?: string
  aadhaarPhotoUrl?: string
  aadhaarBackPhotoUrl?: string
  passportPhotoUrl?: string
  faceDetected?: boolean
  user: {
    id: string
    name: string
    email: string
    photoUrl?: string
  }
}

export default function AdminVerificationsScreen() {
  const { navigate, user } = useAppStore()
  const { toast } = useToast()
  const [verifications, setVerifications] = useState<VerificationDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({})
  const [acting, setActing] = useState<string | null>(null)

  useEffect(() => {
    loadVerifications()
  }, [])

  const loadVerifications = async () => {
    setLoading(true)
    try {
      const data = await apiFetch('/verification?status=pending')
      setVerifications(data.verifications || [])
    } catch {
      toast({ title: 'Error', description: 'Failed to load verifications', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const reviewVerification = async (id: string, status: 'verified' | 'rejected') => {
    setActing(id)
    try {
      await apiFetch(`/verification/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status,
          reviewedBy: user?.id || 'admin',
          reviewNote: reviewNotes[id] || '',
        }),
      })
      setVerifications(verifications.filter((v) => v.id !== id))
      toast({
        title: status === 'verified' ? 'Approved' : 'Rejected',
        description: `Verification ${status}. User will be notified.`,
      })
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' })
    } finally {
      setActing(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white sticky top-0 z-40 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate('admin-dashboard')} className="text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">Verifications</h1>
        <Badge className="bg-amber-100 text-amber-700 border-0 text-xs ml-auto">
          {verifications.length} pending
        </Badge>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
        {loading ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)
        ) : verifications.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="h-10 w-10 text-green-400 mx-auto mb-2" />
            <p className="text-gray-400">No pending verifications</p>
            <p className="text-xs text-gray-300 mt-1">All caught up!</p>
          </div>
        ) : (
          verifications.map((v) => {
            // Determine if this is a Phase 1 identity verification (has the new fields)
            // vs a legacy verification (just docUrl + docType)
            const isIdentityVerification = !!v.fullNameAsPerAadhaar || !!v.aadhaarPhotoUrl

            return (
              <Card key={v.id} className="border-0 shadow-sm">
                <CardContent className="p-4 space-y-4">
                  {/* User info */}
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={v.user.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(v.user.name)}&background=2563eb&color=fff`} />
                      <AvatarFallback>{v.user.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">{v.user.name}</p>
                      <p className="text-xs text-gray-500">{v.user.email}</p>
                    </div>
                    <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(v.createdAt).toLocaleDateString()}
                    </Badge>
                  </div>

                  {/* Phase 1 identity verification display */}
                  {isIdentityVerification ? (
                    <div className="space-y-3">
                      {/* Entered name */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-[10px] font-semibold text-blue-700 uppercase mb-1 flex items-center gap-1">
                          <User className="h-3 w-3" /> Full Name (as per Aadhaar)
                        </p>
                        <p className="text-sm font-bold text-gray-800">
                          {v.fullNameAsPerAadhaar || 'Not provided'}
                        </p>
                      </div>

                      {/* Aadhaar front + back + passport photo side by side */}
                      <div className="grid grid-cols-3 gap-2">
                        {/* Aadhaar Front */}
                        <div>
                          <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1 flex items-center gap-1">
                            <FileText className="h-3 w-3" /> Aadhaar Front
                          </p>
                          {v.aadhaarPhotoUrl ? (
                            <a
                              href={v.aadhaarPhotoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block relative group"
                            >
                              <img
                                src={v.aadhaarPhotoUrl}
                                alt="Aadhaar front"
                                className="w-full h-28 object-cover rounded-lg border border-gray-200"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors rounded-lg flex items-center justify-center">
                                <ExternalLink className="h-4 w-4 text-white opacity-0 group-hover:opacity-100" />
                              </div>
                            </a>
                          ) : (
                            <div className="w-full h-28 rounded-lg border border-dashed border-gray-300 flex items-center justify-center">
                              <span className="text-[10px] text-gray-400">No photo</span>
                            </div>
                          )}
                          <p className="text-[9px] text-gray-400 mt-1 text-center">Tap to enlarge</p>
                        </div>

                        {/* Aadhaar Back */}
                        <div>
                          <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1 flex items-center gap-1">
                            <FileText className="h-3 w-3" /> Aadhaar Back
                          </p>
                          {v.aadhaarBackPhotoUrl ? (
                            <a
                              href={v.aadhaarBackPhotoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block relative group"
                            >
                              <img
                                src={v.aadhaarBackPhotoUrl}
                                alt="Aadhaar back"
                                className="w-full h-28 object-cover rounded-lg border border-gray-200"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors rounded-lg flex items-center justify-center">
                                <ExternalLink className="h-4 w-4 text-white opacity-0 group-hover:opacity-100" />
                              </div>
                            </a>
                          ) : (
                            <div className="w-full h-28 rounded-lg border border-dashed border-gray-300 flex items-center justify-center">
                              <span className="text-[10px] text-gray-400">Not uploaded</span>
                            </div>
                          )}
                          <p className="text-[9px] text-gray-400 mt-1 text-center">Address side</p>
                        </div>

                        {/* Passport photo */}
                        <div>
                          <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1 flex items-center gap-1">
                            <Camera className="h-3 w-3" /> Passport
                          </p>
                          {v.passportPhotoUrl ? (
                            <a
                              href={v.passportPhotoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block relative group"
                            >
                              <img
                                src={v.passportPhotoUrl}
                                alt="Passport"
                                className="w-full h-28 object-cover rounded-lg border border-gray-200"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors rounded-lg flex items-center justify-center">
                                <ExternalLink className="h-4 w-4 text-white opacity-0 group-hover:opacity-100" />
                              </div>
                            </a>
                          ) : (
                            <div className="w-full h-28 rounded-lg border border-dashed border-gray-300 flex items-center justify-center">
                              <span className="text-[10px] text-gray-400">No photo</span>
                            </div>
                          )}
                          {/* Face check badge */}
                          <div className="mt-1 flex justify-center">
                            {v.faceDetected === true && (
                              <Badge className="bg-green-100 text-green-700 border-0 text-[9px]">
                                <CheckCircle className="h-2.5 w-2.5 mr-0.5" /> Face OK
                              </Badge>
                            )}
                            {v.faceDetected === false && (
                              <Badge className="bg-red-100 text-red-700 border-0 text-[9px]">
                                <AlertCircle className="h-2.5 w-2.5 mr-0.5" /> No face
                              </Badge>
                            )}
                            {v.faceDetected === null || v.faceDetected === undefined && (
                              <Badge variant="secondary" className="text-[9px]">Not checked</Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Admin verification checklist */}
                      <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">
                          Admin Checklist
                        </p>
                        <label className="flex items-start gap-2 text-xs text-gray-700 cursor-pointer">
                          <input type="checkbox" className="mt-0.5" />
                          <span>Name on form matches name on Aadhaar (front)</span>
                        </label>
                        <label className="flex items-start gap-2 text-xs text-gray-700 cursor-pointer">
                          <input type="checkbox" className="mt-0.5" />
                          <span>Aadhaar (front + back) is clear and not obviously fake</span>
                        </label>
                        <label className="flex items-start gap-2 text-xs text-gray-700 cursor-pointer">
                          <input type="checkbox" className="mt-0.5" />
                          <span>Passport photo shows a clear human face</span>
                        </label>
                      </div>
                    </div>
                  ) : (
                    /* Legacy verification (old format — just docUrl + docType) */
                    <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">
                          {v.docType === 'aadhaar' ? 'Aadhaar Card' :
                           v.docType === 'selfie' ? 'Selfie Photo' :
                           v.docType === 'address_proof' ? 'Address Proof' : v.docType}
                        </p>
                        <a
                          href={v.docUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" /> View document
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Review note */}
                  <Textarea
                    placeholder="Add review notes (optional — e.g. 'Name does not match Aadhaar')"
                    className="text-sm"
                    rows={2}
                    value={reviewNotes[v.id] || ''}
                    onChange={(e) => setReviewNotes({ ...reviewNotes, [v.id]: e.target.value })}
                    disabled={acting === v.id}
                  />

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => reviewVerification(v.id, 'verified')}
                      disabled={acting === v.id}
                    >
                      {acting === v.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-1" />
                      )}
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => reviewVerification(v.id, 'rejected')}
                      disabled={acting === v.id}
                    >
                      <XCircle className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
