'use client'

import { useState, useEffect } from 'react'
import { useAppStore, type ServiceCategory } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, ArrowRight, CheckCircle, Briefcase, GraduationCap, Car, Camera,
  Sparkles, Wrench, Home, Phone, MapPin, DollarSign, Clock, Loader2, Star, Shield
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const categoryIcons: Record<string, typeof Home> = {
  home: Home,
  'graduation-cap': GraduationCap,
  car: Car,
  camera: Camera,
  sparkles: Sparkles,
  wrench: Wrench,
}

const STEPS = ['Category', 'Details', 'Contact', 'Review']

export default function ProviderOnboardingScreen() {
  const { navigate, user, setUser, categories, setCategories, setMyProviderProfile, token, goBack, myProviderProfile } = useAppStore()
  const { toast } = useToast()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [checkingExistingProfile, setCheckingExistingProfile] = useState(true)

  // Form state
  const [selectedCategory, setSelectedCategory] = useState('')
  const [experience, setExperience] = useState('')
  const [skills, setSkills] = useState('')
  const [description, setDescription] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')

  // Pre-fill existing provider data if editing
  const isEditing = user?.role === 'provider'

  // ─────────────────────────────────────────────────────────────
  // CRITICAL: Check if provider already has a profile.
  // If they do, redirect to dashboard immediately.
  // This prevents the 'ask to recreate profile on refresh' bug.
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const checkExistingProfile = async () => {
      if (!user) {
        setCheckingExistingProfile(false)
        return
      }

      // First, check if we already have the profile in the Zustand store
      if (myProviderProfile) {
        navigate('provider-dashboard')
        return
      }

      // Second, check localStorage (survives page refresh in APK)
      try {
        const savedProfile = localStorage.getItem('sintha_provider_profile')
        if (savedProfile) {
          const profile = JSON.parse(savedProfile)
          setMyProviderProfile(profile)
          navigate('provider-dashboard')
          return
        }
      } catch {
        // localStorage parse failed — continue to API check
      }

      // Third, check the API (most reliable but might be slow/fail in APK)
      try {
        const data = await apiFetch(`/providers?userId=${user.id}`)
        const providers = data.providers || []
        if (providers.length > 0) {
          setMyProviderProfile(providers[0])
          // Save to localStorage for future refreshes
          localStorage.setItem('sintha_provider_profile', JSON.stringify(providers[0]))
          navigate('provider-dashboard')
          return
        }
      } catch {
        // API failed — if we get here, the user genuinely has no profile
      }

      // No existing profile found — show the onboarding form
      setCheckingExistingProfile(false)
    }

    checkExistingProfile()
  }, [user, myProviderProfile, navigate, setMyProviderProfile])

  // Load categories (only if we're actually showing the onboarding form)
  useEffect(() => {
    if (checkingExistingProfile) return // Don't load categories while checking
    if (categories.length > 0) return
    const loadCategories = async () => {
      try {
        await apiFetch('/seed', { method: 'POST' })
        const catData = await apiFetch('/categories', { cacheTtl: 5 * 60 * 1000 })
        setCategories(catData.categories || [])
      } catch (err) {
        console.error('Failed to load categories:', err)
      }
    }
    loadCategories()
  }, [checkingExistingProfile])

  const selectedCat = categories.find((c) => c.id === selectedCategory)

  const canProceed = () => {
    switch (step) {
      case 0: return !!selectedCategory
      case 1: return experience.trim().length > 0 && skills.trim().length > 0
      case 2: return phone.trim().length >= 10 && location.trim().length > 0
      case 3: return true
      default: return false
    }
  }

  const handleSubmit = async () => {
    if (!user || !selectedCategory) return
    setLoading(true)
    try {
      // Step 1: Update user role to provider
      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id, role: 'provider' }),
      })

      // Step 2: Update user phone and location via the profile endpoint
      try {
        const profileRes = await apiFetch('/user/profile', {
          method: 'PATCH',
          body: JSON.stringify({ userId: user.id, phone, location }),
        })
        if (profileRes.user) {
          const updatedUserData = profileRes.user
          setUser(updatedUserData, token)
        }
      } catch (profileErr) {
        // Fallback to admin endpoint
        try {
          const adminRes = await apiFetch(`/admin/users/${user.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ phone, location }),
          })
          if (adminRes.user) {
            setUser({ ...user, phone, location, role: 'provider' }, token)
          }
        } catch {
          // Last fallback: just update locally
          setUser({ ...user, phone, location, role: 'provider' }, token)
        }
      }

      // Step 3: Create or update provider profile
      const profileData = await apiFetch('/providers', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          categoryId: selectedCategory,
          experience,
          skills,
          description,
          hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        }),
      })

      setMyProviderProfile(profileData.provider || null)

      // Also save to localStorage so page refreshes don't lose the profile
      if (profileData.provider) {
        localStorage.setItem('sintha_provider_profile', JSON.stringify(profileData.provider))
      }

      toast({
        title: isEditing ? 'Profile Updated!' : 'Provider Profile Created!',
        description: isEditing
          ? 'Your provider profile has been updated successfully'
          : 'You are now listed as a service provider on SINTHA',
      })

      navigate('provider-dashboard')
    } catch (err: unknown) {
      const message = (err as Error).message || 'Failed to create provider profile'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-3">
                <Briefcase className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">What service do you offer?</h2>
              <p className="text-sm text-gray-500 mt-1">Select your primary category</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((cat: ServiceCategory) => {
                const IconComp = categoryIcons[cat.icon || ''] || Home
                const isSelected = selectedCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`rounded-xl p-4 text-center transition-all border-2 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-transparent bg-white shadow-sm hover:border-blue-200'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
                      isSelected ? 'bg-blue-100' : 'bg-gray-50'
                    }`}>
                      <IconComp className={`h-6 w-6 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                    </div>
                    <p className={`text-xs font-semibold ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                      {cat.name}
                    </p>
                    {isSelected && (
                      <CheckCircle className="h-4 w-4 text-blue-500 mx-auto mt-1" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )

      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <div className="w-16 h-16 rounded-2xl sintha-gradient flex items-center justify-center mx-auto mb-3">
                <GraduationCap className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Tell us about your expertise</h2>
              <p className="text-sm text-gray-500 mt-1">Clients want to know what you can do</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience">Experience *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="experience"
                  placeholder="e.g., 5 years"
                  className="pl-10"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="skills">Skills / Services *</Label>
              <Textarea
                id="skills"
                placeholder="e.g., Electrical Wiring, Motor Repair, LED Installation"
                className="min-h-[80px]"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
              />
              <p className="text-[11px] text-gray-400">Separate multiple skills with commas</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">About Your Service</Label>
              <Textarea
                id="description"
                placeholder="Describe what you offer, your approach, and why clients should choose you..."
                className="min-h-[100px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hourlyRate">Hourly Rate (₹)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="hourlyRate"
                  type="number"
                  placeholder="e.g., 300"
                  className="pl-10"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                />
              </div>
              <p className="text-[11px] text-gray-400">You can change this anytime</p>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-3">
                <Phone className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">How can clients reach you?</h2>
              <p className="text-sm text-gray-500 mt-1">This information helps clients find you</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 9876543210"
                  className="pl-10"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <p className="text-[11px] text-gray-400">Your phone number is only shared with booked clients</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location / Area *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="location"
                  placeholder="e.g., Imphal West, Manipur"
                  className="pl-10"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <p className="text-[11px] text-gray-400">Helps clients find nearby providers</p>
            </div>

            {/* Manipur area suggestions */}
            <div>
              <p className="text-xs text-gray-400 mb-2">Popular areas in Manipur:</p>
              <div className="flex flex-wrap gap-1.5">
                {['Imphal West', 'Imphal East', 'Thoubal', 'Bishnupur', 'Kakching'].map(area => (
                  <button
                    key={area}
                    onClick={() => setLocation(area + ', Manipur')}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Review your profile</h2>
              <p className="text-sm text-gray-500 mt-1">Make sure everything looks good</p>
            </div>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Category</span>
                  <Badge className="bg-blue-100 text-blue-700 border-0">{selectedCat?.name || 'Not selected'}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Experience</span>
                  <span className="text-sm font-medium text-gray-800">{experience || '—'}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Skills</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {skills.split(',').map((s, i) => s.trim() && (
                      <Badge key={i} variant="secondary" className="text-[10px]">{s.trim()}</Badge>
                    ))}
                  </div>
                </div>
                {description && (
                  <div>
                    <span className="text-xs text-gray-500">Description</span>
                    <p className="text-sm text-gray-700 mt-1 line-clamp-3">{description}</p>
                  </div>
                )}
                {hourlyRate && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Hourly Rate</span>
                    <span className="text-sm font-bold text-green-600">₹{hourlyRate}/hr</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Phone</span>
                  <span className="text-sm text-gray-800">{phone}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Location</span>
                  <span className="text-sm text-gray-800">{location}</span>
                </div>
              </CardContent>
            </Card>

            <div className="bg-gradient-to-r from-blue-50 to-emerald-50 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-emerald-600" />
                <p className="text-sm font-semibold text-emerald-700">Zero Commission Guarantee</p>
              </div>
              <p className="text-xs text-emerald-600">
                You keep 100% of what you earn. SINTHA never takes a cut from your services.
              </p>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-sm text-blue-700">
                You can always edit your profile later from the dashboard
              </p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  // Show loading screen while checking for existing profile
  if (checkingExistingProfile) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
        <p className="text-sm text-gray-500">Loading your profile...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button
          onClick={() => {
            if (step > 0) setStep(step - 1)
            else if (isEditing) goBack()
            else navigate('role-select')
          }}
          className="text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">
          {isEditing ? 'Edit Provider Profile' : 'Provider Setup'}
        </h1>
      </div>

      {/* Progress Bar */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1 flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i < step ? 'bg-green-500 text-white' :
                i === step ? 'sintha-gradient text-white' :
                'bg-gray-100 text-gray-400'
              }`}>
                {i < step ? <CheckCircle className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-[10px] mt-1 ${i <= step ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
          ))}
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full sintha-gradient rounded-full transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-4 overflow-y-auto">
        {renderStep()}
      </div>

      {/* Footer Actions */}
      <div className="px-4 pb-6 pt-4 border-t border-gray-100">
        {step < STEPS.length - 1 ? (
          <Button
            className="w-full sintha-gradient text-white font-semibold py-6"
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
          >
            Continue <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            className="w-full sintha-gradient text-white font-semibold py-6"
            onClick={handleSubmit}
            disabled={loading || !canProceed()}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {loading ? 'Creating Profile...' : isEditing ? 'Update Profile' : 'Start Offering Services'}
          </Button>
        )}
      </div>
    </div>
  )
}
