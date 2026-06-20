'use client'

import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Sparkles, Shield, Bot, Languages, ArrowRight, Briefcase, Home, Zap, MapPin, Star, Wrench, GraduationCap, Car, Camera } from 'lucide-react'

export default function LandingScreen() {
  const { navigate } = useAppStore()

  const features = [
    { icon: Shield, title: 'No Commission', desc: '100% earnings to providers' },
    { icon: Bot, title: 'AI Powered', desc: 'Smart matching & assistance' },
    { icon: Star, title: 'Verified Providers', desc: 'Background checked pros' },
    { icon: Languages, title: 'Local Language', desc: 'Meitei Mayek support' },
  ]

  const services = [
    { icon: Home, name: 'Home Services' },
    { icon: Sparkles, name: 'Beauty & Wellness' },
    { icon: Briefcase, name: 'Professional' },
    { icon: MapPin, name: 'Local Transport' },
  ]

  // Services for the running marquee animation
  const marqueeServices = [
    { icon: Home, name: 'Plumbing' },
    { icon: Zap, name: 'Electrical' },
    { icon: GraduationCap, name: 'Tutoring' },
    { icon: Car, name: 'Driving' },
    { icon: Camera, name: 'Photography' },
    { icon: Sparkles, name: 'Makeup' },
    { icon: Wrench, name: 'Mobile Repair' },
    { icon: Briefcase, name: 'Carpentry' },
    { icon: Home, name: 'Cleaning' },
    { icon: Star, name: 'Event Planning' },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden sintha-gradient min-h-[80vh] flex flex-col items-center justify-center px-4 text-white">
        {/* Animated background circles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-20 w-72 h-72 bg-white/10 rounded-full animate-pulse" />
          <div className="absolute top-1/3 -right-16 w-56 h-56 bg-white/5 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute -bottom-10 left-1/4 w-40 h-40 bg-white/5 rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative z-10 text-center max-w-lg mx-auto">
          {/* Logo */}
          <div className="mb-2">
            <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight">SINTHA</h1>
          </div>
          <p className="text-xl sm:text-2xl opacity-90 mb-2" style={{ fontFamily: 'serif' }}>ꯁꯤꯟꯊꯥ</p>
          <p className="text-lg sm:text-xl opacity-80 font-light mt-4 mb-2">
            Trusted Hands. Trusted Services.
          </p>
          <p className="text-sm opacity-60 mb-8">
            Manipur&apos;s first commission-free service marketplace
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <Button
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100 font-semibold text-base px-8 py-6 rounded-xl shadow-lg"
              onClick={() => navigate('login')}
            >
              Get Started <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/50 text-white hover:bg-white/10 font-semibold text-base px-8 py-6 rounded-xl"
              onClick={() => navigate('register')}
            >
              <Briefcase className="mr-2 h-5 w-5" /> I&apos;m a Provider
            </Button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative z-10 mt-10 flex items-center gap-6 text-center">
          <div>
            <p className="text-2xl font-bold">0%</p>
            <p className="text-[10px] opacity-60">Commission</p>
          </div>
          <div className="w-px h-8 bg-white/30" />
          <div>
            <p className="text-2xl font-bold">AI</p>
            <p className="text-[10px] opacity-60">Powered</p>
          </div>
          <div className="w-px h-8 bg-white/30" />
          <div>
            <p className="text-2xl font-bold flex items-center gap-1"><MapPin className="h-5 w-5" /> Manipur</p>
            <p className="text-[10px] opacity-60">Focused</p>
          </div>
        </div>
      </div>

      {/* Running Services Marquee */}
      <div className="py-4 bg-black overflow-hidden">
        <div className="flex gap-4 animate-marquee whitespace-nowrap">
          {[...marqueeServices, ...marqueeServices].map((s, i) => (
            <div key={i} className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <s.icon className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-medium text-white">{s.name}</span>
              <span className="text-white/30 ml-2">•</span>
            </div>
          ))}
        </div>
      </div>

      {/* Popular Services */}
      <div className="py-10 px-4 bg-gray-50">
        <div className="max-w-lg mx-auto">
          <h2 className="text-center text-lg font-bold text-gray-800 mb-6">Popular Services</h2>
          <div className="grid grid-cols-4 gap-3">
            {services.map((s) => (
              <div key={s.name} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-2">
                  <s.icon className="h-6 w-6 text-black" />
                </div>
                <p className="text-[11px] font-medium text-gray-700">{s.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-10 px-4 bg-white">
        <div className="max-w-lg mx-auto">
          <h2 className="text-center text-lg font-bold text-gray-800 mb-6">
            Why Choose SINTHA?
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-gradient-to-br from-blue-50 to-green-50 rounded-xl p-4 text-center sintha-card-hover"
              >
                <div className="w-12 h-12 rounded-full sintha-gradient flex items-center justify-center mx-auto mb-3">
                  <f.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-800 text-sm">{f.title}</h3>
                <p className="text-xs text-gray-500 mt-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="py-10 px-4 bg-gray-50">
        <div className="max-w-lg mx-auto">
          <h2 className="text-center text-lg font-bold text-gray-800 mb-6">How It Works</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4 bg-white rounded-xl p-4 shadow-sm">
              <div className="w-10 h-10 rounded-full sintha-gradient flex items-center justify-center text-white font-bold shrink-0">1</div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Sign Up & Choose Role</p>
                <p className="text-xs text-gray-500">Register as a client or service provider</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white rounded-xl p-4 shadow-sm">
              <div className="w-10 h-10 rounded-full sintha-gradient flex items-center justify-center text-white font-bold shrink-0">2</div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Find or Offer Services</p>
                <p className="text-xs text-gray-500">Browse providers or list your skills</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white rounded-xl p-4 shadow-sm">
              <div className="w-10 h-10 rounded-full sintha-gradient flex items-center justify-center text-white font-bold shrink-0">3</div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Book & Connect</p>
                <p className="text-xs text-gray-500">Chat, book, and get things done - zero commission</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="py-8 px-4 bg-white">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-lg font-bold text-gray-800 mb-2">Ready to get started?</h2>
          <p className="text-sm text-gray-500 mb-4">Join Manipur&apos;s trusted service marketplace today</p>
          <Button
            size="lg"
            className="sintha-gradient text-white font-semibold text-base px-8 py-6 rounded-xl shadow-lg"
            onClick={() => navigate('register')}
          >
            Create Free Account <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto py-6 px-4 text-center border-t bg-gray-50">
        <p className="text-sm font-semibold text-gray-700 mb-2">SINTHA</p>
        <p className="text-xs text-gray-500 mb-3">Trusted Hands. Trusted Services. Made in Manipur.</p>

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

        {/* Contact info */}
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-gray-500 mb-3">
          <a href="mailto:pukkei365@gmail.com" className="hover:text-blue-600 hover:underline">pukkei365@gmail.com</a>
          <span className="text-gray-300">•</span>
          <a href="https://wa.me/917005151875" className="hover:text-green-600 hover:underline">WhatsApp Support</a>
        </div>

        <p className="text-xs text-gray-400 mb-2">&copy; 2026 SINTHA &bull; All rights reserved</p>

        <button
          onClick={() => navigate('login', { role: 'admin' })}
          className="text-[10px] text-gray-300 hover:text-gray-500 underline"
        >
          Admin Login
        </button>
      </div>
    </div>
  )
}
