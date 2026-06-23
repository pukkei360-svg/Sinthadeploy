'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ArrowLeft, Mail, Loader2, AlertCircle, CheckCircle2, MessageCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { apiFetch } from '@/lib/api'
import WhatsAppIcon from './WhatsAppIcon'


export default function ForgotPasswordScreen() {
  const { navigate } = useAppStore()
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleResetPassword = async () => {
    if (!email) {
      setError('Please enter your email address')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Call OUR backend /api/auth/forgot-password — this sends a
      // SINTHA-branded email from pukkei365@gmail.com via Gmail SMTP,
      // NOT Firebase's default email (which comes from noreply@firebaseapp.com).
      //
      // The email contains a link to our own /reset-password page with
      // a secure token. When the user clicks it, they go to our reset
      // page, enter a new password, and we update it via Firebase Admin
      // SDK (or Firebase client SDK as a fallback).
      const data = await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })

      setSent(true)
      toast({
        title: 'Reset Email Sent',
        description: data.message || 'Check your inbox for the password reset link',
      })
    } catch (err: unknown) {
      const message = (err as Error).message || 'Failed to send reset email'
      if (message.includes('No account found') || message.includes('user-not-found')) {
        setError('No account found with this email address.')
      } else if (message.includes('invalid-email')) {
        setError('Please enter a valid email address.')
      } else if (message.includes('too-many-requests')) {
        setError('Too many requests. Please try again later.')
      } else if (message.includes('network') || message.includes('Network')) {
        setError('Network error. Please check your internet connection.')
      } else if (message.includes('Email service is not configured')) {
        setError('Email service is temporarily unavailable. Please contact support.')
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      {/* Header */}
      <div className="p-4">
        <button onClick={() => navigate('login')} className="text-gray-600 hover:text-gray-800">
          <ArrowLeft className="h-6 w-6" />
        </button>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 pt-4 pb-8">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
              <Mail className="h-7 w-7 text-blue-600" />
            </div>
            <h1 className="text-2xl font-extrabold sintha-gradient-text">Forgot Password?</h1>
            <p className="text-sm text-gray-500 mt-1">
              No worries! Enter your email and we&apos;ll send you a reset link.
            </p>
          </CardHeader>
          <CardContent>
            {!sent ? (
              <div className="space-y-4">
                {/* Error Banner */}
                {error && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-sm">&times;</button>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-10"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(null) }}
                      onKeyDown={(e) => e.key === 'Enter' && handleResetPassword()}
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                </div>

                <Button
                  className="w-full sintha-gradient text-white font-semibold py-6"
                  onClick={handleResetPassword}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {loading ? 'Sending Reset Link...' : 'Send Reset Link'}
                </Button>

                <p className="text-xs text-center text-gray-400">
                  Remember your password?{' '}
                  <button
                    onClick={() => navigate('login')}
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    Back to Sign In
                  </button>
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Success State */}
                <div className="text-center space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Check Your Email</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      We&apos;ve sent a password reset link to
                    </p>
                    <p className="text-sm font-semibold text-blue-600 mt-1">{email}</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                    <p>The link will expire in 1 hour. If you don&apos;t see the email, check your spam folder.</p>
                  </div>
                </div>

                <Button
                  className="w-full sintha-gradient text-white font-semibold py-6"
                  onClick={() => navigate('login')}
                >
                  Back to Sign In
                </Button>

                <button
                  onClick={handleResetPassword}
                  className="w-full text-center text-sm text-gray-500 hover:text-blue-600 py-2"
                  disabled={loading}
                >
                  Didn&apos;t receive the email? <span className="font-semibold underline">Resend</span>
                </button>
              </div>
            )}

            {/* Help link — email only (WhatsApp removed: personal number). */}
            <div className="mt-6 pt-4 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400">
                Need help? Email us at{' '}
                <a href="mailto:support@sintha.app" className="text-blue-600 font-medium hover:underline">
                  support@sintha.app
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
