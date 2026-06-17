'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Search, Ban, Trash2, CheckCircle, Crown } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  isVerified: boolean
  isPro: boolean
  isBlocked: boolean
  photoUrl?: string
  createdAt: string
  _count: {
    bookingsAsClient: number
    bookingsAsProvider: number
  }
}

export default function AdminUsersScreen() {
  const { navigate } = useAppStore()
  const { toast } = useToast()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

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

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  )

  const toggleBlock = async (userId: string, isBlocked: boolean) => {
    try {
      await apiFetch(`/admin/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ isBlocked: !isBlocked }),
      })
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isBlocked: !isBlocked } : u))
      )
      toast({ title: isBlocked ? 'Unblocked' : 'Blocked', description: `User ${isBlocked ? 'unblocked' : 'blocked'} successfully` })
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' })
    }
  }

  const togglePro = async (userId: string, isPro: boolean) => {
    try {
      const proExpiry = isPro ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
      await apiFetch(`/admin/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ isPro: !isPro, proExpiry }),
      })
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isPro: !isPro } : u))
      )
      toast({ title: isPro ? 'PRO Deactivated' : 'PRO Activated', description: `PRO ${isPro ? 'removed' : 'activated for 30 days'} successfully` })
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' })
    }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    try {
      await apiFetch(`/admin/users/${userId}`, { method: 'DELETE' })
      setUsers((prev) => prev.filter((u) => u.id !== userId))
      toast({ title: 'Deleted', description: 'User deleted successfully' })
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
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search users..."
            className="pl-10 bg-gray-50 border-0"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
            <div key={u.id} className="p-4 bg-white flex items-center gap-3">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={u.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=2563eb&color=fff`} />
                <AvatarFallback>{u.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-gray-800 truncate">{u.name}</p>
                  {u.isVerified && <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />}
                  {u.isBlocked && <Badge className="bg-red-100 text-red-600 text-[9px] border-0">Blocked</Badge>}
                </div>
                <p className="text-xs text-gray-500 truncate">{u.email}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="secondary" className="text-[9px] capitalize">{u.role}</Badge>
                  {u.isPro && <Badge className="sintha-pro-badge text-white text-[9px] border-0">PRO</Badge>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => togglePro(u.id, u.isPro)}
                  title={u.isPro ? 'Remove PRO' : 'Activate PRO'}
                >
                  <Crown className={`h-4 w-4 ${u.isPro ? 'text-amber-500' : 'text-gray-300'}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => toggleBlock(u.id, u.isBlocked)}
                >
                  <Ban className={`h-4 w-4 ${u.isBlocked ? 'text-green-500' : 'text-gray-400'}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => deleteUser(u.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
