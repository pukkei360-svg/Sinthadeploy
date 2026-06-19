'use client'

import { useState, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Home, Briefcase, ArrowRight, Loader2, Shield, Zap, Users, Camera, ImagePlus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { uploadPhoto } from '@/lib/cloudinary'

export default function RoleSelectScreen() {
  const { user, setUser, navigate, token } = useAppStore()
  const { toast } = useToast()
  const [loading, setLoading] = useState<string | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (event.target === cameraInputRef.current) cameraInputRef.current.value = ''
    if (event.target === galleryInputRef.current) galleryInputRef.current.value = ''
    setUploadingPhoto(true)
    try {
      const result = await uploadPhoto(file, 'profiles')
      if (!result.success || !result.url) throw new Error(result.error || 'Upload failed')
      setPhotoUrl(result.url)
      toast({ title: 'Photo Added!', description: 'Looking great! Now choose your role' })
    } catch (err: unknown) {
      toast({ title: 'Upload Failed', description: (err as Error).message, variant: 'destructive' })
    } finally { setUploadingPhoto(false) }
  }

  const selectRole = async (role: string) => {
    if (!user || loading) return
    setLoading(role)
    try {
      if (role === 'client') {
        // Update role to client
        await apiFetch('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ userId: user.id, role: 'client' }),
        })
        const updatedUser = { ...user, role: 'client' }
        setUser(updatedUser, token)
        toast({
          title: 'Welcome to SINTHA!',
          description: 'Find trusted service providers in Manipur',
        })
        navigate('home')
      } else if (role === 'provider') {
        // Navigate to provider onboarding - role will be set after profile creation
        toast({
          title: "Let's set up your provider profile",
          description: 'Fill in your details to start offering services',
        })
        navigate('provider-onboarding')
      }
    } catch (err: unknown) {
      const message = (err as Error).message || 'Something went wrong'
      toast({ title: 'Error', description: message, variant: 'destructive' })
      // Still navigate on client side even if API fails
      if (role === 'client') {
        const updatedUser = { ...user, role: 'client' }
        setUser(updatedUser, token)
        navigate('home')
      } else {
        navigate('provider-onboarding')
      }
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">How would you like to use SINTHA?</h1>
        <p className="text-gray-500 mt-2">You can always switch later from your profile</p>
      </div>

      <div className="w-full max-w-md space-y-4">
        {/* Photo Upload Section — two options: Take Selfie or Upload from Gallery */}
        <div className="bg-white border-2 border-blue-200 rounded-2xl p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-1">Add your profile photo</p>
          <p className="text-[11px] text-gray-500 mb-4">Strongly recommended for building trust</p>
          <div className="relative inline-block mb-4">
            <Avatar className="h-24 w-24 border-4 border-blue-100 mx-auto">
              <AvatarImage src={photoUrl || user?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=2563eb&color=fff&size=200`} />
              <AvatarFallback className="text-3xl font-bold text-blue-600">{user?.name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
          </div>
          {/* Two buttons: Camera (selfie) + Gallery */}
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="flex flex-col items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl px-4 py-3 transition-colors disabled:opacity-50"
            >
              {uploadingPhoto ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
              <span className="text-xs font-medium">Take Selfie</span>
            </button>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="flex flex-col items-center gap-1 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl px-4 py-3 transition-colors disabled:opacity-50"
            >
              {uploadingPhoto ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
              <span className="text-xs font-medium">Gallery</span>
            </button>
          </div>
          {/* Hidden file inputs */}
          <input ref={cameraInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" capture="user" />
          <input ref={galleryInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
          {photoUrl && (
            <p className="text-xs text-green-600 mt-3 font-medium">✓ Photo added! You can continue now</p>
          )}
        </div>
        {/* Client Card */}
        <Card
          className="cursor-pointer sintha-card-hover border-2 border-transparent hover:border-blue-300"
          onClick={() => selectRole('client')}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl sintha-gradient flex items-center justify-center shrink-0">
              <Home className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-800 text-lg">Continue as Client</h3>
              {/* Meitei Mayek tagline: "Thabk nekkadaba thoubu" = I want to hire services */}
              <p
                className="text-base text-gray-700 mt-1 font-medium"
                style={{ fontFamily: 'var(--font-meetei-mayek), sans-serif' }}
                lang="mni-Mtei"
              >
                ꯊꯕꯛ ꯅꯦꯀꯗꯕ ꯊꯧꯕꯨ
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5 italic">
                Thabk nekkadaba thoubu
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Find and book trusted service providers in Manipur
              </p>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3 text-blue-500" />
                  <span className="text-[10px] text-gray-400">Verified</span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="h-3 w-3 text-blue-500" />
                  <span className="text-[10px] text-gray-400">Fast</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3 text-blue-500" />
                  <span className="text-[10px] text-gray-400">Trusted</span>
                </div>
              </div>
            </div>
            {loading === 'client' ? (
              <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
            ) : (
              <ArrowRight className="h-5 w-5 text-gray-400" />
            )}
          </CardContent>
        </Card>

        {/* Provider Card */}
        <Card
          className="cursor-pointer sintha-card-hover border-2 border-transparent hover:border-green-300"
          onClick={() => selectRole('provider')}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
              <Briefcase className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-800 text-lg">Continue as Provider</h3>
              {/* Meitei Mayek tagline: "Thabk sugadaba sinmi" = I want to provide services */}
              <p
                className="text-base text-gray-700 mt-1 font-medium"
                style={{ fontFamily: 'var(--font-meetei-mayek), sans-serif' }}
                lang="mni-Mtei"
              >
                ꯊꯕꯛ ꯁꯨꯒꯗꯕ ꯁꯤꯟꯃꯤ
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5 italic">
                Thabk sugadaba sinmi
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Offer your services and grow your business with zero commission
              </p>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <Zap className="h-3 w-3 text-green-500" />
                  <span className="text-[10px] text-gray-400">0% Commission</span>
                </div>
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3 text-green-500" />
                  <span className="text-[10px] text-gray-400">Verified Badge</span>
                </div>
              </div>
            </div>
            {loading === 'provider' ? (
              <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
            ) : (
              <ArrowRight className="h-5 w-5 text-gray-400" />
            )}
          </CardContent>
        </Card>
      </div>

      {loading && (
        <div className="mt-6 text-sm text-gray-400">Setting up your account...</div>
      )}

      {/* Trust indicators */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-400">Built for Manipur &bull; Zero commission &bull; AI powered</p>
      </div>
    </div>
  )
}
