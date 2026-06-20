'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import {
  ArrowLeft, Users, Briefcase, Calendar, Crown, Star, Shield, BarChart3, FileCheck, Bell,
  Trash2, AlertTriangle, Loader2, Search, Flag
} from 'lucide-react'

interface AdminStats {
  totalUsers: number
  totalProviders: number
  totalBookings: number
  totalCategories: number
  totalReviews: number
  pendingVerifications: number
  pendingClaims?: number
  suspendedUsers?: number
  bannedUsers?: number
  proUsers: number
  revenue: number
  bookingsByStatus: Record<string, number>
}

export default function AdminDashboardScreen() {
  const { navigate, user } = useAppStore()
  const { toast } = useToast()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [recentBookings, setRecentBookings] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)

  // Cleanup tool state
  const [cleanupPreview, setCleanupPreview] = useState<{
    staleSubscriptions: number
    revokeProForUsers: number
    staleNotifications: number
    usersWhoWouldLosePro: Array<{ id: string; name: string; email: string }>
  } | null>(null)
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const [cleanupExecuting, setCleanupExecuting] = useState(false)
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false)
  const [cleanupResult, setCleanupResult] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await apiFetch('/admin/stats')
        setStats(data.stats)
        setRecentBookings(data.recentBookings || [])
      } catch {
        // Handle error
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [])

  const quickLinks = [
    { icon: Users, label: 'Users', view: 'admin-users' as const, color: 'bg-blue-100 text-blue-600', params: { role: 'all' } },
    { icon: Briefcase, label: 'Providers', view: 'admin-users' as const, color: 'bg-green-100 text-green-600', params: { role: 'provider' } },
    { icon: Calendar, label: 'Bookings', view: 'admin-bookings' as const, color: 'bg-amber-100 text-amber-600', params: {} },
    { icon: BarChart3, label: 'Categories', view: 'admin-categories' as const, color: 'bg-purple-100 text-purple-600', params: {} },
    { icon: FileCheck, label: 'Verifications', view: 'admin-verifications' as const, color: 'bg-red-100 text-red-600', params: {} },
    { icon: Flag, label: 'Claims', view: 'admin-claims' as const, color: 'bg-rose-100 text-rose-600', params: {} },
  ]

  // ── PRO ₹1 → ₹199 cleanup tool ────────────────────────────────
  // Loads a dry-run preview of what would be deleted. The actual
  // destructive call only fires after the admin taps "Confirm".
  const loadCleanupPreview = async () => {
    if (!user) return
    setCleanupLoading(true)
    setCleanupResult(null)
    try {
      const data = await apiFetch(`/admin/cleanup-pro-data?adminId=${user.id}`)
      setCleanupPreview({
        staleSubscriptions: data.wouldDelete?.staleSubscriptions ?? 0,
        revokeProForUsers: data.wouldDelete?.revokeProForUsers ?? 0,
        staleNotifications: data.wouldDelete?.staleNotifications ?? 0,
        usersWhoWouldLosePro: data.wouldDelete?.usersWhoWouldLosePro ?? [],
      })
      setShowCleanupConfirm(true)
    } catch (err) {
      toast({
        title: 'Preview failed',
        description: err instanceof Error ? err.message : 'Could not load cleanup preview',
        variant: 'destructive',
      })
    } finally {
      setCleanupLoading(false)
    }
  }

  const executeCleanup = async () => {
    if (!user) return
    setCleanupExecuting(true)
    try {
      const result = await apiFetch('/admin/cleanup-pro-data', {
        method: 'POST',
        body: JSON.stringify({ adminId: user.id }),
      })
      setCleanupResult(result.summary || result)
      setCleanupPreview(null)
      setShowCleanupConfirm(false)
      toast({
        title: 'Cleanup complete',
        description: 'Old ₹1 PRO data has been wiped. Users who paid ₹1 will need to re-subscribe at ₹199.',
      })
      // Reload stats so PRO Users count reflects the cleanup
      try {
        const statsData = await apiFetch('/admin/stats')
        setStats(statsData.stats)
      } catch {}
    } catch (err) {
      toast({
        title: 'Cleanup failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setCleanupExecuting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sintha-gradient px-4 py-4 text-white">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('profile')} className="text-white/80 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">Admin Dashboard</h1>
        </div>
        <p className="text-sm opacity-80">Welcome back, {user?.name}</p>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Stats Grid */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <Users className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-gray-800">{stats.totalUsers}</p>
                <p className="text-xs text-gray-500">Total Users</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <Briefcase className="h-6 w-6 text-green-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-gray-800">{stats.totalProviders}</p>
                <p className="text-xs text-gray-500">Providers</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <Calendar className="h-6 w-6 text-amber-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-gray-800">{stats.totalBookings}</p>
                <p className="text-xs text-gray-500">Bookings</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <Crown className="h-6 w-6 text-purple-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-gray-800">{stats.proUsers}</p>
                <p className="text-xs text-gray-500">PRO Users</p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Pending Verifications Alert */}
        {stats && stats.pendingVerifications > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3" onClick={() => navigate('admin-verifications')}>
            <Shield className="h-5 w-5 text-amber-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">{stats.pendingVerifications} Pending Verifications</p>
              <p className="text-xs text-amber-600">Click to review</p>
            </div>
          </div>
        )}

        {/* Pending Claims Alert */}
        {stats && (stats.pendingClaims ?? 0) > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3" onClick={() => navigate('admin-claims')}>
            <Flag className="h-5 w-5 text-rose-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-rose-800">{stats.pendingClaims} Pending Claims</p>
              <p className="text-xs text-rose-600">User reports need your attention</p>
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div>
          <h3 className="font-bold text-gray-800 mb-3">Manage</h3>
          <div className="grid grid-cols-3 gap-3">
            {quickLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => navigate(link.view, link.params)}
                className="bg-white rounded-xl p-3 text-center shadow-sm sintha-card-hover"
              >
                <div className={`w-10 h-10 rounded-full ${link.color} flex items-center justify-center mx-auto mb-2`}>
                  <link.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium text-gray-700">{link.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h3 className="font-bold text-gray-800 mb-3">Recent Bookings</h3>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              {(recentBookings as Array<{id: string; service: string; status: string; client?: {name: string}; provider?: {name: string}}>).length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-400">No recent bookings</div>
              ) : (
                (recentBookings as Array<{id: string; service: string; status: string; client?: {name: string}; provider?: {name: string}}>).map((booking, i, arr) => (
                  <div
                    key={booking.id}
                    className={`flex items-center gap-3 p-3 ${i < arr.length - 1 ? 'border-b border-gray-50' : ''}`}
                  >
                    <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{booking.service}</p>
                      <p className="text-xs text-gray-500">{booking.client?.name} → {booking.provider?.name}</p>
                    </div>
                    <Badge variant="secondary" className="text-[9px]">{booking.status}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── PRO ₹1 → ₹199 Cleanup Tool ─────────────────────────── */}
        <div>
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-red-500" />
            PRO Price Cleanup
          </h3>
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  Wipes ALL traces of the old <strong>₹1</strong> PRO subscription price so the
                  system starts fresh at <strong>₹199</strong>. Deletes ₹1 subscription records,
                  revokes PRO for users who paid ₹1, and removes old ₹1 PRO notifications.
                  Idempotent — safe to run multiple times.
                </p>
              </div>

              {/* Result summary */}
              {cleanupResult && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800">
                  <p className="font-semibold mb-1">✓ Cleanup complete</p>
                  <ul className="space-y-0.5">
                    <li>• Subscriptions deleted: <strong>{String(cleanupResult.subscriptionsDeleted ?? 0)}</strong></li>
                    <li>• Users PRO revoked: <strong>{String(cleanupResult.usersProRevoked ?? 0)}</strong></li>
                    <li>• Stale notifications deleted: <strong>{String(cleanupResult.staleNotificationsDeleted ?? 0)}</strong></li>
                  </ul>
                </div>
              )}

              {/* Preview button */}
              <Button
                variant="outline"
                className="w-full border-amber-300 text-amber-800 hover:bg-amber-100"
                onClick={loadCleanupPreview}
                disabled={cleanupLoading}
              >
                {cleanupLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading preview...</>
                ) : (
                  <><Search className="h-4 w-4 mr-2" /> Preview what would be cleaned</>
                )}
              </Button>

              {/* Confirm modal */}
              {showCleanupConfirm && cleanupPreview && (
                <div className="bg-white border border-red-200 rounded-lg p-3 space-y-3">
                  <p className="text-xs font-semibold text-red-700">This will permanently:</p>
                  <ul className="text-xs text-gray-700 space-y-1">
                    <li>• Delete <strong>{cleanupPreview.staleSubscriptions}</strong> ₹1 subscription record(s)</li>
                    <li>• Revoke PRO for <strong>{cleanupPreview.revokeProForUsers}</strong> user(s)</li>
                    <li>• Delete <strong>{cleanupPreview.staleNotifications}</strong> stale ₹1 notification(s)</li>
                  </ul>

                  {cleanupPreview.usersWhoWouldLosePro.length > 0 && (
                    <div className="bg-gray-50 rounded p-2 max-h-32 overflow-y-auto">
                      <p className="text-[10px] text-gray-500 mb-1 font-semibold">Users who will lose PRO:</p>
                      {cleanupPreview.usersWhoWouldLosePro.map((u) => (
                        <p key={u.id} className="text-[10px] text-gray-700 truncate">
                          • {u.name} ({u.email})
                        </p>
                      ))}
                    </div>
                  )}

                  {cleanupPreview.staleSubscriptions === 0 &&
                   cleanupPreview.revokeProForUsers === 0 &&
                   cleanupPreview.staleNotifications === 0 ? (
                    <p className="text-xs text-green-700 font-medium text-center py-1">
                      ✓ Nothing to clean — database is already up to date
                    </p>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setShowCleanupConfirm(false)}
                        disabled={cleanupExecuting}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        onClick={executeCleanup}
                        disabled={cleanupExecuting}
                      >
                        {cleanupExecuting ? (
                          <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Wiping...</>
                        ) : (
                          <><Trash2 className="h-3.5 w-3.5 mr-1" /> Confirm Wipe</>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
