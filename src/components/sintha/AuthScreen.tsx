'use client'

import { useState, useMemo } from 'react'
import { useAppStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff, Loader2, AlertCircle, MessageCircle, CheckCircle2, XCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { validateEmail } from '@/lib/email-validation'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
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

  // ─────────────────────────────────────────────────────────────
  // Google Sign-In
  // ─────────────────────────────────────────────────────────────
  // Uses Firebase signInWithPopup. On mobile/APK, the popup may fall
  // back to a redirect — but signInWithPopup handles this transparently
  // in modern firebase/auth (v9+).
  //
  // After Google auth, we sync the user to our backend via /api/auth/google
  // (which creates or updates the User row in Postgres).
  const handleGoogleSignIn = async () => {
    setLoading(true)
    setFirebaseError(null)
    try {
      const provider = new GoogleAuthProvider()
      // Always show account picker, even if user is already signed in to
      // one Google account in this browser. This is important for shared
      // devices and APK WebViews.
      provider.setCustomParameters({ prompt: 'select_account' })

      const credential = await signInWithPopup(auth, provider)
      const firebaseUser = credential.user

      // Sync to our backend
      const data = await apiFetch('/auth/google', {
        method: 'POST',
        body: JSON.stringify({
          firebaseUid: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          photoUrl: firebaseUser.photoURL || undefined,
        }),
      })

      setUser(data.user, firebaseUser.uid)

      // Route based on role (same logic as email login)
      if (data.user.role === 'admin') {
        navigate('admin-dashboard')
      } else if (data.user.role === 'provider') {
        navigate('provider-dashboard')
      } else if (data.user.role === 'client') {
        navigate('home')
      } else {
        // New user (no role set yet) → role selection screen
        navigate('role-select')
      }

      toast({
        title: data.user.role ? `Welcome back, ${data.user.name}!` : 'Account Created!',
        description: data.user.role ? 'Signed in with Google' : 'Welcome to SINTHA',
      })
    } catch (err: unknown) {
      const message = (err as Error).message || 'Google sign-in failed'
      if (message.includes('auth/popup-closed-by-user')) {
        setFirebaseError('Sign-in cancelled. Tap "Continue with Google" to try again.')
      } else if (message.includes('auth/popup-blocked')) {
        setFirebaseError('Pop-up was blocked by your browser. Please allow pop-ups for this site.')
      } else if (message.includes('auth/cancelled-popup-request')) {
        // User opened a second popup — ignore silently
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

            {/* Google Sign-In button — not shown for admin login */}
            {!isAdmin && (
              <>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed mb-4"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                  ) : (
                    /* Official Google "G" logo (multi-color) — inline SVG so it
                       works in APK WebView without external image fetch */
                    <svg className="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  <span>{loading ? 'Signing in...' : 'Continue with Google'}</span>
                </button>

                {/* Divider between Google and email/password */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">or</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
              </>
            )}

            {/* Tab Toggle */}
            {!isAdmin && (
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

            {tab === 'login' || isAdmin ? (
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
            ) : (
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
            )}

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
