'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import BottomNav from './BottomNav'
import {
  Calendar, Star, Crown, Bell, HelpCircle, LogOut, Briefcase,
  ChevronRight, PenLine, MapPin, Phone
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { signOut as firebaseSignOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'


export default function ProfileScreen() {
  const { navigate, user, setUser, logout, myProviderProfile, setMyProviderProfile, token } = useAppStore()
  const { toast } = useToast()
  const [switching, setSwitching] = useState(false)

  const menuItems = [
    { icon: Calendar, label: 'My Bookings', action: () => navigate('my-bookings') },
    { icon: Star, label: 'My Reviews', action: () => navigate('reviews', { targetId: user?.id || '' }) },
    { icon: Crown, label: 'SINTHA PRO', action: () => navigate('sintha-pro'), badge: user?.isPro ? 'Active' : undefined },
    { icon: Bell, label: 'Notifications', action: () => navigate('notifications') },
    { icon: HelpCircle, label: 'Help & Support', action: () => { const msg = encodeURIComponent('Hi SINTHA Support, I need help with my account.'); window.open(`https://wa.me/917005151875?text=${msg}`, '_blank') } },
  ]

  if (user?.role === 'provider') {
    menuItems.splice(0, 0, {
      icon: PenLine,
      label: 'Edit Provider Profile',
      action: () => navigate('provider-onboarding'),
    })
  }

  const handleRoleSwitch = async () => {
    if (!user || switching) return
    setSwitching(true)
    try {
      const newRole = user.role === 'client' ? 'provider' : 'client'

      if (newRole === 'provider') {
        // Check if provider profile exists
        try {
          const provData = await apiFetch(`/providers?userId=${user.id}`)
          const providers = provData.providers || []
          if (providers.length === 0) {
            // No provider profile - go to onboarding
            toast({ title: 'Provider Setup Required', description: 'Please complete your provider profile first' })
            // Update role to provider first
            await apiFetch('/auth/register', {
              method: 'POST',
              body: JSON.stringify({ userId: user.id, role: 'provider' }),
            })
            const updatedUser = { ...user, role: 'provider' }
            setUser(updatedUser, token)
            navigate('provider-onboarding')
            return
          } else {
            setMyProviderProfile(providers[0])
          }
        } catch {
          toast({ title: 'Provider Setup Required', description: 'Please complete your provider profile first' })
          await apiFetch('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ userId: user.id, role: 'provider' }),
          })
          const updatedUser = { ...user, role: 'provider' }
          setUser(updatedUser, token)
          navigate('provider-onboarding')
          return
        }
      }

      // Update role on backend
      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id, role: newRole }),
      })

      // Update user in store, keeping the token intact
      const updatedUser = { ...user, role: newRole }
      setUser(updatedUser, token)
      toast({ title: 'Role Switched', description: `You are now using SINTHA as a ${newRole}` })

      if (newRole === 'provider') {
        navigate('provider-dashboard')
      } else {
        navigate('home')
      }
    } catch (err: unknown) {
      const message = (err as Error).message || 'Failed to switch role'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    } finally {
      setSwitching(false)
    }
  }

  const handleLogout = async () => {
    try {
      await firebaseSignOut(auth)
    } catch {
      // Firebase sign out may fail if not authenticated via Firebase
    }
    logout()
    navigate('landing')
    toast({ title: 'Logged Out', description: 'You have been signed out' })
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sintha-gradient px-4 pt-6 pb-12 text-white">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-white/30">
            <AvatarImage src={user?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=fff&color=2563eb`} />
            <AvatarFallback className="text-xl">{user?.name?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">{user?.name || 'User'}</h2>

            </div>
            <p className="text-sm opacity-80">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="bg-white/20 text-white border-0 text-[10px] capitalize">
                {user?.role || 'client'}
              </Badge>
              {user?.isPro && (
                <Badge className="sintha-pro-badge text-white text-[10px] border-0">
                  <Crown className="h-3 w-3 mr-1" />PRO
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-6 space-y-4">
        {/* Role Switcher */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800">Switch Role</p>
              <p className="text-xs text-gray-500">Toggle between Client & Provider</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${user?.role === 'client' ? 'text-blue-600' : 'text-gray-400'}`}>Client</span>
              <Switch
                checked={user?.role === 'provider'}
                onCheckedChange={handleRoleSwitch}
                disabled={switching}
              />
              <span className={`text-xs font-medium ${user?.role === 'provider' ? 'text-green-600' : 'text-gray-400'}`}>Provider</span>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        {(user?.phone || user?.location) && (
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
            <p className="text-sm font-semibold text-gray-800">Contact Info</p>
            {user?.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">{user.phone}</span>
              </div>
            )}
            {user?.location && (
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">{user.location}</span>
              </div>
            )}
          </div>
        )}

        {/* PRO Status */}
        {!user?.isPro && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 cursor-pointer" onClick={() => navigate('sintha-pro')}>
            <Crown className="h-5 w-5 text-amber-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">Upgrade to PRO</p>
              <p className="text-xs text-amber-600">Get premium features at just ₹199/mo</p>
            </div>
            <ChevronRight className="h-4 w-4 text-amber-400" />
          </div>
        )}

        {/* Provider Stats (if provider) */}
        {user?.role === 'provider' && myProviderProfile && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm font-semibold text-gray-800 mb-3">Provider Stats</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-lg font-bold text-blue-600">{myProviderProfile.totalBookings}</p>
                <p className="text-[10px] text-gray-500">Bookings</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-amber-500">{myProviderProfile.rating}</p>
                <p className="text-[10px] text-gray-500">Rating</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-green-600">{myProviderProfile.totalReviews}</p>
                <p className="text-[10px] text-gray-500">Reviews</p>
              </div>
            </div>
          </div>
        )}

        {/* Menu Items */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {menuItems.map((item, i) => (
            <div key={item.label}>
              <button
                onClick={item.action}
                className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
              >
                <item.icon className="h-5 w-5 text-gray-500" />
                <span className="flex-1 text-sm font-medium text-gray-800">{item.label}</span>
                {item.badge && (
                  <Badge className="sintha-pro-badge text-white text-[9px] border-0 px-1.5 py-0">
                    {item.badge}
                  </Badge>
                )}
                <ChevronRight className="h-4 w-4 text-gray-300" />
              </button>
              {i < menuItems.length - 1 && <Separator className="mx-4" />}
            </div>
          ))}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full bg-white rounded-xl shadow-sm p-4 flex items-center gap-3 text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>

      <BottomNav />
    </div>
  )
}
