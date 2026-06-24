'use client'

import { useEffect, useState, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import LandingScreen from '@/components/sintha/LandingScreen'
import AuthScreen from '@/components/sintha/AuthScreen'
import RoleSelectScreen from '@/components/sintha/RoleSelectScreen'
import HomeScreen from '@/components/sintha/HomeScreen'
import CategoryScreen from '@/components/sintha/CategoryScreen'
import ProviderProfileScreen from '@/components/sintha/ProviderProfileScreen'
import BookingFormScreen from '@/components/sintha/BookingFormScreen'
import MyBookingsScreen from '@/components/sintha/MyBookingsScreen'
import BookingDetailScreen from '@/components/sintha/BookingDetailScreen'
import ChatListScreen from '@/components/sintha/ChatListScreen'
import ChatRoomScreen from '@/components/sintha/ChatRoomScreen'
import AIAssistantScreen from '@/components/sintha/AIAssistantScreen'
import SinthaProScreen from '@/components/sintha/SinthaProScreen'
import VerificationScreen from '@/components/sintha/VerificationScreen'
import ProfileScreen from '@/components/sintha/ProfileScreen'
import NotificationsScreen from '@/components/sintha/NotificationsScreen'
import AdminDashboardScreen from '@/components/sintha/AdminDashboardScreen'
import AdminUsersScreen from '@/components/sintha/AdminUsersScreen'
import AdminBookingsScreen from '@/components/sintha/AdminBookingsScreen'
import AdminCategoriesScreen from '@/components/sintha/AdminCategoriesScreen'
import AdminVerificationsScreen from '@/components/sintha/AdminVerificationsScreen'
import ProviderDashboardScreen from '@/components/sintha/ProviderDashboardScreen'
import ProviderOnboardingScreen from '@/components/sintha/ProviderOnboardingScreen'
import ReviewsScreen from '@/components/sintha/ReviewsScreen'
import ForgotPasswordScreen from '@/components/sintha/ForgotPasswordScreen'
import ReportProviderScreen from '@/components/sintha/ReportProviderScreen'
import AdminClaimsScreen from '@/components/sintha/AdminClaimsScreen'
import AdminBroadcastScreen from '@/components/sintha/AdminBroadcastScreen'
import PostJobScreen from '@/components/sintha/PostJobScreen'
import MyJobsScreen from '@/components/sintha/MyJobsScreen'
import OpenJobsScreen from '@/components/sintha/OpenJobsScreen'
import JobDetailScreen from '@/components/sintha/JobDetailScreen'
import OfflineBootScreen from '@/components/sintha/OfflineBootScreen'
import HelpScreen from '@/components/sintha/HelpScreen'
import SavedProvidersScreen from '@/components/sintha/SavedProvidersScreen'
import SavedAddressesScreen from '@/components/sintha/SavedAddressesScreen'
import ReferralsScreen from '@/components/sintha/ReferralsScreen'

export default function Home() {
  const {
    currentView, setUser, navigate, isAuthReady, setAuthReady,
    setMyProviderProfile, user, setNotifications,
  } = useAppStore()

  // Boot-time connectivity check — only runs ONCE per session.
  // If the user is already logged in (has a saved session), skip the check
  // and render immediately. The OfflineBootstrap banner handles mid-session
  // offline states.
  const [bootOnline, setBootOnline] = useState<boolean | null>(() => {
    // If user has a saved session, skip the boot check — render immediately.
    // The auth listener will handle the session restoration.
    if (typeof window !== 'undefined' && localStorage.getItem('sintha_user')) {
      return true
    }
    return null
  })

  useEffect(() => {
    // Skip if already determined (user has saved session)
    if (bootOnline !== null) return

    let cancelled = false
    const check = async () => {
      try {
        // Quick HEAD request (lighter than GET) to check connectivity
        const url = `/api/push-test?_=${Date.now()}`
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 3000)
        const res = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        })
        clearTimeout(timeout)
        if (cancelled) return
        if (res.ok) {
          setBootOnline(true)
          return
        }
        setBootOnline(false)
      } catch {
        if (!cancelled) setBootOnline(false)
      }
    }
    check()
    return () => { cancelled = true }
  }, [bootOnline])

  // Referral code pre-fill from /r/<code> redirect
  useEffect(() => {
    if (typeof window === 'undefined') return
    const urlParams = new URLSearchParams(window.location.search)
    const refCode = urlParams.get('ref')
    if (refCode) {
      localStorage.setItem('sintha_pending_referral', refCode.toUpperCase())
      const cleanUrl = window.location.pathname + window.location.hash
      window.history.replaceState(null, '', cleanUrl)
    }
  }, [])

  // Listen to Firebase auth state changes — with a guard to prevent
  // re-navigation when Firebase re-emits the auth state (token refresh, etc.)
  const hasNavigated = useRef(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // If we already navigated (user is already logged in), DON'T re-navigate.
        // Firebase re-emits auth state on token refresh — we only want to
        // navigate once on initial login.
        if (hasNavigated.current) {
          // Just refresh the user data silently, don't re-navigate
          try {
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
          } catch {}
          return
        }

        try {
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

          // Mark as navigated so we don't re-navigate on next auth state change
          hasNavigated.current = true

          if (data.user.role === 'provider') {
            try {
              const provData = await apiFetch(`/providers?userId=${data.user.id}`)
              const providers = provData.providers || []
              if (providers.length > 0) {
                setMyProviderProfile(providers[0])
                navigate('provider-dashboard')
              } else {
                navigate('provider-onboarding')
              }
            } catch (provErr) {
              console.error('Provider profile check failed:', provErr)
              try {
                const savedProfile = localStorage.getItem('sintha_provider_profile')
                if (savedProfile) {
                  const profile = JSON.parse(savedProfile)
                  setMyProviderProfile(profile)
                  navigate('provider-dashboard')
                } else {
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
            navigate('role-select')
          }
        } catch (err) {
          console.error('Failed to sync Firebase user to backend:', err)

          if (err instanceof Error && (err.message.includes('banned') || err.message.includes('suspended'))) {
            try {
              const { signOut } = await import('firebase/auth')
              await signOut(auth)
            } catch {}
            localStorage.removeItem('sintha_user')
            localStorage.removeItem('sintha_token')
            localStorage.removeItem('sintha_provider_profile')

            const banMsg = err instanceof Error && err.message.toLowerCase().includes('banned')
              ? 'This account has been permanently banned. Please contact support.'
              : err instanceof Error && err.message.toLowerCase().includes('suspended')
              ? 'Your account has been temporarily suspended. Please contact support.'
              : 'Something went wrong. Please try again.'
            alert(banMsg)

            setUser(null, null)
            navigate('landing')
            setAuthReady(true)
            hasNavigated.current = false
            return
          }

          // Fallback to localStorage
          try {
            const savedUser = localStorage.getItem('sintha_user')
            const savedToken = localStorage.getItem('sintha_token')
            if (savedUser && savedToken) {
              const user = JSON.parse(savedUser)
              setUser(user, savedToken)
              hasNavigated.current = true
              if (user.role === 'admin') {
                navigate('admin-dashboard')
              } else if (user.role === 'provider') {
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
                navigate('role-select')
              }
            }
          } catch {
            // Ignore
          }
        }
      } else {
        // No Firebase user - check localStorage for session
        hasNavigated.current = false
        try {
          const savedUser = localStorage.getItem('sintha_user')
          const savedToken = localStorage.getItem('sintha_token')
          if (savedUser && savedToken) {
            const user = JSON.parse(savedUser)
            setUser(user, savedToken)
            hasNavigated.current = true
            if (user.role === 'admin') {
              navigate('admin-dashboard')
            } else if (user.role === 'provider') {
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

  // Global notification preload
  useEffect(() => {
    if (!user) return
    let cancelled = false
    const loadNotifications = async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return
      try {
        const data = await apiFetch(`/notifications?userId=${user.id}`)
        if (!cancelled) setNotifications(data.notifications || [])
      } catch {
        // Silent
      }
    }
    loadNotifications()
    return () => { cancelled = true }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  // Android Back Button / End Key Handler
  useEffect(() => {
    let backPressCount = 0
    let backPressTimer: ReturnType<typeof setTimeout> | null = null

    const handlePopState = (e: PopStateEvent) => {
      if (currentView === 'landing') {
        backPressCount += 1

        if (backPressCount === 1) {
          window.history.pushState(null, '', window.location.href)

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

          backPressTimer = setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast)
            backPressCount = 0
          }, 2000)

          return
        }

        if (backPressCount >= 2) {
          if (backPressTimer) clearTimeout(backPressTimer)

          try {
            if (window.Android && window.Android.closeApp) {
              window.Android.closeApp()
              return
            }
          } catch {}

          try {
            window.close()
          } catch {}

          try {
            if (window.Android && window.Android.moveTaskToBack) {
              window.Android.moveTaskToBack(true)
              return
            }
          } catch {}

          window.location.href = 'about:blank'
        }
      } else {
        window.history.pushState(null, '', window.location.href)
      }
    }

    window.history.pushState(null, '', window.location.href)
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      if (backPressTimer) clearTimeout(backPressTimer)
    }
  }, [currentView])

  const renderView = () => {
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
        return <CategoryScreen />
      case 'provider-profile':
        return <ProviderProfileScreen />
      case 'booking-form':
        return <BookingFormScreen />
      case 'my-bookings':
        return <MyBookingsScreen />
      case 'booking-detail':
        return <BookingDetailScreen />
      case 'chat-list':
        return <ChatListScreen />
      case 'chat-room':
        return <ChatRoomScreen />
      case 'ai-assistant':
        return <AIAssistantScreen />
      case 'sintha-pro':
        return <SinthaProScreen />
      case 'verification':
        return <VerificationScreen />
      case 'profile':
        return <ProfileScreen />
      case 'notifications':
        return <NotificationsScreen />
      case 'admin-dashboard':
        return <AdminDashboardScreen />
      case 'admin-users':
        return <AdminUsersScreen />
      case 'admin-providers':
        return <AdminUsersScreen />
      case 'admin-bookings':
        return <AdminBookingsScreen />
      case 'admin-categories':
        return <AdminCategoriesScreen />
      case 'admin-verifications':
        return <AdminVerificationsScreen />
      case 'provider-dashboard':
        return <ProviderDashboardScreen />
      case 'provider-onboarding':
        return <ProviderOnboardingScreen />
      case 'reviews':
        return <ReviewsScreen />
      case 'forgot-password':
        return <ForgotPasswordScreen />
      case 'report-provider':
        return <ReportProviderScreen />
      case 'admin-claims':
        return <AdminClaimsScreen />
      case 'admin-broadcast':
        return <AdminBroadcastScreen />
      case 'post-job':
        return <PostJobScreen />
      case 'my-jobs':
        return <MyJobsScreen />
      case 'open-jobs':
        return <OpenJobsScreen />
      case 'job-detail':
        return <JobDetailScreen />
      case 'help':
        return <HelpScreen />
      case 'saved-providers':
        return <SavedProvidersScreen />
      case 'saved-addresses':
        return <SavedAddressesScreen />
      case 'referrals':
        return <ReferralsScreen />
      default:
        return <LandingScreen />
    }
  }

  // Boot connectivity gate
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
