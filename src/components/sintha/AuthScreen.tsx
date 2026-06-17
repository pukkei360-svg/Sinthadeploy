'use client'

import { useState, useMemo, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff, Loader2, AlertCircle, MessageCircle, CheckCircle2, XCircle, Phone, MessageSquare } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { validateEmail } from '@/lib/email-validation'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'


export default function AuthScreen() {
  const { navigate, setUser, viewParams } = useAppStore()
  const { toast } = useToast()
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [firebaseError, setFirebaseError] = useState<string | null>(null)
  // Login form
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  // Track whether the user has interacted with the email field (for showing errors only after blur)
  const [loginEmailTouched, setLoginEmailTouched] = useState(false)

  // Register form
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')
  const [regEmailTouched, setRegEmailTouched] = useState(false)

  // Compute email validation results (re-validated on every keystroke)
  const loginEmailValidation = useMemo(() => validateEmail(loginEmail), [loginEmail])
  const regEmailValidation = useMemo(() => validateEmail(regEmail), [regEmail])

  // Apply suggestion (when user clicks the "Did you mean X?" prompt)
  const applyLoginSuggestion = () => {
    if (loginEmailValidation.suggestion) setLoginEmail(loginEmailValidation.suggestion)
  }
  const applyRegSuggestion = () => {
    if (regEmailValidation.suggestion) setRegEmail(regEmailValidation.suggestion)
  }

  const isAdmin = viewParams?.role === 'admin'
  const [adminId, setAdminId] = useState('')

  // Convert admin ID to Firebase email
  const getAdminEmail = (id: string) => `${id.toLowerCase().trim()}@sintha.app`

  // ─────────────────────────────────────────────────────────────
  // Phone OTP Authentication
  // ─────────────────────────────────────────────────────────────
  // Two-step flow:
  //  1. User enters phone number → we send OTP via Firebase
  //  2. User enters 6-digit OTP → we verify → user is signed in
  //
  // After successful verification, Firebase fires onAuthStateChanged
  // (listened to by page.tsx), which syncs the user to the backend
  // and routes based on role.
  const [phoneMode, setPhoneMode] = useState(false)  // show phone form?
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)  // step 1 done?
  const [resendTimer, setResendTimer] = useState(0)  // countdown
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
  const [recaptchaReady, setRecaptchaReady] = useState(false)

  // Initialize reCAPTCHA verifier once when entering phone mode
  // Firebase Phone Auth requires a reCAPTCHA to prevent abuse.
  // We use invisible reCAPTCHA so the user doesn't see a checkbox.
  useEffect(() => {
    if (!phoneMode) return
    if (recaptchaReady) return

    try {
      // Create the recaptcha verifier if it doesn't exist yet
      if (!(window as any).recaptchaVerifier) {
        ;(window as any).recaptchaVerifier = new RecaptchaVerifier(
          auth,
          'recaptcha-container',
          {
            size: 'invisible',
            callback: () => {
              // reCAPTCHA solved — allow sign-in
              setRecaptchaReady(true)
            },
            'expired-callback': () => {
              setRecaptchaReady(false)
            },
          }
        )
      }
      // Render the recaptcha
      ;(window as any).recaptchaVerifier.render().then(() => {
        setRecaptchaReady(true)
      }).catch(() => {
        // Already rendered — that's fine
        setRecaptchaReady(true)
      })
    } catch {
      // recaptcha might already be rendered
      setRecaptchaReady(true)
    }
  }, [phoneMode, recaptchaReady])

  // Resend OTP countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return
    const interval = setInterval(() => {
      setResendTimer((t) => Math.max(0, t - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [resendTimer])

  // Send OTP to the user's phone number
  const handleSendOtp = async () => {
    setFirebaseError(null)

    // Validate phone number (basic check)
    const cleaned = phoneNumber.replace(/[\s\-()]/g, '')
    if (!cleaned) {
      setFirebaseError('Please enter your phone number')
      return
    }

    // Normalize: if user didn't include country code, assume India (+91)
    let fullNumber = cleaned
    if (!fullNumber.startsWith('+')) {
      // Strip leading 0 if present, then prepend +91
      fullNumber = '+91' + fullNumber.replace(/^0+/, '')
    }

    // Indian numbers should be 10 digits (+91 + 10 digits = 13 chars total)
    if (fullNumber.length < 10) {
      setFirebaseError('Please enter a valid 10-digit phone number')
      return
    }

    setLoading(true)
    try {
      const appVerifier = (window as any).recaptchaVerifier
      if (!appVerifier) {
        setFirebaseError('reCAPTCHA not ready. Please refresh and try again.')
        setLoading(false)
        return
      }

      const result = await signInWithPhoneNumber(auth, fullNumber, appVerifier)
      setConfirmationResult(result)
      setOtpSent(true)
      setResendTimer(60)  // can resend after 60s
      toast({
        title: 'OTP Sent',
        description: `A 6-digit code was sent to ${fullNumber}`,
      })
    } catch (err: unknown) {
      const message = (err as Error).message || 'Failed to send OTP'
      if (message.includes('auth/invalid-phone-number')) {
        setFirebaseError('Invalid phone number. Please enter a valid 10-digit number.')
      } else if (message.includes('auth/too-many-requests')) {
        setFirebaseError('Too many OTP requests. Please try again later.')
      } else if (message.includes('auth/quota-exceeded')) {
        setFirebaseError('SMS quota exceeded. Please contact support.')
      } else if (message.includes('auth/network-request-failed')) {
        setFirebaseError('Network error. Please check your internet connection.')
      } else {
        setFirebaseError(message)
      }
      // Reset reCAPTCHA on failure
      try {
        if ((window as any).recaptchaVerifier) {
          ;(window as any).recaptchaVerifier.reset()
        }
      } catch {}
    } finally {
      setLoading(false)
    }
  }

  // Verify the OTP entered by the user
  const handleVerifyOtp = async () => {
    setFirebaseError(null)
    if (!confirmationResult) {
      setFirebaseError('Please request an OTP first')
      return
    }
    if (!otp || otp.length !== 6) {
      setFirebaseError('Please enter the 6-digit code')
      return
    }

    setLoading(true)
    try {
      const credential = await confirmationResult.confirm(otp)
      const firebaseUser = credential.user

      // Sync phone number to backend — page.tsx's onAuthStateChanged
      // will fire and handle the actual sync + routing. But we also
      // pass the phone number so it gets saved to the user's profile.
      try {
        await apiFetch('/auth/sync', {
          method: 'POST',
          body: JSON.stringify({
            firebaseUid: firebaseUser.uid,
            email: firebaseUser.email || `${firebaseUser.phoneNumber}@phone.sintha.app`,
            name: firebaseUser.displayName || 'User',
            photoUrl: firebaseUser.photoURL || undefined,
            phone: firebaseUser.phoneNumber || undefined,
          }),
        })
      } catch {
        // page.tsx's onAuthStateChanged listener will retry the sync
      }

      // Don't navigate here — let page.tsx's onAuthStateChanged listener
      // handle routing based on the user's role
      toast({
        title: 'Phone Verified!',
        description: 'Welcome to SINTHA',
      })
    } catch (err: unknown) {
      const message = (err as Error).message || 'OTP verification failed'
      if (message.includes('auth/invalid-verification-code')) {
        setFirebaseError('Wrong code. Please check the 6-digit code and try again.')
      } else if (message.includes('auth/code-expired')) {
        setFirebaseError('Code expired. Please request a new OTP.')
        setOtpSent(false)
        setOtp('')
      } else if (message.includes('auth/network-request-failed')) {
        setFirebaseError('Network error. Please check your internet connection.')
      } else {
        setFirebaseError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  // Reset the phone OTP flow (go back to phone number entry)
  const handleResetPhoneFlow = () => {
    setOtpSent(false)
    setOtp('')
    setConfirmationResult(null)
    setFirebaseError(null)
    try {
      if ((window as any).recaptchaVerifier) {
        ;(window as any).recaptchaVerifier.reset()
      }
    } catch {}
  }

  // Sync Firebase user to our backend database
  const syncUserToBackend = async (firebaseUid: string, email: string, name: string, photoUrl?: string) => {
    try {
      const data = await apiFetch('/auth/sync', {
        method: 'POST',
        body: JSON.stringify({ firebaseUid, email, name, photoUrl }),
      })
      return data
    } catch (err) {
      console.error('Backend sync error:', err)
      throw err
    }
  }

  const handleEmailLogin = async () => {
    // For admin login, use admin ID mapped to email
    const emailToUse = isAdmin ? getAdminEmail(adminId) : loginEmail
    const passwordToUse = loginPassword

    if ((!isAdmin && !loginEmail) || (isAdmin && !adminId) || !passwordToUse) {
      toast({ title: 'Error', description: 'Please fill all fields', variant: 'destructive' })
      return
    }
    // Validate email format BEFORE calling Firebase (saves a network round-trip)
    if (!isAdmin && !loginEmailValidation.valid) {
      setLoginEmailTouched(true)
      toast({
        title: 'Invalid Email',
        description: loginEmailValidation.reason || 'Please enter a valid email address',
        variant: 'destructive',
      })
      return
    }
    setLoading(true)
    setFirebaseError(null)
    try {
      // Authenticate with Firebase
      const credential = await signInWithEmailAndPassword(auth, emailToUse, passwordToUse)
      const firebaseUser = credential.user

      // Sync to backend
      const data = await syncUserToBackend(
        firebaseUser.uid,
        firebaseUser.email || emailToUse,
        firebaseUser.displayName || (isAdmin ? adminId : emailToUse.split('@')[0]),
        firebaseUser.photoURL || undefined
      )

      setUser(data.user, firebaseUser.uid)

      if (data.user.role === 'admin') {
        navigate('admin-dashboard')
      } else if (data.user.role === 'provider') {
        navigate('provider-dashboard')
      } else if (data.user.role === 'client') {
        navigate('home')
      } else {
        navigate('role-select')
      }

      toast({ title: 'Welcome back!', description: `Signed in as ${data.user.name}` })
    } catch (err: unknown) {
      const message = (err as Error).message || 'Login failed'
      // Translate Firebase errors to user-friendly messages
      if (message.includes('auth/invalid-credential') || message.includes('auth/wrong-password')) {
        setFirebaseError('Invalid email or password. Please check your credentials.')
      } else if (message.includes('auth/user-not-found')) {
        setFirebaseError('No account found with this email. Please register first.')
      } else if (message.includes('auth/too-many-requests')) {
        setFirebaseError('Too many failed attempts. Please try again later.')
      } else if (message.includes('auth/invalid-email')) {
        setFirebaseError('Please enter a valid email address.')
      } else if (message.includes('auth/network-request-failed')) {
        setFirebaseError('Network error. Please check your internet connection.')
      } else {
        setFirebaseError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleEmailRegister = async () => {
    if (!regName || !regEmail || !regPassword || !regConfirm) {
      toast({ title: 'Error', description: 'Please fill all fields', variant: 'destructive' })
      return
    }
    // Validate email format BEFORE calling Firebase (saves a network round-trip)
    if (!regEmailValidation.valid) {
      setRegEmailTouched(true)
      toast({
        title: 'Invalid Email',
        description: regEmailValidation.reason || 'Please enter a valid email address',
        variant: 'destructive',
      })
      return
    }
    if (regPassword.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' })
      return
    }
    if (regPassword !== regConfirm) {
      toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' })
      return
    }
    setLoading(true)
    setFirebaseError(null)
    try {
      // Create Firebase account
      const credential = await createUserWithEmailAndPassword(auth, regEmail, regPassword)

      // Update display name in Firebase
      await updateProfile(credential.user, { displayName: regName })

      // Sync to backend
      const data = await syncUserToBackend(
        credential.user.uid,
        regEmail,
        regName,
        credential.user.photoURL || undefined
      )

      setUser(data.user, credential.user.uid)
      navigate('role-select')

      toast({ title: 'Account Created!', description: 'Welcome to SINTHA' })
    } catch (err: unknown) {
      const message = (err as Error).message || 'Registration failed'
      if (message.includes('auth/email-already-in-use')) {
        setFirebaseError('This email is already registered. Please login instead.')
      } else if (message.includes('auth/weak-password')) {
        setFirebaseError('Password is too weak. Use at least 6 characters.')
      } else if (message.includes('auth/invalid-email')) {
        setFirebaseError('Please enter a valid email address.')
      } else if (message.includes('auth/network-request-failed')) {
        setFirebaseError('Network error. Please check your internet connection.')
      } else {
        setFirebaseError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      {/* Header */}
      <div className="p-4">
        <button onClick={() => navigate('landing')} className="text-gray-600 hover:text-gray-800">
          <ArrowLeft className="h-6 w-6" />
        </button>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 pt-4 pb-8">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            <h1 className="text-3xl font-extrabold sintha-gradient-text">SINTHA</h1>
            <p className="text-sm text-gray-500 mt-1">
              {isAdmin ? 'Admin Login' : 'Your trusted service marketplace'}
            </p>
          </CardHeader>
          <CardContent>
            {/* Firebase Error Banner */}
            {firebaseError && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-red-700">{firebaseError}</p>
                </div>
                <button onClick={() => setFirebaseError(null)} className="text-red-400 hover:text-red-600 text-sm">&times;</button>
              </div>
            )}

            {/* Phone OTP Sign-In
                - Hidden for admin login (admins use Sintha37 ID + password)
                - When phoneMode is OFF: show "Continue with Phone" button
                - When phoneMode is ON: show phone input + OTP verification UI
                  (hides the email/password Login/Register tabs)
            */}
            {!isAdmin && !phoneMode && (
              <>
                <button
                  type="button"
                  onClick={() => { setPhoneMode(true); setFirebaseError(null) }}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed mb-4"
                >
                  <Phone className="h-5 w-5" />
                  <span>Continue with Phone</span>
                </button>

                {/* Divider between Phone and email/password */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">or use email</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
              </>
            )}

            {/* Phone OTP form — shown when phoneMode is ON */}
            {!isAdmin && phoneMode && (
              <div className="space-y-4 mb-6">
                {/* reCAPTCHA container — invisible, required by Firebase Phone Auth */}
                <div id="recaptcha-container" className="recaptcha-container"></div>

                {/* Phone number input — step 1 */}
                {!otpSent && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-700">
                      <Phone className="h-5 w-5" />
                      <h3 className="font-semibold">Sign in with Phone</h3>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone-number">Phone Number</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-500 font-medium text-sm">+91</span>
                        <Input
                          id="phone-number"
                          type="tel"
                          inputMode="numeric"
                          placeholder="98765 43210"
                          className="pl-12"
                          value={phoneNumber}
                          onChange={(e) => {
                            // Only allow digits, spaces, +, -
                            const v = e.target.value.replace(/[^\d\s+\-]/g, '')
                            setPhoneNumber(v)
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                          maxLength={15}
                        />
                      </div>
                      <p className="text-[11px] text-gray-400">
                        We'll send you a 6-digit code via SMS
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={loading || !phoneNumber}
                      className="w-full sintha-gradient text-white font-semibold py-3"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Sending OTP...
                        </>
                      ) : (
                        'Send OTP'
                      )}
                    </Button>
                    <button
                      type="button"
                      onClick={() => { setPhoneMode(false); setFirebaseError(null); setPhoneNumber('') }}
                      className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
                    >
                      ← Back to email/password
                    </button>
                  </div>
                )}

                {/* OTP verification — step 2 */}
                {otpSent && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-700">
                      <MessageSquare className="h-5 w-5" />
                      <h3 className="font-semibold">Enter the code</h3>
                    </div>
                    <p className="text-sm text-gray-500">
                      We sent a 6-digit code to{' '}
                      <span className="font-semibold text-gray-700">
                        {phoneNumber.startsWith('+') ? phoneNumber : '+91 ' + phoneNumber}
                      </span>
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="otp-code">6-digit code</Label>
                      <Input
                        id="otp-code"
                        type="text"
                        inputMode="numeric"
                        placeholder="000000"
                        className="text-center text-2xl font-bold tracking-[0.5em] py-4"
                        value={otp}
                        onChange={(e) => {
                          // Only digits, max 6
                          const v = e.target.value.replace(/\D/g, '').slice(0, 6)
                          setOtp(v)
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                        maxLength={6}
                        autoFocus
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={loading || otp.length !== 6}
                      className="w-full sintha-gradient text-white font-semibold py-3"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Verifying...
                        </>
                      ) : (
                        'Verify & Continue'
                      )}
                    </Button>
                    <div className="flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={handleResetPhoneFlow}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        ← Change number
                      </button>
                      {resendTimer > 0 ? (
                        <span className="text-gray-400">
                          Resend in {resendTimer}s
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          Resend OTP
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}


            {/* Tab Toggle — hidden when in phone mode */}
            {!isAdmin && !phoneMode && (
              <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
                <button
                  className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                    tab === 'login' ? 'bg-white shadow text-blue-600' : 'text-gray-500'
                  }`}
                  onClick={() => { setTab('login'); setFirebaseError(null) }}
                >
                  Login
                </button>
                <button
                  className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                    tab === 'register' ? 'bg-white shadow text-blue-600' : 'text-gray-500'
                  }`}
                  onClick={() => { setTab('register'); setFirebaseError(null) }}
                >
                  Register
                </button>
              </div>
            )}

            {(tab === 'login' || isAdmin) && !phoneMode ? (
              <div className="space-y-4">
                {isAdmin && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700 text-center">
                    Admin Access Only
                  </div>
                )}
                {isAdmin ? (
                  <div className="space-y-2">
                    <Label htmlFor="admin-id">Admin ID</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="admin-id"
                        type="text"
                        placeholder="Enter Admin ID"
                        className="pl-10"
                        value={adminId}
                        onChange={(e) => setAdminId(e.target.value)}
                        autoComplete="username"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@example.com"
                        className={`pl-10 pr-10 ${
                          loginEmailTouched && loginEmail && !loginEmailValidation.valid
                            ? 'border-red-400 focus-visible:border-red-500'
                            : loginEmail && loginEmailValidation.valid
                            ? 'border-green-400 focus-visible:border-green-500'
                            : ''
                        }`}
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        onBlur={() => setLoginEmailTouched(true)}
                        autoComplete="email"
                      />
                      {loginEmail && loginEmailValidation.valid && (
                        <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-green-500" />
                      )}
                      {loginEmailTouched && loginEmail && !loginEmailValidation.valid && (
                        <XCircle className="absolute right-3 top-3 h-4 w-4 text-red-500" />
                      )}
                    </div>
                    {/* Real-time email validation feedback */}
                    {loginEmailTouched && loginEmail && !loginEmailValidation.valid && (
                      <div className="text-xs text-red-600 flex flex-col gap-1">
                        <span>{loginEmailValidation.reason}</span>
                        {loginEmailValidation.suggestion && (
                          <button
                            type="button"
                            onClick={applyLoginSuggestion}
                            className="text-left text-blue-600 hover:underline font-medium"
                          >
                            Use {loginEmailValidation.suggestion} →
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter password"
                      className="pl-10 pr-10"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()}
                      autoComplete="current-password"
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
                {/* Forgot Password Link — not shown for admin */}
                {!isAdmin && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => navigate('forgot-password')}
                      className="text-sm text-blue-600 font-medium hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}
                <Button
                  className="w-full sintha-gradient text-white font-semibold py-6"
                  onClick={handleEmailLogin}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
                <p className="text-xs text-center text-gray-400 mt-4">
                  New here?{' '}
                  <button
                    onClick={() => setTab('register')}
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    Register to create your account
                  </button>
                </p>
              </div>
            ) : !phoneMode ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="reg-name"
                      placeholder="Your full name"
                      className="pl-10"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="you@example.com"
                      className={`pl-10 pr-10 ${
                        regEmailTouched && regEmail && !regEmailValidation.valid
                          ? 'border-red-400 focus-visible:border-red-500'
                          : regEmail && regEmailValidation.valid
                          ? 'border-green-400 focus-visible:border-green-500'
                          : ''
                      }`}
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      onBlur={() => setRegEmailTouched(true)}
                      autoComplete="email"
                    />
                    {regEmail && regEmailValidation.valid && (
                      <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-green-500" />
                    )}
                    {regEmailTouched && regEmail && !regEmailValidation.valid && (
                      <XCircle className="absolute right-3 top-3 h-4 w-4 text-red-500" />
                    )}
                  </div>
                  {/* Real-time email validation feedback */}
                  {regEmailTouched && regEmail && !regEmailValidation.valid && (
                    <div className="text-xs text-red-600 flex flex-col gap-1">
                      <span>{regEmailValidation.reason}</span>
                      {regEmailValidation.suggestion && (
                        <button
                          type="button"
                          onClick={applyRegSuggestion}
                          className="text-left text-blue-600 hover:underline font-medium"
                        >
                          Use {regEmailValidation.suggestion} →
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 6 characters"
                      className="pl-10"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-confirm">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="reg-confirm"
                      type="password"
                      placeholder="Confirm password"
                      className="pl-10"
                      value={regConfirm}
                      onChange={(e) => setRegConfirm(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleEmailRegister()}
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <Button
                  className="w-full sintha-gradient text-white font-semibold py-6"
                  onClick={handleEmailRegister}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>

                <p className="text-xs text-center text-gray-400 mt-2">
                  Already have an account?{' '}
                  <button
                    onClick={() => setTab('login')}
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            ) : null}

            {/* WhatsApp Support */}
            {!isAdmin && (
              <div className="mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => {
                    const msg = encodeURIComponent('Hi SINTHA Support, I need help with my account.')
                    window.open(`https://wa.me/917005151875?text=${msg}`, '_blank')
                  }}
                  className="w-full flex items-center justify-center gap-2 text-green-600 hover:text-green-700 transition-colors"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span className="text-sm font-semibold">Need help? Chat with us on WhatsApp</span>
                </button>
                <p className="text-[11px] text-center text-gray-400 mt-1">7005151875</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
