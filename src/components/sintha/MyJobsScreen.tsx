'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { cleanError } from '@/lib/clean-error'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import BottomNav from './BottomNav'
import {
  ArrowLeft, Briefcase, MessageCircle, Plus, Clock, MapPin, IndianRupee,
} from 'lucide-react'

interface JobListItem {
  id: string
  title: string
  description: string
  status: string
  location?: string | null
  budget?: number | null
  preferredDate?: string | null
  urgency?: string
  createdAt: string
  category?: { id: string; name: string }
  _count?: { quotes: number }
}

const statusStyles: Record<string, { label: string; className: string }> = {
  open: { label: 'Open', className: 'bg-green-100 text-green-700' },
  awarded: { label: 'Awarded', className: 'bg-blue-100 text-blue-700' },
  closed: { label: 'Closed', className: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
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

export default function MyJobsScreen() {
  const { navigate, user } = useAppStore()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState<JobListItem[]>([])

  useEffect(() => {
    const loadJobs = async () => {
      if (!user) return
      setLoading(true)
      try {
        const data = await apiFetch<{ jobs: JobListItem[] }>(`/jobs?clientId=${user.id}`)
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
        <button onClick={() => navigate('home')} className="text-gray-600" aria-label="Go back">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-800 flex-1">My Jobs</h1>
        <Button
          size="sm"
          className="sintha-gradient text-white h-9 px-3"
          onClick={() => navigate('post-job')}
        >
          <Plus className="h-4 w-4 mr-1" /> Post
        </Button>
      </div>

      {/* List */}
      <div className="px-4 py-4 space-y-3 max-w-lg mx-auto">
        {loading ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
        ) : jobs.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Briefcase className="h-8 w-8 text-gray-300" />
            </div>
            <h3 className="text-base font-semibold text-gray-800 mb-1">No jobs yet</h3>
            <p className="text-sm text-gray-500 mb-5">
              Post your first job and get quotes from trusted providers.
            </p>
            <Button
              className="sintha-gradient text-white px-6"
              onClick={() => navigate('post-job')}
            >
              <Plus className="h-4 w-4 mr-1" /> Post Your First Job
            </Button>
          </div>
        ) : (
          jobs.map((job) => {
            const status = statusStyles[job.status] || statusStyles.open
            const quoteCount = job._count?.quotes ?? 0
            return (
              <button
                key={job.id}
                onClick={() => navigate('job-detail', { jobId: job.id })}
                className="w-full bg-white rounded-xl p-4 shadow-sm text-left sintha-card-hover"
              >
                {/* Top row: title + status */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 truncate">{job.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{job.category?.name || 'Uncategorized'}</p>
                  </div>
                  <Badge className={`${status.className} text-[10px] border-0 whitespace-nowrap`}>
                    {status.label}
                  </Badge>
                </div>

                {/* Description (2 lines) */}
                <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                  {job.description}
                </p>

                {/* Meta row */}
                <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTimeAgo(job.createdAt)}
                  </span>
                  {job.location && (
                    <span className="flex items-center gap-1 truncate max-w-[120px]">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{job.location}</span>
                    </span>
                  )}
                  {job.budget != null && job.budget > 0 && (
                    <span className="flex items-center gap-1 font-medium text-gray-600">
                      <IndianRupee className="h-3 w-3" />
                      {job.budget.toLocaleString('en-IN')}
                    </span>
                  )}
                  <span className="flex items-center gap-1 ml-auto">
                    <MessageCircle className="h-3 w-3" />
                    {quoteCount} {quoteCount === 1 ? 'quote' : 'quotes'}
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
