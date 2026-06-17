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
import { ArrowLeft, CheckCircle, XCircle, FileText, Clock } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface VerificationDoc {
  id: string
  docType: string
  docUrl: string
  status: string
  reviewNote?: string
  createdAt: string
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

  useEffect(() => {
    const loadVerifications = async () => {
      try {
        const data = await apiFetch('/verification?status=pending')
        setVerifications(data.verifications || [])
      } catch {
        toast({ title: 'Error', description: 'Failed to load verifications', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }
    loadVerifications()
  }, [toast])

  const reviewVerification = async (id: string, status: 'verified' | 'rejected') => {
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
        description: `Verification ${status}`,
      })
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' })
    }
  }

  const docTypeLabels: Record<string, string> = {
    aadhaar: 'Aadhaar Card',
    selfie: 'Selfie Photo',
    address_proof: 'Address Proof',
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
          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)
        ) : verifications.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="h-10 w-10 text-green-400 mx-auto mb-2" />
            <p className="text-gray-400">No pending verifications</p>
          </div>
        ) : (
          verifications.map((v) => (
            <Card key={v.id} className="border-0 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={v.user.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(v.user.name)}&background=2563eb&color=fff`} />
                    <AvatarFallback>{v.user.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">{v.user.name}</p>
                    <p className="text-xs text-gray-500">{v.user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{docTypeLabels[v.docType] || v.docType}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Submitted {new Date(v.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <Textarea
                  placeholder="Add review notes (optional)"
                  className="text-sm"
                  rows={2}
                  value={reviewNotes[v.id] || ''}
                  onChange={(e) => setReviewNotes({ ...reviewNotes, [v.id]: e.target.value })}
                />

                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => reviewVerification(v.id, 'verified')}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" /> Approve
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => reviewVerification(v.id, 'rejected')}
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
