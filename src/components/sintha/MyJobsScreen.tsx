'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import BottomNav from './BottomNav'
import { ArrowLeft, Briefcase, MessageCircle, Plus, Clock, MapPin, IndianRupee } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Job {
  id: string
  title: string
  description: string
  status: string
  location: string | null
  budget: number | null
  urgency: string
  createdAt: string
  category: { id: string; name: string; icon: string | null }
  _count: { quotes: number }
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: 'Open', color: 'bg-green-100 text-green-700' },
  awarded: { label: 'Awarded', color: 'bg-blue-100 text-blue-700' },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
}

export default function MyJobsScreen() {
  const { navigate, user } = useAppStore()
  const { toast } = useToast()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const loadJobs = async () => {
      try {
        const data = await apiFetch(`/jobs?clientId=${user.id}`)
        setJobs(data.jobs || [])
      } catch {
        toast({ title: 'Failed to load jobs' })
      } finally {
        setLoading(false)
      }
    }
    loadJobs()
  }, [user, toast])

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diffHrs = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60))
    if (diffHrs < 1) return 'just now'
    if (diffHrs < 24) return `${diffHrs}h ago`
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate('home')} className="text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">My Jobs</h1>
        <Button
          size="sm"
          className="ml-auto sintha-gradient text-white"
          onClick={() => navigate('post-job')}
        >
          <Plus className="h-4 w-4 mr-1" /> Post
        </Button>
      </div>

      <div className="px-4 py-4 space-y-3 max-w-lg mx-auto">
        {loading ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
        ) : jobs.length === 0 ? (
          <div className="text-center py-16">
            <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No jobs posted yet</p>
            <p className="text-gray-300 text-xs mt-1">Post a job and let providers come to you</p>
            <Button
              className="mt-4 sintha-gradient text-white"
              onClick={() => navigate('post-job')}
            >
              <Plus className="h-4 w-4 mr-1" /> Post Your First Job
            </Button>
          </div>
        ) : (
          jobs.map((job) => {
            const status = STATUS_LABELS[job.status] || STATUS_LABELS.open
            return (
              <button
                key={job.id}
                onClick={() => navigate('job-detail', { jobId: job.id })}
                className="w-full bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-left hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{job.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{job.category.name}</p>
                  </div>
                  <Badge className={`${status.color} border-0 text-[10px]`}>{status.label}</Badge>
                </div>

                <p className="text-xs text-gray-600 line-clamp-2 mb-3">{job.description}</p>

                <div className="flex items-center gap-3 text-[10px] text-gray-500 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {formatTime(job.createdAt)}
                  </span>
                  {job.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {job.location}
                    </span>
                  )}
                  {job.budget && (
                    <span className="flex items-center gap-1">
                      <IndianRupee className="h-3 w-3" /> {job.budget}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" /> {job._count.quotes} {job._count.quotes === 1 ? 'quote' : 'quotes'}
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
