import { create } from 'zustand'
import { clearApiCache } from './api'

export type View =
  | 'landing'
  | 'login'
  | 'register'
  | 'role-select'
  | 'home'
  | 'category'
  | 'provider-profile'
  | 'booking-form'
  | 'my-bookings'
  | 'booking-detail'
  | 'chat-list'
  | 'chat-room'
  | 'ai-assistant'
  | 'reviews'
  | 'sintha-pro'
  | 'verification'
  | 'profile'
  | 'notifications'
  | 'report-provider'
  | 'admin-dashboard'
  | 'admin-users'
  | 'admin-providers'
  | 'admin-bookings'
  | 'admin-categories'
  | 'admin-verifications'
  | 'admin-claims'
  | 'provider-dashboard'
  | 'provider-onboarding'
  | 'forgot-password'
  | 'post-job'
  | 'my-jobs'
  | 'open-jobs'
  | 'job-detail'

export interface User {
  id: string
  firebaseUid?: string
  email: string
  name: string
  photoUrl?: string
  role: string
  phone?: string
  location?: string
  isVerified: boolean
  isPro: boolean
  proExpiry?: string
  isBlocked: boolean
  createdAt: string
}

export interface ServiceCategory {
  id: string
  name: string
  icon?: string
  description?: string
  order: number
  isActive: boolean
  _count?: { providers: number }
}

export interface ProviderProfile {
  id: string
  userId: string
  categoryId: string
  experience?: string
  skills?: string
  description?: string
  hourlyRate?: number
  availability: string
  rating: number
  totalReviews: number
  totalBookings: number
  portfolioUrls?: string
  isFeatured: boolean
  isVerified: boolean
  user?: User
  category?: ServiceCategory
}

export interface Booking {
  id: string
  clientId: string
  providerId: string
  service: string
  description?: string
  date: string
  time?: string
  status: string
  address?: string
  createdAt: string
  client?: User
  provider?: User
  providerProfile?: ProviderProfile
  review?: Review
}

export interface Review {
  id: string
  bookingId: string
  authorId: string
  targetId: string
  rating: number
  comment?: string
  photoUrls?: string
  createdAt: string
  author?: User
}

export interface Conversation {
  id: string
  participantA: string
  participantB: string
  bookingId?: string
  lastMessage?: string
  lastMessageAt: string
  otherUser?: User
  unreadCount?: number
}

export interface ChatMessage {
  id: string
  conversationId: string
  senderId: string
  content: string
  type: string
  isRead: boolean
  createdAt: string
  sender?: User
}

export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: string
  isRead: boolean
  relatedId?: string
  createdAt: string
}

interface AppState {
  // Navigation
  currentView: View
  previousViews: View[]
  viewParams: Record<string, string>

  // Auth
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isAuthReady: boolean

  // Data
  categories: ServiceCategory[]
  providers: ProviderProfile[]
  myProviderProfile: ProviderProfile | null
  bookings: Booking[]
  conversations: Conversation[]
  messages: ChatMessage[]
  notifications: Notification[]
  reviews: Review[]

  // UI
  isLoading: boolean
  searchQuery: string
  activeTab: string

  // Navigation actions
  navigate: (view: View, params?: Record<string, string>) => void
  goBack: () => void

  // Auth actions
  setUser: (user: User | null, token?: string | null) => void
  logout: () => void
  setAuthReady: (ready: boolean) => void

  // Data actions
  setCategories: (categories: ServiceCategory[]) => void
  setProviders: (providers: ProviderProfile[]) => void
  setMyProviderProfile: (profile: ProviderProfile | null) => void
  setBookings: (bookings: Booking[]) => void
  addBooking: (booking: Booking) => void
  updateBooking: (id: string, data: Partial<Booking>) => void
  setConversations: (conversations: Conversation[]) => void
  setMessages: (messages: ChatMessage[]) => void
  addMessage: (message: ChatMessage) => void
  setNotifications: (notifications: Notification[]) => void
  setReviews: (reviews: Review[]) => void
  setIsLoading: (loading: boolean) => void
  setSearchQuery: (query: string) => void
  setActiveTab: (tab: string) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  // Navigation
  currentView: 'landing',
  previousViews: [],
  viewParams: {},

  // Auth
  user: null,
  token: null,
  isAuthenticated: false,
  isAuthReady: false,

  // Data
  categories: [],
  providers: [],
  myProviderProfile: null,
  bookings: [],
  conversations: [],
  messages: [],
  notifications: [],
  reviews: [],

  // UI
  isLoading: false,
  searchQuery: '',
  activeTab: 'home',

  // Navigation actions
  navigate: (view, params = {}) => {
    const state = get()
    set({
      currentView: view,
      previousViews: [...state.previousViews, state.currentView],
      viewParams: params,
    })
  },

  goBack: () => {
    const state = get()
    const prev = [...state.previousViews]
    const lastView = prev.pop()
    if (lastView) {
      set({ currentView: lastView, previousViews: prev })
    }
  },

  // Auth actions
  setUser: (user, token = null) => {
    const currentState = get()
    // If token is not provided, preserve the existing token
    const effectiveToken = token !== null ? token : currentState.token
    set({
      user,
      token: effectiveToken,
      isAuthenticated: !!user,
    })
    if (user) {
      localStorage.setItem('sintha_user', JSON.stringify(user))
      if (effectiveToken) {
        localStorage.setItem('sintha_token', effectiveToken)
      }
    } else {
      localStorage.removeItem('sintha_user')
      localStorage.removeItem('sintha_token')
    }
  },

  logout: () => {
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      currentView: 'landing',
      previousViews: [],
      viewParams: {},
      bookings: [],
      conversations: [],
      messages: [],
      notifications: [],
      myProviderProfile: null,
    })
    localStorage.removeItem('sintha_user')
    localStorage.removeItem('sintha_token')
    localStorage.removeItem('sintha_provider_profile')
    // Clear the API cache so the next user (after re-login) doesn't see
    // the previous user's cached data.
    clearApiCache()
  },

  setAuthReady: (ready: boolean) => set({ isAuthReady: ready }),

  // Data actions
  setCategories: (categories) => set({ categories }),
  setProviders: (providers) => set({ providers }),
  setMyProviderProfile: (myProviderProfile) => set({ myProviderProfile }),
  setBookings: (bookings) => set({ bookings }),
  addBooking: (booking) => set((s) => ({ bookings: [booking, ...s.bookings] })),
  updateBooking: (id, data) =>
    set((s) => ({
      bookings: s.bookings.map((b) => (b.id === id ? { ...b, ...data } : b)),
    })),
  setConversations: (conversations) => set({ conversations }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((s) => ({ messages: [...s.messages, message] })),
  setNotifications: (notifications) => set({ notifications }),
  setReviews: (reviews) => set({ reviews }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setActiveTab: (activeTab) => set({ activeTab }),
}))
