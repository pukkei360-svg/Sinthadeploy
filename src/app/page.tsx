'use client'

import { useEffect } from 'react'
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

export default function Home() {
  const { currentView, setUser, navigate, isAuthReady, setAuthReady, setMyProviderProfile } = useAppStore()

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
