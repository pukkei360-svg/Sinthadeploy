'use client'

import { useState, useEffect, useRef } from 'react'
import { useAppStore, type ServiceCategory } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { uploadVerificationPhoto } from '@/lib/cloudinary'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Briefcase, Loader2, MapPin, Calendar, IndianRupee, Zap, Camera, XCircle, Image as ImageIcon, Sparkles } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cleanError } from '@/lib/clean-error'

const URGENCY_OPTIONS = [
  { id: 'today', label: 'Today', desc: 'Need it done today' },
  { id: 'this_week', label: 'This Week', desc: 'Sometime in the next 7 days' },
  { id: 'flexible', label: 'Flexible', desc: 'No rush — whenever works' },
]

const MAX_PHOTOS = 2

export default function PostJobScreen() {
  const { navigate, user, categories, viewParams } = useAppStore()
  const { toast } = useToast()

  const [categoryId, setCategoryId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState(user?.location || '')
  const [budget, setBudget] = useState('')
  const [preferredDate, setPreferredDate] = useState('')
  const [urgency, setUrgency] = useState('flexible')
  const [submitting, setSubmitting] = useState(false)

  // AI Improve loading state — drives the spinner on the "AI Improve" button.
  const [improveLoading, setImproveLoading] = useState(false)

  // Pre-fill description if the user came from the AI Price Estimator's
  // "Post this job →" button (viewParams.prefilledDescription).
  useEffect(() => {
    if (viewParams.prefilledDescription && !description) {
      setDescription(viewParams.prefilledDescription)
    }
  }, [viewParams.prefilledDescription, description])

  const handleAiImprove = async () => {
    const desc = description.trim()
    if (desc.length < 10 || improveLoading) return
    setImproveLoading(true)
    try {
      const catName = categories.find((c) => c.id === categoryId)?.name
      const data = await apiFetch<{
        improvedTitle?: string
        improvedDescription?: string
        tips?: string[]
        qualityScore?: number
        poweredBy?: string
      }>('/ai/improve-job', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim() || undefined,
          description: desc,
          category: catName,
        }),
      })
      if (data.improvedTitle) setTitle(data.improvedTitle.slice(0, 80))
      if (data.improvedDescription) setDescription(data.improvedDescription.slice(0, 1000))
      toast({
        title: 'Description improved ✨',
        description:
          typeof data.qualityScore === 'number'
            ? `Quality score: ${data.qualityScore}/100`
            : 'SINTHA AI polished your job post',
      })
    } catch (err) {
      toast({ title: 'AI Improve failed', description: cleanError(err) })
    } finally {
      setImproveLoading(false)
    }
  }

  // Photo attachments (optional, max 2)
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  // Pre-fill location from user profile
  useEffect(() => {
    if (user?.location && !location) {
      setLocation(user.location)
    }
  }, [user, location])

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Validate file types
    const invalid = files.find((f) => !f.type.startsWith('image/'))
    if (invalid) {
      toast({ title: 'Invalid file', description: 'Please select image files only' })
      return
    }

    // Check max count
    const remaining = MAX_PHOTOS - photoFiles.length
    if (remaining <= 0) {
      toast({ title: 'Max photos reached', description: `You can attach up to ${MAX_PHOTOS} photos` })
      return
    }

    const toAdd = files.slice(0, remaining)
    if (files.length > remaining) {
      toast({ title: 'Only added some photos', description: `Max ${MAX_PHOTOS} photos per job` })
    }

    setPhotoFiles([...photoFiles, ...toAdd])
    setPhotoPreviews([...photoPreviews, ...toAdd.map((f) => URL.createObjectURL(f))])
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  const removePhoto = (index: number) => {
    const newFiles = [...photoFiles]
    const newPreviews = [...photoPreviews]
    URL.revokeObjectURL(newPreviews[index])
    newFiles.splice(index, 1)
    newPreviews.splice(index, 1)
    setPhotoFiles(newFiles)
    setPhotoPreviews(newPreviews)
  }

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: 'Please log in' })
      return
    }
    if (!categoryId) {
      toast({ title: 'Select a category' })
      return
    }
    if (title.trim().length < 3) {
      toast({ title: 'Title too short', description: 'At least 3 characters' })
      return
    }
    if (description.trim().length < 10) {
      toast({ title: 'Description too short', description: 'At least 10 characters' })
      return
    }

    setSubmitting(true)

    // Upload photos to Cloudinary first (if any)
    let uploadedPhotoUrls: string[] = []
    if (photoFiles.length > 0) {
      setUploadingPhotos(true)
      try {
        const uploadResults = await Promise.all(
          photoFiles.map((file) => uploadVerificationPhoto(file, 'jobs'))
        )
        const failed = uploadResults.find((r) => !r.success)
        if (failed) {
          throw new Error(failed.error || 'Failed to upload photo')
        }
        uploadedPhotoUrls = uploadResults
          .filter((r): r is { success: true; url: string } => r.success && !!r.url)
          .map((r) => r.url)
      } catch (err) {
        toast({ title: 'Photo upload failed', description: cleanError(err) })
        setSubmitting(false)
        setUploadingPhotos(false)
        return
      }
      setUploadingPhotos(false)
    }

    try {
      const data = await apiFetch('/jobs', {
        method: 'POST',
        body: JSON.stringify({
          clientId: user.id,
          categoryId,
          title: title.trim(),
          description: description.trim(),
          location: location.trim() || undefined,
          budget: budget ? Number(budget) : undefined,
          preferredDate: preferredDate || undefined,
          urgency,
          photoUrls: uploadedPhotoUrls.length > 0 ? uploadedPhotoUrls : undefined,
        }),
      })

      toast({
        title: 'Job posted!',
        description: 'Providers in this category will be notified.',
      })
      navigate('job-detail', { jobId: data.job.id })
    } catch (err) {
      toast({ title: 'Failed to post job', description: cleanError(err) })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate('home')} className="text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">Post a Job</h1>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
          <Briefcase className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            Describe what you need and providers will send you quotes. Pick the best one — no obligation.
          </p>
        </div>

        {/* Category */}
        <div>
          <label className="text-sm font-semibold text-gray-800 block mb-2">
            Category <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {categories.map((cat: ServiceCategory) => (
              <button
                key={cat.id}
                onClick={() => setCategoryId(cat.id)}
                className={`p-3 rounded-xl border text-center text-xs font-medium transition-colors ${
                  categoryId === cat.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-sm font-semibold text-gray-800 block mb-2">
            Job Title <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="e.g. Fix ceiling fan in bedroom"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
          />
          <p className="text-[10px] text-gray-400 mt-1">{title.length}/80</p>
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-gray-800 block">
              Description <span className="text-red-500">*</span>
            </label>
            {/* AI Improve button — only appears once the user has written at
                least 10 characters, so it never feels like noise on an empty
                form. Purple gradient + Sparkles icon ties it visually to the
                other SINTHA AI surfaces. */}
            {description.trim().length >= 10 && (
              <button
                type="button"
                onClick={handleAiImprove}
                disabled={improveLoading || submitting}
                className="flex items-center gap-1.5 text-[11px] font-bold bg-gradient-to-r from-purple-600 to-violet-600 text-white px-2.5 py-1.5 rounded-full disabled:opacity-60 active:scale-95 transition-transform"
              >
                {improveLoading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Improving...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3" />
                    AI Improve
                  </>
                )}
              </button>
            )}
          </div>
          <textarea
            placeholder="Describe what you need done. E.g. 'The ceiling fan in my bedroom makes a noise when turned on. Need someone to check and repair it. I'm home after 5pm.'"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={5}
            className="w-full p-3 border border-gray-200 rounded-xl bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <div className="flex items-center justify-between mt-1">
            <p className="text-[10px] text-gray-400">{description.length}/1000</p>
            {description.trim().length < 10 && (
              <p className="text-[10px] text-gray-400">
                Write {10 - description.trim().length} more chars to enable AI Improve
              </p>
            )}
          </div>
        </div>

        {/* Photos (optional, max 2) */}
        <div>
          <label className="text-sm font-semibold text-gray-800 block mb-2 flex items-center gap-1">
            <Camera className="h-3.5 w-3.5" /> Photos
            <span className="text-[10px] text-gray-400 font-normal">(optional, up to {MAX_PHOTOS})</span>
          </label>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoSelect}
            className="hidden"
            disabled={submitting || photoFiles.length >= MAX_PHOTOS}
          />

          {photoPreviews.length === 0 ? (
            <button
              onClick={() => photoInputRef.current?.click()}
              disabled={submitting}
              className="w-full border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-blue-400 transition-colors"
            >
              <ImageIcon className="h-6 w-6 text-gray-400 mx-auto mb-1" />
              <p className="text-sm text-gray-600 font-medium">Add photos of the job</p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Help providers see the problem before quoting · Up to {MAX_PHOTOS} photos
              </p>
            </button>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {photoPreviews.map((preview, i) => (
                  <div key={i} className="relative">
                    <img
                      src={preview}
                      alt={`Job photo ${i + 1}`}
                      className="w-full h-28 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      onClick={() => removePhoto(i)}
                      disabled={submitting}
                      className="absolute top-1 right-1 bg-white rounded-full p-1 shadow hover:bg-gray-100"
                    >
                      <XCircle className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                ))}
                {photoFiles.length < MAX_PHOTOS && (
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    disabled={submitting}
                    className="border-2 border-dashed border-gray-300 rounded-lg h-28 flex items-center justify-center hover:border-blue-400 transition-colors"
                  >
                    <Camera className="h-6 w-6 text-gray-400" />
                    <span className="text-xs text-gray-500 ml-1">Add more</span>
                  </button>
                )}
              </div>
              <p className="text-[10px] text-gray-400">
                {photoFiles.length} of {MAX_PHOTOS} photos attached
              </p>
            </div>
          )}
        </div>

        {/* Location */}
        <div>
          <label className="text-sm font-semibold text-gray-800 block mb-2 flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> Location
          </label>
          <Input
            placeholder="e.g. Imphal, Manipur"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={100}
          />
        </div>

        {/* Budget */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-gray-800 flex items-center gap-1">
              <IndianRupee className="h-3.5 w-3.5" /> Budget (optional)
            </label>
            <button
              type="button"
              onClick={() => navigate('price-estimator')}
              className="text-[11px] font-medium text-purple-700 hover:text-purple-800 flex items-center gap-1"
            >
              <Sparkles className="h-3 w-3" />
              Estimate with AI
            </button>
          </div>
          <Input
            type="number"
            placeholder="e.g. 500 (leave blank for open quotes)"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            min="0"
          />
          <p className="text-[10px] text-gray-400 mt-1">
            Leave blank if you want providers to suggest a price.
          </p>
        </div>

        {/* Preferred date */}
        <div>
          <label className="text-sm font-semibold text-gray-800 block mb-2 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> Preferred Date (optional)
          </label>
          <Input
            type="date"
            value={preferredDate}
            onChange={(e) => setPreferredDate(e.target.value)}
          />
        </div>

        {/* Urgency */}
        <div>
          <label className="text-sm font-semibold text-gray-800 block mb-2 flex items-center gap-1">
            <Zap className="h-3.5 w-3.5" /> Urgency
          </label>
          <div className="grid grid-cols-3 gap-2">
            {URGENCY_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setUrgency(opt.id)}
                className={`p-2 rounded-lg border text-center transition-colors ${
                  urgency === opt.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <p className="text-xs font-semibold text-gray-800">{opt.label}</p>
                <p className="text-[9px] text-gray-500 mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <Button
          className="w-full sintha-gradient text-white py-5 font-bold"
          onClick={handleSubmit}
          disabled={submitting || !categoryId || !title.trim() || !description.trim()}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {uploadingPhotos ? 'Uploading photos...' : 'Posting...'}
            </>
          ) : (
            <><Briefcase className="h-4 w-4 mr-2" /> Post Job</>
          )}
        </Button>

        <p className="text-[10px] text-center text-gray-400">
          Providers in this category will be notified instantly.
        </p>
      </div>
    </div>
  )
}
