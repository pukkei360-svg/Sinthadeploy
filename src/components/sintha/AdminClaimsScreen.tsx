'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import {
  ArrowLeft, Flag, Search, Loader2, Ban, Pause, Play, CheckCircle, XCircle,
  ChevronDown, ChevronUp, AlertTriangle, User, Mail
} from 'lucide-react'

interface AdminClaim {
  id: string
  type: string
  severity: string
  title: string
  description: string
  status: string
  resolution: string | null
  createdAt: string
  reporter: {
    id: string
    name: string
    email: string
    photoUrl: string | null
    role: string
  }
  subject: {
    id: string
    name: string
    email: string
    photoUrl: string | null
    role: string
    isBlocked: boolean
    isBanned: boolean
  }
}

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'investigating', label: 'Investigating' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'dismissed', label: 'Dismissed' },
]

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-red-100 text-red-700',
  investigating: 'bg-amber-100 text-amber-700',
  resolved: 'bg-green-100 text-green-700',
  dismissed: 'bg-gray-100 text-gray-600',
}

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-green-50 text-green-700 border-green-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  critical: 'bg-red-50 text-red-700 border-red-200',
}

const TYPE_LABELS: Record<string, string> = {
  fraud: 'Fraud / Scam',
  misconduct: 'Misconduct',
  no_show: 'No-Show',
  quality: 'Poor Quality',
  payment: 'Payment Dispute',
  abuse: 'Abusive Language',
  other: 'Other',
}

