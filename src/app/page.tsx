'use client'

import { useEffect, useState, lazy, Suspense } from 'react'
import { useAppStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'

// Eagerly load only the screens needed for first paint (landing + auth + home).
// All other screens are lazy-loaded — they only download when the user navigates
// to them. This reduces the initial JS bundle from ~1MB to ~300KB, making the
// app open 3x faster on slow mobile networks.
import LandingScreen from '@/components/sintha/LandingScreen'
import AuthScreen from '@/components/sintha/AuthScreen'
import RoleSelectScreen from '@/components/sintha/RoleSelectScreen'
import HomeScreen from '@/components/sintha/HomeScreen'

const CategoryScreen = lazy(() => import('@/components/sintha/CategoryScreen'))
const ProviderProfileScreen = lazy(() => import('@/components/sintha/ProviderProfileScreen'))
const BookingFormScreen = lazy(() => import('@/components/sintha/BookingFormScreen'))
const MyBookingsScreen = lazy(() => import('@/components/sintha/MyBookingsScreen'))
const BookingDetailScreen = lazy(() => import('@/components/sintha/BookingDetailScreen'))
const ChatListScreen = lazy(() => import('@/components/sintha/ChatListScreen'))
const ChatRoomScreen = lazy(() => import('@/components/sintha/ChatRoomScreen'))
const AIAssistantScreen = lazy(() => import('@/components/sintha/AIAssistantScreen'))
const SinthaProScreen = lazy(() => import('@/components/sintha/SinthaProScreen'))
const VerificationScreen = lazy(() => import('@/components/sintha/VerificationScreen'))
const ProfileScreen = lazy(() => import('@/components/sintha/ProfileScreen'))
const NotificationsScreen = lazy(() => import('@/components/sintha/NotificationsScreen'))
const AdminDashboardScreen = lazy(() => import('@/components/sintha/AdminDashboardScreen'))
const AdminUsersScreen = lazy(() => import('@/components/sintha/AdminUsersScreen'))
const AdminBookingsScreen = lazy(() => import('@/components/sintha/AdminBookingsScreen'))
const AdminCategoriesScreen = lazy(() => import('@/components/sintha/AdminCategoriesScreen'))
const AdminVerificationsScreen = lazy(() => import('@/components/sintha/AdminVerificationsScreen'))
const ProviderDashboardScreen = lazy(() => import('@/components/sintha/ProviderDashboardScreen'))
const ProviderOnboardingScreen = lazy(() => import('@/components/sintha/ProviderOnboardingScreen'))
const ReviewsScreen = lazy(() => import('@/components/sintha/ReviewsScreen'))
const ForgotPasswordScreen = lazy(() => import('@/components/sintha/ForgotPasswordScreen'))
const ReportProviderScreen = lazy(() => import('@/components/sintha/ReportProviderScreen'))
const AdminClaimsScreen = lazy(() => import('@/components/sintha/AdminClaimsScreen'))
const AdminBroadcastScreen = lazy(() => import('@/components/sintha/AdminBroadcastScreen'))
const PostJobScreen = lazy(() => import('@/components/sintha/PostJobScreen'))
const MyJobsScreen = lazy(() => import('@/components/sintha/MyJobsScreen'))
const OpenJobsScreen = lazy(() => import('@/components/sintha/OpenJobsScreen'))
const JobDetailScreen = lazy(() => import('@/components/sintha/JobDetailScreen'))
const OfflineBootScreen = lazy(() => import('@/components/sintha/OfflineBootScreen'))
const HelpScreen = lazy(() => import('@/components/sintha/HelpScreen'))
const SavedProvidersScreen = lazy(() => import('@/components/sintha/SavedProvidersScreen'))
const SavedAddressesScreen = lazy(() => import('@/components/sintha/SavedAddressesScreen'))
const ReferralsScreen = lazy(() => import('@/components/sintha/ReferralsScreen'))
const PriceEstimatorScreen = lazy(() => import('@/components/sintha/PriceEstimatorScreen'))

// Loading fallback shown while a lazy-loaded screen downloads
function ScreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <h1 className="text-2xl font-extrabold sintha-gradient-text mb-2">SINTHA</h1>
        <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
      </div>
    </div>
  )
}

