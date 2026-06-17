'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  KeyRound, Lock, Eye, EyeOff, Loader2, CheckCircle,
  AlertCircle, ArrowLeft
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const token = searchParams.get('token')

  const [validating, setValidating] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [tokenError, setTokenError] = useState('')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [resetError, setResetError] = useState('')

  // Validate the token on mount
  useEffect(() => {
    if (!token) {
      setTokenError('No reset token found. Please request a new password reset link.')
      setValidating(false)
      return
    }

    const validateToken = async () => {
      try {
        // Use fetch directly - no auth token needed for password reset
        const res = await fetch(`/api/auth/reset-password?token=${token}`)
        const data = await res.json()

        if (data.valid) {
          setTokenValid(true)
        } else {
          setTokenError(data.error || 'This reset link is invalid or has expired.')
        }
      } catch {
        setTokenError('Failed to validate reset link. Please check your internet connection and try again.')
      } finally {
        setValidating(false)
      }
    }

    validateToken()
  }, [token])

  const handleResetPassword = async () => {
    setResetError('')
    
    if (!newPassword || !confirmPassword) {
      setResetError('Please fill all fields')
      return
    }
    if (newPassword.length < 6) {
      setResetError('Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      // Use fetch directly - no auth token needed for password reset
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: newPassword }),
      })

      const data = await res.json()

      if (res.ok && data.message) {
        setSuccess(true)
        toast({ title: 'Password Reset!', description: 'You can now sign in with your new password' })
      } else {
        // Show the specific error from the API
        const errorMsg = data.error || 'Failed to reset password. Please try again.'
        setResetError(errorMsg)
        toast({ title: 'Error', description: errorMsg, variant: 'destructive' })
      }
    } catch {
      setResetError('Network error. Please check your internet connection and try again.')
      toast({ title: 'Error', description: 'Network error. Please try again.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  // Validating token state
  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Verifying reset link...</p>
        </div>
      </div>
    )
  }

  // Invalid/expired token
  if (!tokenValid && tokenError) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">Link Expired</h1>
            <p className="text-sm text-gray-500 mb-6">{tokenError}</p>
            <Button
              className="w-full sintha-gradient text-white font-semibold"
              onClick={() => router.push('/')}
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">Password Reset!</h1>
            <p className="text-sm text-gray-500 mb-6">
              Your password has been successfully reset. You can now sign in with your new password.
            </p>
            <Button
              className="w-full sintha-gradient text-white font-semibold py-6"
              onClick={() => router.push('/')}
            >
              Sign In Now
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Reset password form
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      <div className="p-4">
        <button onClick={() => router.push('/')} className="text-gray-600 hover:text-gray-800">
          <ArrowLeft className="h-6 w-6" />
        </button>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 pt-4 pb-8">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 rounded-2xl sintha-gradient flex items-center justify-center mx-auto mb-3">
              <KeyRound className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Set New Password</h1>
            <p className="text-sm text-gray-500 mt-1">
              Enter your new password below
            </p>
          </CardHeader>
          <CardContent>
            {/* Error message display */}
            {resetError && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-red-700">{resetError}</p>
                </div>
                <button onClick={() => setResetError('')} className="text-red-400 hover:text-red-600 text-sm">&times;</button>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 6 characters"
                    className="pl-10 pr-10"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setResetError('') }}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-3 text-gray-400"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    className="pl-10"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setResetError('') }}
                    onKeyDown={(e) => e.key === 'Enter' && handleResetPassword()}
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <Button
                className="w-full sintha-gradient text-white font-semibold py-6"
                onClick={handleResetPassword}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  )
}
