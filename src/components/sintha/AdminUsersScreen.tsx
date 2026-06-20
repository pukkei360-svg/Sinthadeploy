'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft, Search, Ban, Trash2, CheckCircle, Crown, Pause, Play,
  ShieldX, ShieldCheck, Flag, MoreVertical, X
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  isVerified: boolean
  isPro: boolean
  isBlocked: boolean
  isBanned: boolean
  banReason?: string | null
  bannedAt?: string | null
  photoUrl?: string
  createdAt: string
  _count: {
    bookingsAsClient: number
    bookingsAsProvider: number
    claimsFiled: number
    claimsAgainst: number
  }
}

export default function AdminUsersScreen() {
  const { navigate, user: adminUser, viewParams } = useAppStore()
  const { toast } = useToast()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [search, setSearch] = useState('')
  // Read initial role from viewParams (set by AdminDashboard quick links).
  // 'all' = show everyone (including admins)
  // 'client' / 'provider' / 'admin' = filter to that role
  const initialRole = (viewParams?.role as 'all' | 'client' | 'provider' | 'admin' | undefined) || 'all'
  const [roleFilter, setRoleFilter] = useState<'all' | 'client' | 'provider' | 'admin'>(initialRole)
  const [loading, setLoading] = useState(true)
  const [actionMenuFor, setActionMenuFor] = useState<string | null>(null)
  const [banReasonFor, setBanReasonFor] = useState<string | null>(null)
  const [banReasonText, setBanReasonText] = useState('')
  const [acting, setActing] = useState<string | null>(null)

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await apiFetch('/admin/users')
        setUsers(data.users || [])
      } catch {
        toast({ title: 'Error', description: 'Failed to load users', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }
    loadUsers()
  }, [toast])

  const filtered = users.filter((u) => {
    // Role filter — admins are hidden by default (set to 'all' shows everyone,
    // but the default is 'client' so admins don't clutter the regular list)
    if (roleFilter !== 'all' && u.role !== roleFilter) return false
    // Search filter
    if (
      !u.name.toLowerCase().includes(search.toLowerCase()) &&
      !u.email.toLowerCase().includes(search.toLowerCase())
    ) {
      return false
    }
    return true
  })

  // Counts for the filter tabs
  const counts = {
    all: users.length,
    client: users.filter((u) => u.role === 'client').length,
    provider: users.filter((u) => u.role === 'provider').length,
    admin: users.filter((u) => u.role === 'admin').length,
  }

  // ── Generic action handler — calls PATCH /admin/users/[id] ──
  const performAction = async (
    userId: string,
    action: 'suspend' | 'unsuspend' | 'ban' | 'unban' | 'reject',
    reason?: string
  ) => {
    setActing(userId)
    setActionMenuFor(null)
    try {
      await apiFetch(`/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          action,
          reason: reason || `Action: ${action}`,
          adminId: adminUser?.id,
        }),
      })

      // For 'reject', the user is deleted — remove from list
      if (action === 'reject') {
        setUsers((prev) => prev.filter((u) => u.id !== userId))
      } else {
        // Update local state
        setUsers((prev) =>
          prev.map((u) => {
            if (u.id !== userId) return u
            switch (action) {
              case 'suspend':
                return { ...u, isBlocked: true }
              case 'unsuspend':
                return { ...u, isBlocked: false }
              case 'ban':
                return {
                  ...u,
                  isBanned: true,
                  isBlocked: true,
                  banReason: reason,
                  bannedAt: new Date().toISOString(),
                }
              case 'unban':
                return {
                  ...u,
                  isBanned: false,
                  isBlocked: false,
                  banReason: null,
                  bannedAt: null,
                }
              default:
                return u
            }
          })
        )
      }

      const messages: Record<string, string> = {
        suspend: 'User suspended — they cannot log in until restored',
        unsuspend: 'User restored — they can log in again',
        ban: 'User PERMANENTLY banned — they can never log in again',
        unban: 'User unbanned — they can log in again',
        reject: 'User rejected and email banned — cannot re-register',
      }
      toast({
        title: 'Action complete',
        description: messages[action] || 'Done',
        variant: action === 'unban' || action === 'unsuspend' ? 'default' : 'destructive',
      })
    } catch (err: unknown) {
      toast({
        title: 'Action failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setActing(null)
      setBanReasonFor(null)
      setBanReasonText('')
    }
  }

  const togglePro = async (userId: string, isPro: boolean) => {
    try {
      const proExpiry = isPro ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      await apiFetch(`/admin/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ isPro: !isPro, proExpiry }),
      })
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isPro: !isPro } : u)))
      toast({ title: isPro ? 'PRO Deactivated' : 'PRO Activated' })
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' })
    }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('Delete this user permanently? Their data will be removed but they CAN re-register. Use "Reject" to also ban their email.')) return
    try {
      await apiFetch(`/admin/users/${userId}`, { method: 'DELETE' })
      setUsers((prev) => prev.filter((u) => u.id !== userId))
      toast({ title: 'Deleted' })
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white sticky top-0 z-40 px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate('admin-dashboard')} className="text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-gray-800">Users</h1>
          <Badge variant="secondary" className="text-[10px]">{users.length}</Badge>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name or email..."
            className="pl-10 bg-gray-50 border-0"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {/* Role filter tabs — separates admins from clients/providers */}
        <div className="flex gap-1 mt-3 overflow-x-auto">
          {([
            { id: 'all', label: `All (${counts.all})` },
            { id: 'client', label: `Clients (${counts.client})` },
            { id: 'provider', label: `Providers (${counts.provider})` },
            { id: 'admin', label: `Admins (${counts.admin})` },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRoleFilter(tab.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                roleFilter === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="p-4 flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No users found</div>
        ) : (
          filtered.map((u) => (
            <div key={u.id} className="p-4 bg-white relative">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={u.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=2563eb&color=fff`} />
                  <AvatarFallback>{u.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-semibold text-gray-800 truncate">{u.name}</p>
                    {u.isVerified && <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />}
                    {u.isBanned && (
                      <Badge className="bg-red-100 text-red-700 text-[9px] border-0">BANNED</Badge>
                    )}
                    {!u.isBanned && u.isBlocked && (
                      <Badge className="bg-amber-100 text-amber-700 text-[9px] border-0">SUSPENDED</Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <Badge variant="secondary" className="text-[9px] capitalize">{u.role || 'none'}</Badge>
                    {u.isPro && <Badge className="sintha-pro-badge text-white text-[9px] border-0">PRO</Badge>}
                    {u._count?.claimsAgainst > 0 && (
                      <Badge variant="outline" className="text-[9px] text-red-600 border-red-200">
                        <Flag className="h-2 w-2 mr-0.5" /> {u._count.claimsAgainst}
                      </Badge>
                    )}
                  </div>
                  {u.banReason && (
                    <p className="text-[10px] text-red-500 mt-0.5 truncate" title={u.banReason}>
                      Reason: {u.banReason}
                    </p>
                  )}
                </div>

                {/* Quick actions */}
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => togglePro(u.id, u.isPro)}
                    title={u.isPro ? 'Remove PRO' : 'Activate PRO'}
                    disabled={!!acting}
                  >
                    <Crown className={`h-4 w-4 ${u.isPro ? 'text-amber-500' : 'text-gray-300'}`} />
                  </Button>

                  {/* More actions menu */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setActionMenuFor(actionMenuFor === u.id ? null : u.id)}
                    disabled={!!acting || u.role === 'admin'}
                  >
                    {acting === u.id ? (
                      <span className="h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <MoreVertical className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Action menu dropdown */}
              {actionMenuFor === u.id && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => { setActionMenuFor(null); setBanReasonFor(null) }}
                  />
                  <div className="absolute right-4 top-16 z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[200px]">
                    {/* Suspended state */}
                    {u.isBlocked && !u.isBanned && (
                      <button
                        onClick={() => performAction(u.id, 'unsuspend')}
                        className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-2 text-green-700"
                      >
                        <Play className="h-3.5 w-3.5" /> Restore (Unsuspend)
                      </button>
                    )}
                    {/* Not suspended */}
                    {!u.isBlocked && (
                      <button
                        onClick={() => performAction(u.id, 'suspend')}
                        className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-2 text-amber-700"
                      >
                        <Pause className="h-3.5 w-3.5" /> Suspend (Temporary)
                      </button>
                    )}

                    {/* Banned state */}
                    {u.isBanned ? (
                      <button
                        onClick={() => {
                          if (!confirm(`Unban ${u.name}? They will be able to log in again.`)) return
                          performAction(u.id, 'unban')
                        }}
                        className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-2 text-green-700"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" /> Unban (Forgive)
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setBanReasonFor(u.id)
                          setBanReasonText('')
                        }}
                        className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-2 text-red-700"
                      >
                        <Ban className="h-3.5 w-3.5" /> Ban Permanently
                      </button>
                    )}

                    {/* Reject (ban + delete) */}
                    <button
                      onClick={() => {
                        if (!confirm(`REJECT ${u.name}?\n\nThis will:\n• Permanently ban their email\n• Delete their account\n• They can NEVER register again with this email\n\nThis cannot be undone.`)) return
                        performAction(u.id, 'reject', 'Account rejected by admin')
                      }}
                      className="w-full px-3 py-2 text-left text-xs hover:bg-red-50 flex items-center gap-2 text-red-700 font-semibold border-t border-gray-100"
                    >
                      <ShieldX className="h-3.5 w-3.5" /> Reject + Ban Email
                    </button>

                    {/* Plain delete (no email ban) */}
                    <button
                      onClick={() => deleteUser(u.id)}
                      className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-2 text-gray-600 border-t border-gray-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete Only
                    </button>
                  </div>

                  {/* Ban reason input */}
                  {banReasonFor === u.id && (
                    <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                      <p className="text-xs font-semibold text-red-700">
                        Ban reason (visible to user as "why they're banned"):
                      </p>
                      <Input
                        placeholder="e.g. Fraudulent behavior, multiple complaints..."
                        value={banReasonText}
                        onChange={(e) => setBanReasonText(e.target.value)}
                        className="bg-white text-xs h-8"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs flex-1"
                          onClick={() => { setBanReasonFor(null); setBanReasonText('') }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-xs flex-1"
                          onClick={() => {
                            if (!banReasonText.trim()) {
                              toast({ title: 'Reason required', variant: 'destructive' })
                              return
                            }
                            if (!confirm(`Permanently BAN ${u.name}?\n\nThey will NEVER be able to log in again with this email.`)) return
                            performAction(u.id, 'ban', banReasonText.trim())
                          }}
                        >
                          <Ban className="h-3 w-3 mr-1" /> Confirm Ban
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
