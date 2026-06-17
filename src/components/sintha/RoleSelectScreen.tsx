'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Home, Briefcase, ArrowRight, Loader2, Shield, Zap, Users } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function RoleSelectScreen() {
  const { user, setUser, navigate, token } = useAppStore()
  const { toast } = useToast()
  const [loading, setLoading] = useState<string | null>(null)

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
