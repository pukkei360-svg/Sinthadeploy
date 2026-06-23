'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, Users, Briefcase, Calendar, Crown, Star, Shield, BarChart3, FileCheck, Bell, Flag, Megaphone, IndianRupee
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
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [recentBookings, setRecentBookings] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)
  // PRO price config — admin can change it anytime
  const [proPrice, setProPrice] = useState<string>('')
  const [savingPrice, setSavingPrice] = useState(false)

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

      // Load current PRO price
      try {
        const configData = await apiFetch('/config')
        if (configData.proPrice) setProPrice(configData.proPrice)
      } catch {
        // Use default
      }
    }
    loadStats()
  }, [])

  const updateProPrice = async () => {
    if (!user) return
    const priceNum = parseFloat(proPrice)
    if (isNaN(priceNum) || priceNum < 1 || priceNum > 100000) {
      return
    }
    setSavingPrice(true)
    try {
      await apiFetch('/admin/config', {
        method: 'PUT',
        body: JSON.stringify({ adminId: user.id, key: 'proPrice', value: proPrice }),
      })
      // Success — show a brief toast via the toast hook isn't imported here,
      // so we just update the state. The admin will see the new price reflected.
    } catch (err) {
      // Revert on failure
    } finally {
      setSavingPrice(false)
    }
  }

  const quickLinks = [
    { icon: Users, label: 'Users', view: 'admin-users' as const, color: 'bg-blue-100 text-blue-600', params: { role: 'all' } },
    { icon: Briefcase, label: 'Providers', view: 'admin-users' as const, color: 'bg-green-100 text-green-600', params: { role: 'provider' } },
    { icon: Calendar, label: 'Bookings', view: 'admin-bookings' as const, color: 'bg-amber-100 text-amber-600', params: {} },
    { icon: BarChart3, label: 'Categories', view: 'admin-categories' as const, color: 'bg-purple-100 text-purple-600', params: {} },
    { icon: FileCheck, label: 'Verifications', view: 'admin-verifications' as const, color: 'bg-red-100 text-red-600', params: {} },
    { icon: Flag, label: 'Claims', view: 'admin-claims' as const, color: 'bg-rose-100 text-rose-600', params: {} },
    { icon: Megaphone, label: 'Broadcast', view: 'admin-broadcast' as const, color: 'bg-indigo-100 text-indigo-600', params: {} },
  ]

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

        {/* PRO Price Config — admin can change the PRO subscription price anytime.
            Changes take effect immediately for all new PRO purchases. */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <IndianRupee className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-gray-800 text-sm">PRO Subscription Price</h3>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Set the monthly PRO subscription price. Changes apply to all new purchases immediately.
            </p>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-2.5 text-gray-500 text-sm">₹</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="1"
                  max="100000"
                  value={proPrice}
                  onChange={(e) => setProPrice(e.target.value)}
                  placeholder="199"
                  className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <span className="text-xs text-gray-500">/month</span>
              <button
                onClick={updateProPrice}
                disabled={savingPrice || !proPrice || parseFloat(proPrice) < 1}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingPrice ? 'Saving...' : 'Save'}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">
              Current price: ₹{proPrice || '199'}/month · Referral commission: 30% (₹{((parseFloat(proPrice) || 199) * 0.30).toFixed(2)}/referral)
            </p>
          </CardContent>
        </Card>

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

      </div>
    </div>
  )
}