export default function AdminClaimsScreen() {
  const { navigate, user } = useAppStore()
  const { toast } = useToast()
  const [claims, setClaims] = useState<AdminClaim[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [acting, setActing] = useState<string | null>(null)

  const loadClaims = async () => {
    if (!user) return
    setLoading(true)
    try {
      const status = statusFilter === 'all' ? '' : `&status=${statusFilter}`
      const data = await apiFetch(`/admin/claims?adminId=${user.id}${status}`)
      setClaims(data.claims || [])
    } catch (err) {
      toast({
        title: 'Failed to load claims',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClaims()
  }, [user, statusFilter])

  const updateClaim = async (
    claimId: string,
    updates: { status?: string; resolution?: string; action?: 'suspend' | 'ban' | 'none' }
  ) => {
    if (!user) return
    setActing(claimId)
    try {
      await apiFetch(`/admin/claims/${claimId}`, {
        method: 'PATCH',
        body: JSON.stringify({ adminId: user.id, ...updates }),
      })
      toast({
        title: 'Updated',
        description:
          updates.action === 'suspend'
            ? 'Claim updated and subject suspended.'
            : updates.action === 'ban'
            ? 'Claim updated and subject permanently banned.'
            : 'Claim updated.',
      })
      await loadClaims()
    } catch (err) {
      toast({
        title: 'Failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setActing(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate('admin-dashboard')} className="text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-gray-800">Claims & Reports</h1>
        </div>
        {/* Status filter tabs */}
        <div className="flex gap-1 overflow-x-auto">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === s.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="p-4 bg-white">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </div>
          ))
        ) : claims.length === 0 ? (
          <div className="p-8 text-center">
            <Flag className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No claims found</p>
            <p className="text-xs text-gray-300 mt-1">
              User reports will appear here for review
            </p>
          </div>
        ) : (
          claims.map((claim) => {
            const expanded = expandedId === claim.id
            return (
              <div key={claim.id} className="bg-white">
                {/* Top row — always visible */}
                <button
                  onClick={() => setExpandedId(expanded ? null : claim.id)}
                  className="w-full p-4 text-left flex items-start gap-3 hover:bg-gray-50"
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage
                      src={
                        claim.subject.photoUrl ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(claim.subject.name)}&background=ef4444&color=fff`
                      }
                    />
                    <AvatarFallback>{claim.subject.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {claim.title}
                      </p>
                      {expanded ? (
                        <ChevronUp className="h-3 w-3 text-gray-400 ml-auto shrink-0" />
                      ) : (
                        <ChevronDown className="h-3 w-3 text-gray-400 ml-auto shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Against: <strong>{claim.subject.name}</strong> ({claim.subject.role})
                    </p>
                    <p className="text-xs text-gray-400">
                      Reported by: {claim.reporter.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <Badge className={`text-[9px] border ${STATUS_COLORS[claim.status] || 'bg-gray-100'} border-0`} variant="secondary">
                        {claim.status}
                      </Badge>
                      <Badge className={`text-[9px] border ${SEVERITY_COLORS[claim.severity] || 'bg-gray-100'}`} variant="outline">
                        {claim.severity}
                      </Badge>
                      <Badge variant="outline" className="text-[9px]">
                        {TYPE_LABELS[claim.type] || claim.type}
                      </Badge>
                      {claim.subject.isBanned && (
                        <Badge className="text-[9px] bg-red-100 text-red-700 border-0">Banned</Badge>
                      )}
                      {claim.subject.isBlocked && !claim.subject.isBanned && (
                        <Badge className="text-[9px] bg-amber-100 text-amber-700 border-0">Suspended</Badge>
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded view — description + actions */}
                {expanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-gray-50 pt-3">
                    {/* Description */}
                    <div>
                      <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">
                        Report Details
                      </p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {claim.description}
                      </p>
                    </div>

                    {/* Resolution (if any) */}
                    {claim.resolution && (
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase mb-0.5">
                          Admin Resolution
                        </p>
                        <p className="text-xs text-gray-700">{claim.resolution}</p>
                      </div>
                    )}

                    {/* Subject info */}
                    <div className="bg-gray-50 rounded-lg p-2 text-xs">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">
                        Reported User
                      </p>
                      <div className="flex items-center gap-1 text-gray-700">
                        <User className="h-3 w-3" /> {claim.subject.name}
                      </div>
                      <div className="flex items-center gap-1 text-gray-500 mt-0.5">
                        <Mail className="h-3 w-3" /> {claim.subject.email}
                      </div>
                    </div>

                    {/* Action buttons — only show for non-resolved claims */}
                    {claim.status !== 'resolved' && claim.status !== 'dismissed' && (
                      <div className="space-y-2">
                        <div className="flex gap-2 flex-wrap">
                          {claim.status === 'open' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-8"
                              disabled={acting === claim.id}
                              onClick={() =>
                                updateClaim(claim.id, { status: 'investigating', action: 'none' })
                              }
                            >
                              {acting === claim.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                              Investigate
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-8 border-amber-300 text-amber-700 hover:bg-amber-50"
                            disabled={acting === claim.id || claim.subject.isBlocked}
                            onClick={() =>
                              updateClaim(claim.id, { status: 'investigating', action: 'suspend' })
                            }
                          >
                            <Pause className="h-3 w-3" /> Suspend User
                          </Button>

                          <Button
                            size="sm"
                            variant="destructive"
                            className="text-xs h-8"
                            disabled={acting === claim.id || claim.subject.isBanned}
                            onClick={() => {
                              if (!confirm(`Permanently BAN ${claim.subject.name}? They will never be able to log in again.`)) return
                              updateClaim(claim.id, { status: 'resolved', action: 'ban' })
                            }}
                          >
                            <Ban className="h-3 w-3" /> Ban User
                          </Button>
                        </div>

                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-8 border-green-300 text-green-700 hover:bg-green-50"
                            disabled={acting === claim.id}
                            onClick={() =>
                              updateClaim(claim.id, {
                                status: 'resolved',
                                resolution: 'Claim resolved — action taken',
                                action: 'none',
                              })
                            }
                          >
                            <CheckCircle className="h-3 w-3" /> Mark Resolved
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-8 text-gray-500"
                            disabled={acting === claim.id}
                            onClick={() =>
                              updateClaim(claim.id, {
                                status: 'dismissed',
                                resolution: 'Claim dismissed — no action needed',
                                action: 'none',
                              })
                            }
                          >
                            <XCircle className="h-3 w-3" /> Dismiss
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
