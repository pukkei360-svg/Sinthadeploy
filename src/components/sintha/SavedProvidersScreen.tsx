'use client'

import { useEffect, useState } from 'react'
import { useAppStore, type ProviderProfile, type User } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import BottomNav from './BottomNav'
import { ArrowLeft, Heart, Star, Crown, ShieldCheck, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cleanError } from '@/lib/clean-error'

interface FavoriteItem {
  id: string
  createdAt: string
  provider: User & { isVerified?: boolean; isPro?: boolean }
  providerProfile?: ProviderProfile
}

export default function SavedProvidersScreen() {
  const { navigate, user } = useAppStore()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])

  const loadFavorites = async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await apiFetch(`/favorites?clientId=${user.id}`)
      setFavorites(data.favorites || [])
    } catch (err) {
      console.error('Failed to load favorites:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFavorites()
  }, [user])

  const removeFavorite = async (providerId: string, providerName: string) => {
    if (!user) return
    try {
      await apiFetch('/favorites', {
        method: 'DELETE',
        body: JSON.stringify({ clientId: user.id, providerId }),
      })
      setFavorites(favorites.filter((f) => f.providerId !== providerId))
      toast({ title: 'Removed', description: `${providerName} removed from your saved providers` })
    } catch (err: unknown) {
      toast({ title: 'Error', description: cleanError(err) })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate('home')} className="text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">Saved Providers</h1>
      </div>

      <div className="px-4 py-4 space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : favorites.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No saved providers yet</p>
            <p className="text-xs text-gray-300 mt-1 mb-4">
              Tap the heart icon on a provider&apos;s profile to save them here
            </p>
            <button
              onClick={() => navigate('home')}
              className="text-blue-600 text-sm font-medium"
            >
              Browse providers
            </button>
          </div>
        ) : (
          favorites.map((fav) => {
            const provider = fav.provider
            const profile = fav.providerProfile
            return (
              <div
                key={fav.id}
                className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate('provider-profile', { providerId: provider.id })}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={provider.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(provider.name)}&background=2563eb&color=fff`} />
                    <AvatarFallback>{provider.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-gray-800 truncate">{provider.name}</p>
                      {provider.isVerified && (
                        <ShieldCheck className="h-3.5 w-3.5 text-green-600 shrink-0" />
                      )}
                      {provider.isPro && (
                        <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {profile?.category?.name || 'Service Provider'}
                    </p>
                    {profile && profile.rating > 0 && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span className="text-xs text-gray-600">{profile.rating.toFixed(1)}</span>
                        <span className="text-xs text-gray-400">({profile.totalReviews})</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFavorite(provider.id, provider.name)
                    }}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    aria-label="Remove from saved"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {profile?.hourlyRate ? (
                  <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-500">Hourly rate</span>
                    <span className="text-sm font-semibold text-green-700">₹{profile.hourlyRate}/hr</span>
                  </div>
                ) : null}
              </div>
            )
          })
        )}
      </div>

      <BottomNav />
    </div>
  )
}
