'use client'

import { useState } from 'react'
import { useAppStore, type ServiceCategory } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { cleanError } from '@/lib/clean-error'
import {
  ArrowLeft, Sparkles, IndianRupee, Clock, Lightbulb,
  Loader2, TrendingUp, CheckCircle
} from 'lucide-react'

// Shape returned by POST /api/ai/estimate-price
interface PriceEstimate {
  lowEstimate: number
  medianEstimate: number
  highEstimate: number
  estimatedDuration: string
  factors: string[]
  tips: string
  currency?: string
  poweredBy?: string
}

const EXAMPLE_CHIPS = [
  'Deep clean a 2BHK apartment',
  'Fix leaking kitchen tap',
  'Tutor for Class 10 Maths, 1 hour daily',
  'Photograph a small wedding (half day)',
  'Service my AC before summer',
  'Paint one bedroom wall',
]

export default function PriceEstimatorScreen() {
  const { navigate, categories } = useAppStore()
  const { toast } = useToast()

  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [loading, setLoading] = useState(false)
  const [estimate, setEstimate] = useState<PriceEstimate | null>(null)

  const handleEstimate = async () => {
    const desc = description.trim()
    if (!desc) {
      toast({ title: 'Describe the job first', description: 'E.g. "Fix a leaking kitchen tap"' })
      return
    }
    setLoading(true)
    setEstimate(null)
    try {
      const data = await apiFetch<PriceEstimate>('/ai/estimate-price', {
        method: 'POST',
        body: JSON.stringify({ description: desc, categoryId: categoryId || undefined }),
      })
      setEstimate(data)
    } catch (err) {
      toast({ title: 'Estimate failed', description: cleanError(err) })
    } finally {
      setLoading(false)
    }
  }

  const formatINR = (n: number) =>
    `₹${Math.round(n).toLocaleString('en-IN')}`

  // Map numeric score (low/median/high) to a visual color band
  // so the range is easy to scan at a glance.
  const bandColor = (which: 'low' | 'median' | 'high') =>
    which === 'low' ? 'text-green-600' :
    which === 'median' ? 'text-purple-700' :
    'text-amber-600'

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button
          onClick={() => navigate('home')}
          className="text-gray-600"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-violet-600 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-800 leading-tight">AI Price Estimator</h1>
            <p className="text-[10px] text-gray-500 leading-tight">Know a fair price before you book</p>
          </div>
        </div>
        <span className="text-[9px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full tracking-wider">
          SINTHA AI
        </span>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
        {/* Info banner */}
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
          <p className="text-xs text-purple-700">
            Describe the job in plain English. SINTHA AI will compare it to real provider rates in Manipur and give you a fair price range.
          </p>
        </div>

        {/* Category (optional) */}
        {categories.length > 0 && (
          <div>
            <label className="text-sm font-semibold text-gray-800 block mb-2">
              Category <span className="text-gray-400 font-normal">(optional — improves accuracy)</span>
            </label>
            <div className="flex gap-2 overflow-x-auto sintha-scrollbar pb-1">
              <button
                onClick={() => setCategoryId('')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  !categoryId
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                Any
              </button>
              {categories.map((cat: ServiceCategory) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    categoryId === cat.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-600 border border-gray-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Job description */}
        <div>
          <label className="text-sm font-semibold text-gray-800 block mb-2">
            Describe the job <span className="text-red-500">*</span>
          </label>
          <textarea
            placeholder="E.g. 'Deep clean my 2BHK apartment in Imphal — 2 bedrooms, 1 kitchen, 2 bathrooms. Need it done this weekend.'"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={5}
            className="w-full p-3 border border-gray-200 rounded-xl bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
          <p className="text-[10px] text-gray-400 mt-1">{description.length}/1000</p>
        </div>

        {/* Example chips */}
        <div>
          <p className="text-[11px] font-semibold text-gray-500 mb-2">Try an example:</p>
          <div className="flex gap-2 overflow-x-auto sintha-scrollbar pb-1">
            {EXAMPLE_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => { setDescription(chip); setEstimate(null) }}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-gray-200 text-gray-700 whitespace-nowrap hover:border-purple-300 hover:text-purple-700 transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Estimate button */}
        <Button
          className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white py-5 font-bold"
          onClick={handleEstimate}
          disabled={loading || !description.trim()}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              SINTHA AI is estimating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Get Price Estimate
            </>
          )}
        </Button>

        {/* Loading skeleton */}
        {loading && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="h-6 w-32 bg-gray-100 rounded animate-pulse" />
              <div className="grid grid-cols-3 gap-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
              <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
            </CardContent>
          </Card>
        )}

        {/* Estimate result */}
        {!loading && estimate && (
          <div className="space-y-4 animate-in fade-in">
            {/* Price range card */}
            <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <IndianRupee className="h-5 w-5 text-purple-600" />
                  <h3 className="font-bold text-gray-800 text-sm">Estimated Price Range</h3>
                  {estimate.poweredBy && (
                    <Badge className="ml-auto bg-purple-100 text-purple-700 border-0 text-[9px]">
                      {estimate.poweredBy}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {/* Low */}
                  <div className="bg-white rounded-xl p-3 text-center border border-green-100">
                    <p className="text-[10px] text-gray-500 font-medium mb-1">Low</p>
                    <p className={`text-base font-bold ${bandColor('low')}`}>
                      {formatINR(estimate.lowEstimate || 0)}
                    </p>
                  </div>
                  {/* Median */}
                  <div className="bg-purple-600 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-purple-100 font-medium mb-1">Median</p>
                    <p className="text-base font-bold text-white">
                      {formatINR(estimate.medianEstimate || 0)}
                    </p>
                  </div>
                  {/* High */}
                  <div className="bg-white rounded-xl p-3 text-center border border-amber-100">
                    <p className="text-[10px] text-gray-500 font-medium mb-1">High</p>
                    <p className={`text-base font-bold ${bandColor('high')}`}>
                      {formatINR(estimate.highEstimate || 0)}
                    </p>
                  </div>
                </div>

                {/* Range visualization bar */}
                <div className="mt-3">
                  <div className="relative h-2 rounded-full bg-gradient-to-r from-green-200 via-purple-400 to-amber-200">
                    <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-purple-600 rounded-full shadow" />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[9px] text-gray-400">Budget-friendly</span>
                    <span className="text-[9px] text-gray-400">Typical</span>
                    <span className="text-[9px] text-gray-400">Premium</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Estimated duration */}
            {estimate.estimatedDuration && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-medium">Estimated Duration</p>
                    <p className="text-sm font-bold text-gray-800">{estimate.estimatedDuration}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Factors */}
            {estimate.factors && estimate.factors.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                    <h3 className="text-sm font-bold text-gray-800">Price Factors</h3>
                  </div>
                  <ul className="space-y-2">
                    {estimate.factors.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                        <CheckCircle className="h-3.5 w-3.5 text-purple-500 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Tips */}
            {estimate.tips && (
              <Card className="border-0 shadow-sm bg-amber-50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide mb-1">
                        SINTHA AI Tip
                      </p>
                      <p className="text-xs text-amber-800 leading-relaxed">{estimate.tips}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* CTA: post a job with this description */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 py-4 text-sm"
                onClick={() => {
                  setEstimate(null)
                  setDescription('')
                }}
              >
                Estimate another
              </Button>
              <Button
                className="flex-1 sintha-gradient text-white py-4 text-sm font-bold"
                onClick={() => navigate('post-job', { prefilledDescription: description })}
              >
                Post this job →
              </Button>
            </div>
          </div>
        )}

        {/* Empty-state hint before first estimate */}
        {!loading && !estimate && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-3">
                <IndianRupee className="h-6 w-6 text-purple-600" />
              </div>
              <p className="text-sm font-medium text-gray-700">Get a fair price in seconds</p>
              <p className="text-xs text-gray-400 mt-1">
                SINTHA AI looks at real provider rates near you so you don&apos;t overpay — or underpay a hardworking professional.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
