'use client'

import { useEffect, useState } from 'react'
import { useAppStore, type ProviderProfile } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import BottomNav from './BottomNav'
import { ArrowLeft, Star, CheckCircle, MapPin } from 'lucide-react'

export default function CategoryScreen() {
  const { navigate, viewParams, providers, setProviders } = useAppStore()
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [localProviders, setLocalProviders] = useState<ProviderProfile[]>([])

  const categoryId = viewParams?.categoryId
  const categoryName = viewParams?.categoryName || 'Category'

  useEffect(() => {
    const loadProviders = async () => {
      setLoading(true)
      try {
        const data = await apiFetch(`/providers?category=${categoryId}`)
        setLocalProviders(data.providers || [])
      } catch {
        // Use store data as fallback
        const filtered = providers.filter((p) => p.categoryId === categoryId)
        setLocalProviders(filtered)
      } finally {
        setLoading(false)
      }
    }
    if (categoryId) loadProviders()
  }, [categoryId])

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'verified', label: 'Verified' },
    { key: 'rating', label: 'Top Rated' },
    { key: 'nearby', label: 'Nearby' },
  ]

  let filtered = localProviders
  if (filter === 'verified') filtered = filtered.filter((p) => p.isVerified)
  if (filter === 'rating') filtered = [...filtered].sort((a, b) => b.rating - a.rating)
  if (filter === 'nearby') filtered = [...filtered].sort((a, b) => (a.availability === 'available' ? -1 : 1))

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate('home')} className="text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">{categoryName}</h1>
      </div>

      {/* Filters */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto bg-white border-b border-gray-100">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              filter === f.key
                ? 'sintha-gradient text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Provider List */}
      <div className="px-4 py-4 space-y-3">
        {loading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>No providers found in this category</p>
          </div>
        ) : (
          filtered.map((p: ProviderProfile) => (
            <button
              key={p.id}
              onClick={() => navigate('provider-profile', { providerId: p.id })}
              className="w-full bg-white rounded-xl p-4 shadow-sm sintha-card-hover flex items-center gap-3 text-left"
            >
              <div className="relative">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={p.user?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.user?.name || 'P')}&background=2563eb&color=fff`} />
                  <AvatarFallback>{p.user?.name?.[0] || 'P'}</AvatarFallback>
                </Avatar>
                {p.availability === 'available' && (
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-gray-800 truncate">{p.user?.name}</p>
                  {p.isVerified && <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                  {p.isFeatured && (
                    <Badge className="sintha-pro-badge text-[9px] text-white px-1 py-0 border-0">PRO</Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate">{p.experience} exp &bull; {p.skills?.split(',')[0]}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-0.5">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-semibold text-gray-600">{p.rating}</span>
                  </div>
                  <span className="text-[10px] text-gray-400">({p.totalReviews} reviews)</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-blue-600">₹{p.hourlyRate}</p>
                <p className="text-[10px] text-gray-400">/hour</p>
                <Badge variant={p.availability === 'available' ? 'default' : 'secondary'} className="text-[10px] mt-1">
                  {p.availability}
                </Badge>
              </div>
            </button>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  )
}
