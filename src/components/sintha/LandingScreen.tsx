'use client'

import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Sparkles, Shield, Bot, Languages, ArrowRight, Briefcase, Home, Zap, MapPin, Star, Wrench, GraduationCap, Car, Camera } from 'lucide-react'
import HighlightCarousel from './HighlightCarousel'

export default function LandingScreen() {
  const { navigate } = useAppStore()

  const features = [
    { icon: Shield, title: 'No Commission', desc: '100% earnings to providers' },
    { icon: Zap, title: 'Fast & Easy', desc: 'Quick booking in minutes' },
    { icon: Star, title: 'Verified Providers', desc: 'Background checked pros' },
    { icon: Languages, title: 'Local Language', desc: 'Meitei Mayek support' },
  ]

  const services = [
    { icon: Home, name: 'Home Services' },
    { icon: Sparkles, name: 'Beauty & Wellness' },
    { icon: Briefcase, name: 'Professional' },
    { icon: MapPin, name: 'Local Transport' },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* Hero Section — reduced from 80vh to 55vh so the animated carousel
          is visible without scrolling (or with minimal scrolling) on phones.
          The carousel is the most visually compelling element and should be
          the first thing users see after the logo + CTA buttons. */}
      <div className="relative overflow-hidden sintha-gradient min-h-[55vh] flex flex-col items-center justify-center px-4 py-8 text-white">
        {/* Animated background circles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-20 w-72 h-72 bg-white/10 rounded-full animate-pulse" />
          <div className="absolute top-1/3 -right-16 w-56 h-56 bg-white/5 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute -bottom-10 left-1/4 w-40 h-40 bg-white/5 rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative z-10 text-center max-w-lg mx-auto">
          {/* Logo */}
          <div className="mb-1">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">SINTHA</h1>
          </div>
          <p className="text-lg sm:text-xl opacity-90 mb-1" style={{ fontFamily: 'serif' }}>ꯁꯤꯟꯊꯥ</p>
          <p className="text-base sm:text-lg opacity-80 font-light mt-2 mb-1">
            Trusted Hands. Trusted Services.
          </p>
          <p className="text-xs opacity-60 mb-4">
            Manipur&apos;s first commission-free service marketplace
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 justify-center mt-4">
            <Button
              size="lg"
              className="bg-white text-[#0F4C81] hover:bg-gray-100 font-semibold text-base px-8 py-5 rounded-2xl shadow-lg"
              onClick={() => navigate('login')}
            >
              Get Started <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/50 text-white hover:bg-white/10 font-semibold text-base px-8 py-5 rounded-2xl"
              onClick={() => navigate('register')}
            >
              <Briefcase className="mr-2 h-5 w-5" /> I&apos;m a Provider
            </Button>
          </div>
        </div>

        {/* Stats bar — tightened spacing (mt-6 instead of mt-10) */}
        <div className="relative z-10 mt-6 flex items-center gap-6 text-center">
          <div>
            <p className="text-xl font-bold">0%</p>
            <p className="text-[10px] opacity-60">Commission</p>
          </div>
          <div className="w-px h-8 bg-white/30" />
          <div>
            <p className="text-xl font-bold">Local</p>
            <p className="text-[10px] opacity-60">Trusted</p>
          </div>
          <div className="w-px h-8 bg-white/30" />
          <div>
            <p className="text-xl font-bold flex items-center gap-1"><MapPin className="h-4 w-4" /> Manipur</p>
            <p className="text-[10px] opacity-60">Focused</p>
          </div>
        </div>
      </div>

      {/* Highlight Carousel — moved up (reduced top padding from py-6 to pt-4)
          so it appears immediately below the hero stats bar. */}
      <div className="pt-4 px-4 bg-white">
        <div className="max-w-lg mx-auto">
          <h2 className="text-center text-lg font-bold text-[#1E293B] mb-3">
            How SINTHA Helps Manipur
          </h2>
          <HighlightCarousel />
        </div>
      </div>

      {/* Popular Services */}
      <div className="py-10 px-4 bg-white">
        <div className="max-w-lg mx-auto">
          <h2 className="text-center text-lg font-bold text-[#1E293B] mb-6">Popular Services</h2>
          <div className="grid grid-cols-4 gap-3">
            {services.map((s) => (
              <div key={s.name} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center mx-auto mb-2">
                  <s.icon className="h-6 w-6 text-[#0F4C81]" />
                </div>
                <p className="text-[11px] font-medium text-[#64748B]">{s.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-10 px-4 bg-[#F8FAFC]">
        <div className="max-w-lg mx-auto">
          <h2 className="text-center text-lg font-bold text-[#1E293B] mb-6">
            Why Choose SINTHA?
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-gradient-to-br from-blue-50 to-green-50 rounded-2xl p-4 text-center sintha-card-hover"
              >
                <div className="w-12 h-12 rounded-full sintha-gradient flex items-center justify-center mx-auto mb-3">
                  <f.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-[#1E293B] text-sm">{f.title}</h3>
                <p className="text-xs text-[#64748B] mt-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="py-10 px-4 bg-white">
        <div className="max-w-lg mx-auto">
          <h2 className="text-center text-lg font-bold text-[#1E293B] mb-6">How It Works</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm">
              <div className="w-10 h-10 rounded-full sintha-gradient flex items-center justify-center text-white font-bold shrink-0">1</div>
              <div>
                <p className="text-sm font-semibold text-[#1E293B]">Sign Up & Choose Role</p>
                <p className="text-xs text-[#64748B]">Register as a client or service provider</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm">
              <div className="w-10 h-10 rounded-full sintha-gradient flex items-center justify-center text-white font-bold shrink-0">2</div>
              <div>
                <p className="text-sm font-semibold text-[#1E293B]">Find or Offer Services</p>
                <p className="text-xs text-[#64748B]">Browse providers or list your skills</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm">
              <div className="w-10 h-10 rounded-full sintha-gradient flex items-center justify-center text-white font-bold shrink-0">3</div>
              <div>
                <p className="text-sm font-semibold text-[#1E293B]">Book & Connect</p>
                <p className="text-xs text-[#64748B]">Chat, book, and get things done - zero commission</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="py-8 px-4 bg-[#F8FAFC]">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-lg font-bold text-[#1E293B] mb-2">Ready to get started?</h2>
          <p className="text-sm text-[#64748B] mb-4">Join Manipur&apos;s trusted service marketplace today</p>
          <Button
            size="lg"
            className="sintha-gradient text-white font-semibold text-base px-8 py-6 rounded-2xl shadow-lg"
            onClick={() => navigate('register')}
          >
            Create Free Account <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto py-6 px-4 text-center border-t bg-white">
        <p className="text-sm font-semibold text-[#64748B] mb-2">SINTHA</p>
        <p className="text-xs text-[#64748B] mb-3">Trusted Hands. Trusted Services. Made in Manipur.</p>

        {/* Legal links — required for Razorpay compliance */}
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs mb-3">
          <a href="/privacy" className="text-gray-600 hover:text-blue-600 hover:underline">Privacy Policy</a>
          <span className="text-gray-300">•</span>
          <a href="/terms" className="text-gray-600 hover:text-blue-600 hover:underline">Terms of Service</a>
          <span className="text-gray-300">•</span>
          <a href="/refund-policy" className="text-gray-600 hover:text-blue-600 hover:underline">Refund Policy</a>
          <span className="text-gray-300">•</span>
          <a href="/contact" className="text-gray-600 hover:text-blue-600 hover:underline">Contact Us</a>
        </div>

        {/* Contact info — email only (WhatsApp removed: personal number). */}
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-[#64748B] mb-3">
          <a href="mailto:sinthahelp@gmail.com" className="hover:text-blue-600 hover:underline">sinthahelp@gmail.com</a>
          <span className="text-gray-300">•</span>
          <a href="/contact" className="hover:text-blue-600 hover:underline">Contact Support</a>
        </div>

        <p className="text-xs text-gray-400 mb-2">&copy; 2026 SINTHA &bull; All rights reserved</p>

        <button
          onClick={() => navigate('login', { role: 'admin' })}
          className="text-[10px] text-gray-300 hover:text-[#64748B] underline"
        >
          Admin Login
        </button>
      </div>
    </div>
  )
}
