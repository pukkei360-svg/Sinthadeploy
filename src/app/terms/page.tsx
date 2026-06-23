import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service — SINTHA',
  description: 'The terms and conditions for using SINTHA services.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8 bg-white min-h-screen">
        <Link href="/" className="text-blue-600 hover:underline text-sm mb-4 inline-block">
          ← Back to SINTHA
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: June 18, 2026</p>

        <div className="prose prose-sm max-w-none text-gray-700 space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">1. Acceptance of Terms</h2>
            <p>
              Welcome to SINTHA. By accessing or using our website at
              <a href="https://sinthadeploy.vercel.app" className="text-blue-600 hover:underline"> https://sinthadeploy.vercel.app</a>
              (the &quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, please do not use the Service.
            </p>
            <p>
              These Terms constitute a legally binding agreement between you and SINTHA (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), a service marketplace operating in Manipur, India.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">2. Description of Service</h2>
            <p>
              SINTHA is an online marketplace platform that connects clients seeking local services with service providers in Manipur, India. Our service categories include:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Home Services (plumbing, electrical, carpentry, cleaning)</li>
              <li>Education (tutoring, training, coaching)</li>
              <li>Transport (driving, vehicle services)</li>
              <li>Events (photography, decoration, planning)</li>
              <li>Beauty (makeup, salon services)</li>
              <li>Repairs (mobile, computer, electronics)</li>
            </ul>
            <p className="mt-2">
              <strong>SINTHA is a marketplace, not a service provider.</strong> We do not employ the service providers on our platform. We facilitate connections between clients and providers and process payments on behalf of providers. The actual service is delivered by the provider, not SINTHA.
            </p>
            <p className="mt-2">
              <strong>Zero Commission Policy:</strong> SINTHA does not charge any commission on bookings. Providers receive 100% of the booking amount. We monetize through optional PRO subscriptions for providers who want premium features.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">3. User Accounts</h2>
            <p className="font-medium text-gray-900">3.1 Account Creation:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>You must be at least 18 years old to create an account</li>
              <li>You must provide accurate, complete, and current information</li>
              <li>You are responsible for maintaining the confidentiality of your password</li>
              <li>You are responsible for all activities under your account</li>
              <li>One person may maintain only one account</li>
            </ul>
            <p className="font-medium text-gray-900 mt-4">3.2 Account Types:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Client:</strong> Can browse providers, book services, chat with providers after booking, leave reviews</li>
              <li><strong>Provider:</strong> Can create a service profile, receive bookings, chat with clients, earn money</li>
              <li><strong>Admin:</strong> SINTHA team members who manage the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">4. Client Responsibilities</h2>
            <p>As a client using SINTHA, you agree to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Provide accurate booking details (service required, date, time, address)</li>
              <li>Be available at the agreed time and location</li>
              <li>Pay the agreed amount directly to the provider (SINTHA does not handle service payments between clients and providers, only PRO subscription payments)</li>
              <li>Treat service providers with respect and dignity</li>
              <li>Not request illegal, dangerous, or unethical services</li>
              <li>Cancel bookings in a timely manner if you cannot make it</li>
              <li>Provide honest reviews based on actual service received</li>
              <li>Not abuse, harass, or threaten service providers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">5. Provider Responsibilities</h2>
            <p>As a service provider on SINTHA, you agree to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Provide accurate information about your skills, experience, and rates</li>
              <li>Deliver services as described in your profile and agreed in the booking</li>
              <li>Arrive on time for scheduled bookings</li>
              <li>Maintain professional conduct with clients</li>
              <li>Comply with all applicable laws and regulations</li>
              <li>Have necessary licenses/permits for your service (e.g., electrician license)</li>
              <li>Not discriminate against clients based on religion, caste, gender, or ethnicity</li>
              <li>Notify clients promptly if you cannot fulfill a booking</li>
              <li>Not solicit clients to bypass the SINTHA platform for future bookings</li>
            </ul>
            <p className="mt-2">
              <strong>Verification:</strong> Providers may submit verification documents (Aadhaar, selfie, address proof) to earn a &quot;Verified&quot; badge. Verified providers appear higher in search results and build more trust with clients.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">6. Bookings &amp; Payments</h2>
            <p className="font-medium text-gray-900">6.1 Booking Process:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Clients browse providers and submit a booking request</li>
              <li>Bookings are auto-accepted by the system</li>
              <li>Both parties receive confirmation via email and in-app notification</li>
              <li>After booking, contact details (phone number) are shared so parties can coordinate</li>
            </ul>
            <p className="font-medium text-gray-900 mt-4">6.2 Service Payments:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Service payments are made directly between client and provider (cash, UPI, etc.)</li>
              <li>SINTHA does not process or hold service payments</li>
              <li>SINTHA charges 0% commission on bookings</li>
              <li>Any payment disputes must be resolved between client and provider</li>
            </ul>
            <p className="font-medium text-gray-900 mt-4">6.3 PRO Subscription Payments:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>PRO subscription costs ₹199/month, processed via Razorpay</li>
              <li>PRO is optional — providers can use SINTHA free forever</li>
              <li>PRO features: featured placement, verified badge, priority support</li>
              <li>See our <Link href="/refund-policy" className="text-blue-600 hover:underline">Refund Policy</Link> for PRO refund terms</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">7. Communication &amp; Privacy</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>SINTHA provides in-app chat between clients and providers after a booking is made</li>
              <li>Chat is unlocked only after a booking — this prevents spam</li>
              <li>Phone numbers are shared after booking so parties can call/WhatsApp directly</li>
              <li>Users must not misuse contact information for marketing, harassment, or spam</li>
              <li>See our <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link> for how we handle your data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">8. Prohibited Conduct</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Use the Service for any illegal purpose</li>
              <li>Submit false or misleading information</li>
              <li>Impersonate another person or entity</li>
              <li>Harass, abuse, or threaten other users</li>
              <li>Solicit or offer illegal services</li>
              <li>Upload viruses, malware, or harmful code</li>
              <li>Attempt to access unauthorized areas of the Service</li>
              <li>Scrape, copy, or resell provider listings</li>
              <li>Circumvent the platform to avoid fees (not applicable — we charge 0% commission, but please use SINTHA for safety)</li>
              <li>Create multiple accounts to manipulate reviews or ratings</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">9. Reviews &amp; Ratings</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Reviews must be honest and based on actual service experiences</li>
              <li>Reviews must not contain abusive, defamatory, or false content</li>
              <li>SINTHA may remove reviews that violate these Terms</li>
              <li>Providers cannot pay for positive reviews or threaten clients for negative ones</li>
              <li>SINTHA is not responsible for the content of user reviews</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">10. Verification &amp; Trust</h2>
            <p>
              SINTHA offers optional identity verification for providers. Verified providers submit government-issued ID (Aadhaar) and a selfie. SINTHA reviews these documents and awards a &quot;Verified&quot; badge if approved.
            </p>
            <p>
              <strong>Important:</strong> Verification does not guarantee the quality of service. It only confirms the provider&apos;s identity. Clients should still exercise their own judgment when booking services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">11. Disclaimers</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>SINTHA is a marketplace platform and does not provide services directly</li>
              <li>We do not guarantee the quality, safety, or legality of services offered by providers</li>
              <li>We are not liable for any damages, injuries, or losses resulting from services booked through SINTHA</li>
              <li>The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind</li>
              <li>We do not warrant that the Service will be uninterrupted, secure, or error-free</li>
              <li>Any reliance on provider information is at your own risk</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">12. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, SINTHA shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Loss of profits, data, or goodwill</li>
              <li>Damages from service provider misconduct or negligence</li>
              <li>Damages from communication between users outside our platform</li>
              <li>Damages from payment disputes between clients and providers</li>
              <li>Service interruptions or technical failures</li>
            </ul>
            <p className="mt-2">
              Our total liability for any claim arising from these Terms or the Service shall not exceed the amount you have paid us in the past 12 months (for PRO subscriptions).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">13. Indemnification</h2>
            <p>
              You agree to indemnify and hold SINTHA harmless from any claims, damages, losses, or expenses (including legal fees) arising from:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any third-party rights</li>
              <li>Any service you provide or receive through SINTHA</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">14. Account Suspension &amp; Termination</h2>
            <p>We may suspend or terminate your account if you:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Violate these Terms</li>
              <li>Engage in fraudulent or illegal activity</li>
              <li>Receive multiple complaints from other users</li>
              <li>Fail to provide services as agreed</li>
              <li>Misuse the platform or other users</li>
            </ul>
            <p className="mt-2">
              You may delete your account at any time by emailing <a href="mailto:sinthahelp@gmail.com" className="text-blue-600 hover:underline">sinthahelp@gmail.com</a>. Upon termination, your profile will be removed, but booking records may be retained for legal compliance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">15. Dispute Resolution</h2>
            <p>
              Any disputes arising from these Terms or the Service shall first be attempted to be resolved through amicable discussion. If unresolved within 30 days, the dispute shall be referred to arbitration in Imphal, Manipur, in accordance with the Arbitration and Conciliation Act, 1996. The language of arbitration shall be English.
            </p>
            <p className="mt-2">
              These Terms shall be governed by the laws of India. Courts in Imphal, Manipur shall have exclusive jurisdiction over any disputes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">16. Changes to Terms</h2>
            <p>
              We may modify these Terms at any time. We will notify users of significant changes via email or in-app notification. Continued use of the Service after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">17. Contact Us</h2>
            <p>If you have any questions about these Terms, please contact us:</p>
            <div className="bg-gray-50 rounded-lg p-4 mt-2">
              <p><strong>SINTHA</strong></p>
              <p>Email: <a href="mailto:sinthahelp@gmail.com" className="text-blue-600 hover:underline">sinthahelp@gmail.com</a></p>
              <p>Email: <a href="mailto:sinthahelp@gmail.com" className="text-blue-600 hover:underline">sinthahelp@gmail.com</a></p>
              <p>Location: Manipur, India</p>
            </div>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
          {' • '}
          <Link href="/refund-policy" className="text-blue-600 hover:underline">Refund Policy</Link>
          {' • '}
          <Link href="/contact" className="text-blue-600 hover:underline">Contact Us</Link>
        </div>
      </div>
    </div>
  )
}
