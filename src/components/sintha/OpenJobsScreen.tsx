'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { cleanError } from '@/lib/clean-error'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import BottomNav from './BottomNav'
import {
  ArrowLeft, Briefcase, MapPin, IndianRupee, Clock, CheckCircle, MessageCircle,
} from 'lucide-react'

interface JobClient {
  id: string
  name: string
  photoUrl?: string | null
  location?: string | null
}
interface OpenJobItem {
  id: string
  title: string
  description: string
  location?: string | null
  budget?: number | null
  urgency?: string
  photoUrls?: string | null
  createdAt: string
  hasQuoted?: boolean
  _count?: { quotes: number }
  client?: JobClient
}

const urgencyLabels: Record<string, string> = {
  urgent: 'Today',
  soon: 'This Week',
  flexible: 'Flexible',
}

function formatTimeAgo(iso: string): string {
  try {
    const then = new Date(iso).getTime()
    const now = Date.now()
    const diff = Math.max(0, now - then)
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return new Date(iso).toLocaleDateString()
  } catch {
    return ''
  }
}

/** Safely parse the photoUrls JSON string the API returns. */
function parsePhotoUrls(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.filter((u): u is string => typeof u === 'string' && u.length > 0)
    }
  } catch {
    // malformed JSON — treat as no photos
  }
  return []
}

export default function OpenJobsScreen() {
  const { navigate, user } = useAppStore()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState<OpenJobItem[]>([])

  useEffect(() => {
    const loadJobs = async () => {
      if (!user) return
      setLoading(true)
      try {
        const data = await apiFetch<{ jobs: OpenJobItem[] }>(`/jobs?providerId=${user.id}`)
        setJobs(data.jobs || [])
      } catch (err) {
        toast({ title: 'Could not load jobs', description: cleanError(err), variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }
    loadJobs()
  }, [user])

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate('provider-dashboard')} className="text-gray-600" aria-label="Go back">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">Open Jobs</h1>
      </div>

      <div className="px-4 py-4 space-y-3 max-w-lg mx-auto">
        {/* Blue hint banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
          <Briefcase className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            Showing jobs matching your service category.
          </p>
        </div>

        {loading ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)
        ) : jobs.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Briefcase className="h-8 w-8 text-gray-300" />
            </div>
            <h3 className="text-base font-semibold text-gray-800 mb-1">No open jobs right now</h3>
            <p className="text-sm text-gray-500">
              New jobs in your category will show up here. Check back soon!
            </p>
          </div>
        ) : (
          jobs.map((job) => {
            const photos = parsePhotoUrls(job.photoUrls)
            const quoteCount = job._count?.quotes ?? 0
            return (
              <button
                key={job.id}
                onClick={() => navigate('job-detail', { jobId: job.id })}
                className="w-full bg-white rounded-xl p-4 shadow-sm text-left sintha-card-hover"
              >
                {/* Client row */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={
                          job.client?.photoUrl ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(job.client?.name || 'C')}&background=0F4C81&color=fff`
                        }
                      />
                      <AvatarFallback>{job.client?.name?.[0] || 'C'}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">
                        {job.client?.name || 'Client'}
                      </p>
                      <p className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {formatTimeAgo(job.createdAt)}
                      </p>
                    </div>
                  </div>
                  {job.hasQuoted && (
                    <Badge className="bg-green-100 text-green-700 border-0 text-[10px] whitespace-nowrap">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Quoted
                    </Badge>
                  )}
                </div>

                {/* Title */}
                <h3 className="font-semibold text-gray-800 mb-1">{job.title}</h3>

                {/* Description (2 lines) */}
                <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                  {job.description}
                </p>

                {/* Photo thumbnails */}
                {photos.length > 0 && (
                  <div className="flex gap-1.5 mb-2">
                    {photos.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`Job photo ${idx + 1}`}
                        className="w-14 h-14 rounded-lg object-cover border border-gray-200"
                      />
                    ))}
                  </div>
                )}

                {/* Meta row */}
                <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-400">
                  {job.location && (
                    <span className="flex items-center gap-1 truncate max-w-[120px]">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{job.location}</span>
                    </span>
                  )}
                  {job.budget != null && job.budget > 0 ? (
                    <span className="flex items-center gap-1 font-medium text-gray-700">
                      <IndianRupee className="h-3 w-3" />
                      {job.budget.toLocaleString('en-IN')}
                    </span>
                  ) : (
                    <span className="text-blue-600 font-medium">Open to quotes</span>
                  )}
                  {job.urgency && urgencyLabels[job.urgency] && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {urgencyLabels[job.urgency]}
                    </span>
                  )}
                  <span className="flex items-center gap-1 ml-auto">
                    <MessageCircle className="h-3 w-3" />
                    {quoteCount}
                  </span>
                </div>
              </button>
            )
          })
        )}
      </div>

      <BottomNav />
    </div>
  )
}
