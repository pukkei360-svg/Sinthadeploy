'use client'

import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { uploadVerificationPhoto } from '@/lib/cloudinary'
import { useToast } from '@/hooks/use-toast'
import { cleanError } from '@/lib/clean-error'
import { getFestivalJobTemplates } from '@/lib/festivals'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft, Briefcase, Loader2, MapPin, Calendar, IndianRupee,
  Zap, Camera, XCircle, Image as ImageIcon,
} from 'lucide-react'

const URGENCY_OPTIONS = [
  { id: 'urgent', label: 'Today', hint: 'Need it today' },
  { id: 'soon', label: 'This Week', hint: 'Within a few days' },
  { id: 'flexible', label: 'Flexible', hint: 'No rush' },
] as const

const MAX_PHOTOS = 2

export default function PostJobScreen() {
  const { navigate, user, categories } = useAppStore()
  const { toast } = useToast()

  // Festival quick-fill templates (only shown when a festival is active/upcoming)
  const festivalTemplates = getFestivalJobTemplates()

  const [categoryId, setCategoryId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [budget, setBudget] = useState('')
  const [preferredDate, setPreferredDate] = useState('')
  const [urgency, setUrgency] = useState<'urgent' | 'soon' | 'flexible'>('flexible')

  // Photos: each entry is either { file, preview, uploading, url } — once
  // uploaded successfully, `url` is the Cloudinary URL we send to the API.
  const [photos, setPhotos] = useState<
    Array<{ file: File; preview: string; uploading: boolean; url?: string; error?: boolean }>
  >([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [submitting, setSubmitting] = useState(false)

  // Pre-fill location from the logged-in user's profile
  useEffect(() => {
    if (user?.location) setLocation(user.location)
  }, [user])

  const handleAddPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const remaining = MAX_PHOTOS - photos.length
    if (remaining <= 0) {
      toast({ title: 'Max 2 photos', description: 'You can attach up to 2 photos per job.' })
      return
    }

    const toAdd = Array.from(files).slice(0, remaining)

    // Add placeholders immediately so the user sees the thumbnails right away,
    // then upload each one to Cloudinary and patch in the resulting URL.
    const startIndex = photos.length
    const placeholders = toAdd.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: true,
    }))
    setPhotos((prev) => [...prev, ...placeholders])

    for (let i = 0; i < toAdd.length; i++) {
      const file = toAdd[i]
      const result = await uploadVerificationPhoto(file, 'job-photos')
      setPhotos((prev) =>
        prev.map((p, idx) => {
          if (idx !== startIndex + i) return p
          if (!result.success || !result.url) {
            return { ...p, uploading: false, error: true }
          }
          return { ...p, uploading: false, url: result.url }
        }),
      )
    }

    // Reset the file input so the same file can be re-selected if needed
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => {
      const next = [...prev]
      const [removed] = next.splice(index, 1)
      // Revoke object URL to avoid memory leaks
      if (removed?.preview) URL.revokeObjectURL(removed.preview)
      return next
    })
  }

  const handleSubmit = async () => {
    // Basic client-side validation
    if (!categoryId) {
      toast({ title: 'Pick a category', description: 'Select a service category first.' })
      return
    }
    if (!title.trim() || title.trim().length < 3) {
      toast({ title: 'Title too short', description: 'At least 3 characters.' })
      return
    }
    if (title.length > 80) {
      toast({ title: 'Title too long', description: 'Maximum 80 characters.' })
      return
    }
    if (!description.trim() || description.trim().length < 10) {
      toast({ title: 'Description too short', description: 'At least 10 characters.' })
      return
    }
    if (description.length > 1000) {
      toast({ title: 'Description too long', description: 'Maximum 1000 characters.' })
      return
    }

    // Wait for any uploads still in-flight
    const stillUploading = photos.some((p) => p.uploading)
    if (stillUploading) {
      toast({ title: 'Uploading photos...', description: 'Please wait a moment.' })
      return
    }
    const failedUploads = photos.filter((p) => !p.url)
    if (failedUploads.length > 0) {
      toast({ title: 'Photo upload failed', description: 'Please remove and retry the failed photo.' })
      return
    }

    if (!user) {
      toast({ title: 'Please log in', description: 'You need an account to post a job.', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      const photoUrls = photos.map((p) => p.url!).filter(Boolean)
      const data = await apiFetch<{ job: { id: string } }>('/jobs', {
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
          photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
        }),
      })

      toast({ title: 'Job posted!', description: 'Providers in this category have been notified.' })
      navigate('job-detail', { jobId: data.job.id })
    } catch (err) {
      toast({
        title: 'Could not post job',
        description: cleanError(err),
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button
          onClick={() => navigate('my-jobs')}
          className="text-gray-600"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">Post a Job</h1>
      </div>

      <div className="px-4 py-4 space-y-5 max-w-lg mx-auto pb-10">
        {/* Festival quick-fill templates */}
        {festivalTemplates && festivalTemplates.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1">
              <Zap className="h-3.5 w-3.5" /> Festival quick-fill
            </p>
            <div className="flex flex-wrap gap-2">
              {festivalTemplates.map((tpl) => (
                <button
                  key={tpl}
                  onClick={() => setTitle(tpl)}
                  className="px-3 py-1.5 rounded-full bg-white border border-amber-300 text-xs text-amber-800 font-medium hover:bg-amber-100 transition-colors"
                >
                  {tpl}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Category picker */}
        <div>
          <Label className="text-sm font-semibold text-gray-800 mb-2 block">
            Category <span className="text-red-500">*</span>
          </Label>
          {categories.length === 0 ? (
            <p className="text-xs text-gray-400">Loading categories...</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {categories.map((cat) => {
                const selected = categoryId === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      selected
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Briefcase className={`h-5 w-5 mx-auto mb-1 ${selected ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className="text-[11px] font-medium leading-tight block">{cat.name}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Title */}
        <div>
          <Label htmlFor="title" className="text-sm font-semibold text-gray-800 mb-2 block">
            Job Title <span className="text-red-500">*</span>
          </Label>
          <Input
            id="title"
            placeholder="e.g., Need electrician for fan installation"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
          />
          <p className="text-[10px] text-gray-400 mt-1 text-right">{title.length}/80</p>
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description" className="text-sm font-semibold text-gray-800 mb-2 block">
            Description <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="description"
            placeholder="Describe what you need done. Be specific — providers will quote based on this."
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
          />
          <p className="text-[10px] text-gray-400 mt-1 text-right">{description.length}/1000</p>
        </div>

        {/* Photos */}
        <div>
          <Label className="text-sm font-semibold text-gray-800 mb-2 block">
            Photos <span className="text-gray-400 font-normal">(optional, up to {MAX_PHOTOS})</span>
          </Label>
          <div className="flex gap-2 flex-wrap">
            {photos.map((photo, idx) => (
              <div
                key={idx}
                className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200 bg-gray-100"
              >
                <img
                  src={photo.preview}
                  alt={`Photo ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                {photo.uploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                  </div>
                )}
                {photo.error && (
                  <div className="absolute inset-0 bg-red-500/40 flex items-center justify-center">
                    <XCircle className="h-6 w-6 text-white" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(idx)}
                  className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 rounded-full p-0.5"
                  aria-label="Remove photo"
                >
                  <XCircle className="h-3.5 w-3.5 text-white" />
                </button>
              </div>
            ))}

            {photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
              >
                <Camera className="h-6 w-6 mb-1" />
                <span className="text-[10px] font-medium">Add Photo</span>
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleAddPhotos(e.target.files)}
          />
          {photos.length === 0 && (
            <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
              <ImageIcon className="h-3 w-3" /> Photos help providers quote more accurately.
            </p>
          )}
        </div>

        {/* Location */}
        <div>
          <Label htmlFor="location" className="text-sm font-semibold text-gray-800 mb-2 block">
            Location
          </Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="location"
              placeholder="e.g., Imphal, Manipur"
              className="pl-10"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        </div>

        {/* Budget + Preferred date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="budget" className="text-sm font-semibold text-gray-800 mb-2 block">
              Budget <span className="text-gray-400 font-normal">(optional)</span>
            </Label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="budget"
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="500"
                className="pl-10"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="preferredDate" className="text-sm font-semibold text-gray-800 mb-2 block">
              Preferred Date
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="preferredDate"
                type="date"
                className="pl-10"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
        </div>

        {/* Urgency */}
        <div>
          <Label className="text-sm font-semibold text-gray-800 mb-2 block">
            Urgency
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {URGENCY_OPTIONS.map((opt) => {
              const selected = urgency === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setUrgency(opt.id)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    selected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <Zap className={`h-4 w-4 mx-auto mb-1 ${selected ? 'text-blue-600' : 'text-gray-400'}`} />
                  <p className={`text-xs font-semibold ${selected ? 'text-blue-700' : 'text-gray-700'}`}>
                    {opt.label}
                  </p>
                  <p className="text-[9px] text-gray-400 mt-0.5">{opt.hint}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Submit */}
        <Button
          className="w-full sintha-gradient text-white py-6 font-semibold text-base"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Posting Job...
            </>
          ) : (
            <>
              <Briefcase className="h-4 w-4 mr-2" /> Post Job
            </>
          )}
        </Button>

        <p className="text-[10px] text-center text-gray-400">
          Providers in your selected category will be notified instantly.
        </p>
      </div>
    </div>
  )
}
