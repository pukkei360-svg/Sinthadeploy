'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import BottomNav from './BottomNav'
import { ArrowLeft, Briefcase, MapPin, IndianRupee, Clock, CheckCircle, MessageCircle } from 'lucide-react'
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
  photoUrls: string | null
  hasQuoted: boolean
  myQuoteStatus: string | null
  client: { id: string; name: string; photoUrl: string | null; location: string | null }
  category: { id: string; name: string }
  _count: { quotes: number }
}

export default function OpenJobsScreen() {
  const { navigate, user } = useAppStore()
  const { toast } = useToast()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const loadJobs = async () => {
      try {
        const data = await apiFetch(`/jobs?providerId=${user.id}`)
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
        <button onClick={() => navigate('provider-dashboard')} className="text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">Open Jobs</h1>
        <Badge variant="secondary" className="ml-auto text-[10px]">{jobs.length}</Badge>
      </div>

      {/* Category hint */}
      <div className="bg-blue-50 border-b border-blue-100 px-4 py-2">
        <p className="text-xs text-blue-700 text-center">
          Showing jobs matching your service category
        </p>
      </div>

      <div className="px-4 py-4 space-y-3 max-w-lg mx-auto">
        {loading ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)
        ) : jobs.length === 0 ? (
          <div className="text-center py-16">
            <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No open jobs right now</p>
            <p className="text-gray-300 text-xs mt-1">Check back later — new jobs are posted daily</p>
          </div>
        ) : (
          jobs.map((job) => (
            <button
              key={job.id}
              onClick={() => navigate('job-detail', { jobId: job.id })}
              className="w-full bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-left hover:shadow-md transition-shadow"
            >
              {/* Client info */}
              <div className="flex items-center gap-2 mb-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={job.client.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(job.client.name)}&background=2563eb&color=fff&size=64`} />
                  <AvatarFallback className="text-[10px]">{job.client.name[0]}</AvatarFallback>
                </Avatar>
                <p className="text-xs text-gray-500">{job.client.name}</p>
                <span className="text-[10px] text-gray-400 ml-auto">{formatTime(job.createdAt)}</span>
              </div>

              {/* Title + quote status */}
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="font-semibold text-gray-800 text-sm flex-1">{job.title}</p>
                {job.hasQuoted && (
                  <Badge className="bg-green-100 text-green-700 border-0 text-[9px] shrink-0">
                    <CheckCircle className="h-2.5 w-2.5 mr-0.5" /> Quoted
                  </Badge>
                )}
              </div>

              <p className="text-xs text-gray-600 line-clamp-2 mb-2">{job.description}</p>

              {/* Photo thumbnail (if job has photos) */}
              {job.photoUrls && (() => {
                try {
                  const photos = JSON.parse(job.photoUrls) as string[]
                  if (!Array.isArray(photos) || photos.length === 0) return null
                  return (
                    <div className="flex gap-1 mb-2">
                      {photos.slice(0, 2).map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt={`Job photo ${i + 1}`}
                          className="w-12 h-12 object-cover rounded border border-gray-200"
                        />
                      ))}
                      <span className="text-[9px] text-gray-400 self-center ml-1">
                        📷 {photos.length} photo{photos.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  )
                } catch {
                  return null
                }
              })()}

              {/* Job meta */}
              <div className="flex items-center gap-3 text-[10px] text-gray-500 flex-wrap">
                {job.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {job.location}
                  </span>
                )}
                {job.budget ? (
                  <span className="flex items-center gap-1 font-semibold text-green-600">
                    <IndianRupee className="h-3 w-3" /> {job.budget}
                  </span>
                ) : (
                  <span className="text-gray-400">Open to quotes</span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {job.urgency === 'today' ? 'Today' : job.urgency === 'this_week' ? 'This week' : 'Flexible'}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" /> {job._count.quotes} quotes
                </span>
              </div>
            </button>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  )
}
