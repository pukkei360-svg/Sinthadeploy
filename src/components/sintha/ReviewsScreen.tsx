'use client'

import { useEffect, useState } from 'react'
import { useAppStore, type Review } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Star } from 'lucide-react'

export default function ReviewsScreen() {
  const { navigate, viewParams } = useAppStore()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  const targetId = viewParams?.targetId

  useEffect(() => {
    const loadReviews = async () => {
      try {
        const data = await apiFetch(`/reviews?targetId=${targetId}`)
        setReviews(data.reviews || [])
      } catch {
        // Handle error
      } finally {
        setLoading(false)
      }
    }
    if (targetId) loadReviews()
  }, [targetId])

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white sticky top-0 z-40 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate('home')} className="text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">Reviews</h1>
      </div>

      {/* Summary */}
      <div className="bg-white px-4 py-6 text-center border-b border-gray-100">
        <p className="text-4xl font-bold text-gray-800">{avgRating}</p>
        <div className="flex items-center justify-center gap-1 mt-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              className={`h-5 w-5 ${s <= Math.round(Number(avgRating)) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
            />
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-1">{reviews.length} reviews</p>
      </div>

      <div className="divide-y divide-gray-100">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="p-4 flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))
        ) : reviews.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Star className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            No reviews yet
          </div>
        ) : (
          reviews.map((review: Review) => (
            <div key={review.id} className="p-4 bg-white">
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={review.author?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.author?.name || 'U')}&background=2563eb&color=fff`} />
                  <AvatarFallback>{review.author?.name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800">{review.author?.name}</p>
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-3 w-3 ${s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
                        />
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-gray-600 mt-1">{review.comment}</p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">
                    {new Date(review.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