export default function Home() {
  const {
    currentView, setUser, navigate, isAuthReady, setAuthReady,
    setMyProviderProfile, user, setNotifications,
  } = useAppStore()

  // ─────────────────────────────────────────────────────────────
  // Boot-time connectivity gate
  // ─────────────────────────────────────────────────────────────
  // When the app launches offline, the WebView's initial HTML load can
  // fail (showing the ugly default error page) OR the HTML loads from
  // cache but Firebase auth + apiFetch hang forever with no clear UX.
  // We gate the entire app behind a connectivity check: if the backend
  // isn't reachable at boot, show a branded "You're offline" screen
  // with auto-retry. Once reachable, proceed with normal auth flow.
  //
  // This is different from OfflineBootstrap's banner (which handles
  // mid-session offline states). OfflineBootScreen only runs ONCE at
  // app launch — once it says "online", the rest of the app renders.
  const [bootOnline, setBootOnline] = useState<boolean | null>(null)

  // Run the boot connectivity check once on mount.
  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        // Hit a lightweight endpoint with cache-busting to verify the
        // backend is actually reachable (navigator.onLine can lie).
        const url = `/api/push-test?_=${Date.now()}`
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000)
        const res = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        })
        clearTimeout(timeout)
        if (cancelled) return
        if (res.ok) {
          // Verify it's actually JSON (not a captive portal HTML page)
          try {
            const text = await res.text()
            JSON.parse(text)
            setBootOnline(true)
            return
          } catch {}
        }
        setBootOnline(false)
      } catch {
        if (!cancelled) setBootOnline(false)
      }
    }
    check()
    return () => { cancelled = true }
  }, [])

  // ─────────────────────────────────────────────────────────────
  // Referral code pre-fill from /r/<code> redirect
  // ─────────────────────────────────────────────────────────────
  // When someone clicks a shared referral link (sintha.app/r/IRABOT7K),
  // the /r/[code] route redirects to /?ref=IRABOT7K. We read that query
  // param here and store it in localStorage so the RoleSelectScreen can
  // pre-fill the referral code input.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const urlParams = new URLSearchParams(window.location.search)
    const refCode = urlParams.get('ref')
    if (refCode) {
      // Store the referral code for the RoleSelectScreen to pick up
      localStorage.setItem('sintha_pending_referral', refCode.toUpperCase())
      // Clean the URL so the query param doesn't persist on refresh/reload
      const cleanUrl = window.location.pathname + window.location.hash
      window.history.replaceState(null, '', cleanUrl)
    }
  }, [])

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // For phone-auth users, firebaseUser.email is null — generate
          // a fake email so the /auth/sync route's `email` (unique) field
          // has something to store. Format: +91XXXXXXXXXX@phone.sintha.app
          const effectiveEmail = firebaseUser.email ||
            `${firebaseUser.phoneNumber}@phone.sintha.app`

          const data = await apiFetch('/auth/sync', {
            method: 'POST',
            body: JSON.stringify({
              firebaseUid: firebaseUser.uid,
              email: effectiveEmail,
              name: firebaseUser.displayName || firebaseUser.phoneNumber || 'User',
              photoUrl: firebaseUser.photoURL || undefined,
              phone: firebaseUser.phoneNumber || undefined,
            }),
          })

          setUser(data.user, firebaseUser.uid)

          // Route based on role
          if (data.user.role === 'provider') {
            // Check if provider has a profile
            try {
              const provData = await apiFetch(`/providers?userId=${data.user.id}`)
              const providers = provData.providers || []
              if (providers.length > 0) {
                setMyProviderProfile(providers[0])
                navigate('provider-dashboard')
              } else {
                // Provider has no profile yet - needs onboarding
                navigate('provider-onboarding')
              }
            } catch (provErr) {
              // API call failed — DON'T immediately send to onboarding.
              // Check if we already have a provider profile in localStorage
              // (the user might have just created it and the API is slow/cached).
              console.error('Provider profile check failed:', provErr)
              try {
                const savedProfile = localStorage.getItem('sintha_provider_profile')
                if (savedProfile) {
                  const profile = JSON.parse(savedProfile)
                  setMyProviderProfile(profile)
                  navigate('provider-dashboard')
                } else {
                  // No saved profile — genuinely needs onboarding
                  navigate('provider-onboarding')
                }
              } catch {
                navigate('provider-onboarding')
              }
            }
          } else if (data.user.role === 'admin') {
            navigate('admin-dashboard')
          } else if (data.user.role === 'client') {
            navigate('home')
          } else {
            // No role set yet — send to role-select screen
            // (shows photo upload + Client/Provider choice)
            navigate('role-select')
          }
        } catch (err) {
          console.error('Failed to sync Firebase user to backend:', err)

          // ── Banned / Suspended user handling ──────────────────────
          // If the backend returns 403, the user is either banned or
          // suspended. Show a clear error, sign them out of Firebase,
          // and clear localStorage so they can't bypass the ban by
          // using a cached session.
          if (err instanceof Error && (err.message.includes('banned') || err.message.includes('suspended'))) {
            try {
              // Sign out of Firebase so the auth state listener doesn't
              // immediately re-sync and re-trigger this error.
              const { signOut } = await import('firebase/auth')
              await signOut(auth)
            } catch {}
            localStorage.removeItem('sintha_user')
            localStorage.removeItem('sintha_token')
            localStorage.removeItem('sintha_provider_profile')

            // Show a clean error message to the user via an alert
            // (toast requires the Toaster component to be mounted,
            // and at this point the app is still on the landing screen)
            const banMsg = err instanceof Error && err.message.toLowerCase().includes('banned')
              ? 'This account has been permanently banned. Please contact support.'
              : err instanceof Error && err.message.toLowerCase().includes('suspended')
              ? 'Your account has been temporarily suspended. Please contact support.'
              : 'Something went wrong. Please try again.'
            alert(banMsg)

            setUser(null, null)
            navigate('landing')
            setAuthReady(true)
            return
          }

          // Fallback to localStorage
          try {
            const savedUser = localStorage.getItem('sintha_user')
            const savedToken = localStorage.getItem('sintha_token')
            if (savedUser && savedToken) {
              const user = JSON.parse(savedUser)
              setUser(user, savedToken)
              if (user.role === 'admin') {
                navigate('admin-dashboard')
              } else if (user.role === 'provider') {
                // Check localStorage for provider profile
                const savedProfile = localStorage.getItem('sintha_provider_profile')
                if (savedProfile) {
                  setMyProviderProfile(JSON.parse(savedProfile))
                  navigate('provider-dashboard')
                } else {
                  navigate('provider-onboarding')
                }
              } else if (user.role === 'client') {
                navigate('home')
              } else {
                // No role set — go to role-select (not landing page)
                navigate('role-select')
              }
            }
          } catch {
            // Ignore
          }
        }
      } else {
        // No Firebase user - check localStorage for session
        try {
          const savedUser = localStorage.getItem('sintha_user')
          const savedToken = localStorage.getItem('sintha_token')
          if (savedUser && savedToken) {
            const user = JSON.parse(savedUser)
            setUser(user, savedToken)
            if (user.role === 'admin') {
              navigate('admin-dashboard')
            } else if (user.role === 'provider') {
              // Check localStorage for provider profile
              const savedProfile = localStorage.getItem('sintha_provider_profile')
              if (savedProfile) {
                setMyProviderProfile(JSON.parse(savedProfile))
                navigate('provider-dashboard')
              } else {
                navigate('provider-onboarding')
              }
            } else if (user.role === 'client') {
              navigate('home')
            } else {
              // No role set — go to role-select (not landing page)
              navigate('role-select')
            }
          }
        } catch {
          // Ignore
        }
      }
      setAuthReady(true)
    })

    return () => unsubscribe()
  }, [])

  // ─────────────────────────────────────────────────────────────
  // Global notification preload
  // ─────────────────────────────────────────────────────────────
  // The HomeScreen & BottomNav bell badge reads `notifications` from
  // the store, but only NotificationsScreen was fetching them — so
  // the red unread-count badge never showed until the user actually
  // opened the notifications screen. Fetch once per signed-in user
  // so the badge shows up immediately on app launch / login.
  //
  // When offline, this silently no-ops (no toast — notifications are
  // not a "user action" and the offline banner already explains why).
  useEffect(() => {
    if (!user) return
    let cancelled = false
    const loadNotifications = async () => {
      // Skip entirely if we know we're offline — saves a fetch that
      // would just fail and clutter the console.
      if (typeof navigator !== 'undefined' && !navigator.onLine) return
      try {
        const data = await apiFetch(`/notifications?userId=${user.id}`)
        if (!cancelled) setNotifications(data.notifications || [])
      } catch {
        // Silent — store keeps whatever it had (likely empty).
        // The OfflineBootstrap banner handles the UX.
      }
    }
    loadNotifications()
    return () => { cancelled = true }
  }, [user, setNotifications])

  // ─────────────────────────────────────────────────────────────
  // Android Back Button / End Key Handler
  // ─────────────────────────────────────────────────────────────
  // When running inside an APK WebView, the phone's hardware Back
  // button or End key fires a 'popstate' event.
  //
  // Standard Android pattern: "Press back twice to exit"
  // - First back press: show "Press back again to exit" toast
  // - Second back press within 2 seconds: close the app
  // - If on any other screen: navigate back (don't exit)
  useEffect(() => {
    let backPressCount = 0
    let backPressTimer: ReturnType<typeof setTimeout> | null = null

    const handlePopState = (e: PopStateEvent) => {
      // If on the landing page → try to exit the app
      if (currentView === 'landing') {
        backPressCount += 1

        if (backPressCount === 1) {
          // First press — show exit prompt, don't exit yet
          window.history.pushState(null, '', window.location.href)

          // Show a toast-like notification
          const toast = document.createElement('div')
          toast.style.cssText = `
            position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
            background: #0F4C81; color: white; padding: 12px 24px;
            border-radius: 12px; font-size: 14px; font-family: sans-serif;
            z-index: 99999; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: opacity 0.3s; white-space: nowrap;
          `
          toast.textContent = 'Press back again to exit'
          document.body.appendChild(toast)

          // Remove toast after 2 seconds
          backPressTimer = setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast)
            backPressCount = 0
          }, 2000)

          return
        }

        // Second press within 2 seconds → exit the app
        if (backPressCount >= 2) {
          if (backPressTimer) clearTimeout(backPressTimer)

          // Try multiple methods to close the app
          try {
            // Method 1: Android JavaScript interface (if wrapper supports it)
            // @ts-ignore
            if (window.Android && window.Android.closeApp) {
              // @ts-ignore
              window.Android.closeApp()
              return
            }
          } catch {}

          try {
            // Method 2: window.close() (works in some WebViews)
            window.close()
          } catch {}

          try {
            // Method 3: Try to move task to back (minimize)
            // @ts-ignore
            if (window.Android && window.Android.moveTaskToBack) {
              // @ts-ignore
              window.Android.moveTaskToBack(true)
              return
            }
          } catch {}

          // Method 4: Navigate to about:blank (triggers WebView destroy
          // in most APK wrappers — app closes or minimizes)
          window.location.href = 'about:blank'
        }
      } else {
        // Not on landing page — push state so Back doesn't exit
        window.history.pushState(null, '', window.location.href)
      }
    }

    // Push initial state so popstate fires on Back button
    window.history.pushState(null, '', window.location.href)
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      if (backPressTimer) clearTimeout(backPressTimer)
    }
  }, [currentView])

  // ─────────────────────────────────────────────────────────────
  // Boot-time connectivity gate — render AFTER all hooks.
  // ─────────────────────────────────────────────────────────────
  // bootOnline === null = still checking → show loading spinner
  // bootOnline === false = offline → show branded offline screen
  // bootOnline === true = online → proceed with normal app render
  if (bootOnline === null) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold sintha-gradient-text mb-2">SINTHA</h1>
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </main>
    )
  }

  if (bootOnline === false) {
    return <OfflineBootScreen onOnline={() => setBootOnline(true)} />
  }

  const renderView = () => {
    // Wrap all screens in Suspense so lazy-loaded chunks show a loader
    // while downloading instead of crashing.
    const S = ({ children }: { children: React.ReactNode }) => (
      <Suspense fallback={<ScreenLoader />}>{children}</Suspense>
    )

    switch (currentView) {
      case 'landing':
        return <LandingScreen />
      case 'login':
      case 'register':
        return <AuthScreen />
      case 'role-select':
        return <RoleSelectScreen />
      case 'home':
        return <HomeScreen />
      case 'category':
        return <S><CategoryScreen /></S>
      case 'provider-profile':
        return <S><ProviderProfileScreen /></S>
      case 'booking-form':
        return <S><BookingFormScreen /></S>
      case 'my-bookings':
        return <S><MyBookingsScreen /></S>
      case 'booking-detail':
        return <S><BookingDetailScreen /></S>
      case 'chat-list':
        return <S><ChatListScreen /></S>
      case 'chat-room':
        return <S><ChatRoomScreen /></S>
      case 'ai-assistant':
        return <S><AIAssistantScreen /></S>
      case 'sintha-pro':
        return <S><SinthaProScreen /></S>
      case 'verification':
        return <S><VerificationScreen /></S>
      case 'profile':
        return <S><ProfileScreen /></S>
      case 'notifications':
        return <S><NotificationsScreen /></S>
      case 'admin-dashboard':
        return <S><AdminDashboardScreen /></S>
      case 'admin-users':
        return <S><AdminUsersScreen /></S>
      case 'admin-providers':
        return <S><AdminUsersScreen /></S>
      case 'admin-bookings':
        return <S><AdminBookingsScreen /></S>
      case 'admin-categories':
        return <S><AdminCategoriesScreen /></S>
      case 'admin-verifications':
        return <S><AdminVerificationsScreen /></S>
      case 'provider-dashboard':
        return <S><ProviderDashboardScreen /></S>
      case 'provider-onboarding':
        return <S><ProviderOnboardingScreen /></S>
      case 'reviews':
        return <S><ReviewsScreen /></S>
      case 'forgot-password':
        return <S><ForgotPasswordScreen /></S>
      case 'report-provider':
        return <S><ReportProviderScreen /></S>
      case 'admin-claims':
        return <S><AdminClaimsScreen /></S>
      case 'admin-broadcast':
        return <S><AdminBroadcastScreen /></S>
      case 'post-job':
        return <S><PostJobScreen /></S>
      case 'my-jobs':
        return <S><MyJobsScreen /></S>
      case 'open-jobs':
        return <S><OpenJobsScreen /></S>
      case 'job-detail':
        return <S><JobDetailScreen /></S>
      case 'help':
        return <S><HelpScreen /></S>
      case 'saved-providers':
        return <S><SavedProvidersScreen /></S>
      case 'saved-addresses':
        return <S><SavedAddressesScreen /></S>
      case 'referrals':
        return <S><ReferralsScreen /></S>
      case 'price-estimator':
        return <S><PriceEstimatorScreen /></S>
      default:
        return <LandingScreen />
    }
  }

  // Show loading while Firebase auth is initializing
  if (!isAuthReady) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold sintha-gradient-text mb-2">SINTHA</h1>
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen">
      {renderView()}
    </main>
  )
}
