'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import BottomNav from './BottomNav'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Sparkles, IndianRupee, Clock, Lightbulb, Loader2, TrendingUp } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cleanError } from '@/lib/clean-error'

interface PriceEstimate {
  lowEstimate: number
  highEstimate: number
  medianEstimate: number
  estimatedDuration: string
  factors: string[]
  tips: string
  breakdown?: string
  currency: string
  poweredBy: string
}

export default function PriceEstimatorScreen() {
  const { navigate } = useAppStore()
  const { toast } = useToast()
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [estimate, setEstimate] = useState<PriceEstimate | null>(null)

  const getEstimate = async () => {
    if (!description.trim() || loading) return
    setLoading(true)
    setEstimate(null)
    try {
      const data = await apiFetch('/ai/estimate-price', {
        method: 'POST',
        body: JSON.stringify({ description: description.trim() }),
      })
      setEstimate(data)
    } catch (err: unknown) {
      toast({ title: 'Error', description: cleanError(err) })
    } finally {
      setLoading(false)
    }
  }

  const examples = [
    'Fix a leaking kitchen tap',
    'Deep clean a 2BHK apartment',
    'Install a ceiling fan',
    'Tutor for Class 10 mathematics',
    'Photography for a birthday party',
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate('home')} className="text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">AI Price Estimator</h1>
        <span className="text-[9px] bg-purple-600 text-white px-1.5 py-0.5 rounded-full ml-auto">Claude AI</span>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Description input */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <h3 className="font-semibold text-gray-800 text-sm">Describe your job</h3>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Tell us what you need done. Our AI will estimate the cost based on real provider rates in Manipur.
          </p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. I need someone to fix a leaking tap in my kitchen. It's been dripping for a week."
            rows={3}
            className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
          {/* Example chips */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {examples.map((ex) => (
              <button
                key={ex}
                onClick={() => setDescription(ex)}
                className="text-[11px] bg-purple-50 text-purple-700 hover:bg-purple-100 px-2 py-1 rounded-full transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
          <Button
            className="w-full mt-3 bg-purple-600 hover:bg-purple-700 text-white"
            onClick={getEstimate}
            disabled={loading || !description.trim()}
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Estimating...</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" /> Get Price Estimate</>
            )}
          </Button>
        </div>

        {/* Estimate result */}
        {estimate && (
          <div className="space-y-3">
            {/* Price range card */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <IndianRupee className="h-5 w-5 text-purple-600" />
                <h3 className="font-bold text-gray-800">Estimated Cost</h3>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">Low</p>
                  <p className="text-xl font-bold text-green-600">₹{estimate.lowEstimate}</p>
                </div>
                <div className="bg-white rounded-lg py-1">
                  <p className="text-[10px] text-purple-600 uppercase font-semibold">Most Likely</p>
                  <p className="text-2xl font-extrabold text-purple-700">₹{estimate.medianEstimate}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">High</p>
                  <p className="text-xl font-bold text-red-500">₹{estimate.highEstimate}</p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-1.5 mt-3 pt-3 border-t border-purple-100">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-xs text-gray-600">Estimated duration: {estimate.estimatedDuration}</span>
              </div>
            </div>

            {/* Factors */}
            {estimate.factors && estimate.factors.length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <h4 className="font-semibold text-gray-800 text-sm">Price Factors</h4>
                </div>
                <ul className="space-y-1">
                  {estimate.factors.map((factor, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">•</span>
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tips */}
            {estimate.tips && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-amber-800 mb-0.5">Tip</p>
                    <p className="text-xs text-amber-700">{estimate.tips}</p>
                  </div>
                </div>
              </div>
            )}

            {/* CTA: post a job */}
            <button
              onClick={() => navigate('post-job')}
              className="w-full sintha-gradient text-white rounded-xl py-3 text-sm font-semibold shadow-sm"
            >
              Post this job to get real quotes →
            </button>

            <p className="text-center text-[10px] text-gray-400">
              Estimates are AI-generated based on provider rates. Actual prices may vary.
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
