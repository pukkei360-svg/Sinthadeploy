import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Contact Us — SINTHA',
  description: 'Get in touch with the SINTHA team for support, queries, or feedback.',
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8 bg-white min-h-screen">
        <Link href="/" className="text-blue-600 hover:underline text-sm mb-4 inline-block">
          ← Back to SINTHA
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Contact Us</h1>
        <p className="text-sm text-gray-500 mb-8">
          We&apos;re here to help. Reach out to us through any of the channels below.
        </p>

        <div className="space-y-6">
          {/* Business Information */}
          <section className="bg-gray-50 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Business Information</h2>
            <div className="space-y-2 text-sm text-gray-700">
              <p><strong>Business Name:</strong> SINTHA</p>
              <p><strong>Type:</strong> Service Marketplace</p>
              <p><strong>Description:</strong> Online platform connecting clients with local service providers in Manipur, India. Categories include home services, education, transport, events, beauty, and repairs.</p>
              <p><strong>Location:</strong> Manipur, India</p>
              <p><strong>Website:</strong> <a href="https://sinthadeploy.vercel.app" className="text-blue-600 hover:underline">https://sinthadeploy.vercel.app</a></p>
            </div>
          </section>

          {/* Contact Channels */}
          <section className="bg-gray-50 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Contact Channels</h2>

            {/* Email */}
            <div className="flex items-start gap-3 py-3 border-b border-gray-200">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Email Support</p>
                <p className="text-sm text-gray-600">For account issues, refunds, technical problems</p>
                <a href="mailto:pukkei365@gmail.com" className="text-blue-600 hover:underline text-sm font-medium mt-1 inline-block">
                  pukkei365@gmail.com
                </a>
                <p className="text-xs text-gray-500 mt-1">Response time: within 24 hours (business days)</p>
              </div>
            </div>

            {/* WhatsApp */}
            <div className="flex items-start gap-3 py-3 border-b border-gray-200">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">WhatsApp Support</p>
                <p className="text-sm text-gray-600">For quick questions and instant help</p>
                <a href="https://wa.me/917005151875" className="text-green-600 hover:underline text-sm font-medium mt-1 inline-block">
                  Chat on WhatsApp
                </a>
                <p className="text-xs text-gray-500 mt-1">Available: 9 AM - 8 PM (IST), Monday to Saturday</p>
              </div>
            </div>

            {/* In-App */}
            <div className="flex items-start gap-3 py-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">In-App Support</p>
                <p className="text-sm text-gray-600">Use the AI Assistant inside the SINTHA app</p>
                <a href="https://sinthadeploy.vercel.app" className="text-purple-600 hover:underline text-sm font-medium mt-1 inline-block">
                  Open SINTHA App
                </a>
                <p className="text-xs text-gray-500 mt-1">Available 24/7 — AI-powered instant responses</p>
              </div>
            </div>
          </section>

          {/* Support Hours */}
          <section className="bg-gray-50 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Support Hours</h2>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-2 font-medium text-gray-900">Monday - Friday</td>
                  <td className="py-2 text-gray-700">9:00 AM - 8:00 PM (IST)</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 font-medium text-gray-900">Saturday</td>
                  <td className="py-2 text-gray-700">9:00 AM - 6:00 PM (IST)</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium text-gray-900">Sunday</td>
                  <td className="py-2 text-gray-700">Closed (email only)</td>
                </tr>
              </tbody>
            </table>
            <p className="text-xs text-gray-500 mt-2">
              IST = Indian Standard Time (UTC+5:30)
            </p>
          </section>

          {/* Common Topics */}
          <section className="bg-gray-50 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Common Support Topics</h2>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Account issues (login, password reset, account deletion)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Booking problems (cancellations, disputes with providers)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>PRO subscription (refunds, activation, features)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Provider verification (Aadhaar submission, status)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Payment issues (Razorpay, failed transactions)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>App feedback, feature requests, partnerships</span>
              </li>
            </ul>
          </section>

          {/* Legal Links */}
          <section className="text-center text-sm text-gray-500 pt-4 border-t border-gray-200">
            <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
            {' • '}
            <Link href="/terms" className="text-blue-600 hover:underline">Terms of Service</Link>
            {' • '}
            <Link href="/refund-policy" className="text-blue-600 hover:underline">Refund Policy</Link>
          </section>
        </div>
      </div>
    </div>
  )
}
