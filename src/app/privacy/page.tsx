import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — SINTHA',
  description: 'How SINTHA collects, uses, and protects your personal information.',
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8 bg-white min-h-screen">
        <Link href="/" className="text-blue-600 hover:underline text-sm mb-4 inline-block">
          ← Back to SINTHA
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: June 18, 2026</p>

        <div className="prose prose-sm max-w-none text-gray-700 space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">1. Introduction</h2>
            <p>
              SINTHA (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates the website
              <a href="https://sinthadeploy.vercel.app" className="text-blue-600 hover:underline"> https://sinthadeploy.vercel.app</a>
              (the &quot;Service&quot;), a service marketplace connecting clients with local service providers in Manipur, India. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.
            </p>
            <p>
              By using SINTHA, you agree to the collection and use of information in accordance with this policy. We are committed to protecting your privacy in compliance with the Information Technology Act, 2000, and the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">2. Information We Collect</h2>
            <p className="font-medium text-gray-900">2.1 Information you provide directly:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Account information:</strong> Name, email address, phone number, password (encrypted)</li>
              <li><strong>Profile information:</strong> Profile photo, location, role (client or provider)</li>
              <li><strong>Provider information:</strong> Service category, skills, experience, hourly rate, portfolio photos, verification documents (Aadhaar, selfie, address proof)</li>
              <li><strong>Booking information:</strong> Service requested, date, time, address, description of work</li>
              <li><strong>Communication:</strong> Messages exchanged between clients and providers through our chat feature</li>
              <li><strong>Reviews:</strong> Ratings and reviews you submit about service providers</li>
            </ul>

            <p className="font-medium text-gray-900 mt-4">2.2 Information collected automatically:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Device information:</strong> IP address, browser type, operating system, device identifiers</li>
              <li><strong>Usage information:</strong> Pages visited, time spent, features used, booking history</li>
              <li><strong>Location information:</strong> Approximate location (with your consent) to show nearby providers</li>
            </ul>

            <p className="font-medium text-gray-900 mt-4">2.3 Payment information:</p>
            <p>
              We do not store your credit/debit card details, UPI IDs, or net banking credentials. All payments are processed securely through Razorpay, our payment gateway partner. Razorpay is PCI-DSS compliant and handles all payment data in accordance with RBI guidelines.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>To create and manage your SINTHA account</li>
              <li>To facilitate bookings between clients and service providers</li>
              <li>To enable communication (chat, call, WhatsApp) between clients and providers after a booking is made</li>
              <li>To process payments for PRO subscriptions and services</li>
              <li>To send you booking confirmations, chat notifications, and password reset emails</li>
              <li>To verify provider identities and maintain platform trust</li>
              <li>To display provider profiles, ratings, and reviews to clients</li>
              <li>To prevent fraud, abuse, and unauthorized access to the Service</li>
              <li>To comply with legal obligations and law enforcement requests</li>
              <li>To improve our Service, develop new features, and personalize your experience</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">4. Information Sharing &amp; Disclosure</h2>
            <p>We do not sell, trade, or rent your personal information to third parties. We may share your information in the following situations:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Between users:</strong> After a booking is confirmed, clients and providers can see each other&apos;s name, photo, and phone number to coordinate the service</li>
              <li><strong>Service providers:</strong> We share information with our trusted third-party service providers who help operate SINTHA:
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li><strong>Firebase</strong> (Google LLC) — for user authentication</li>
                  <li><strong>Razorpay</strong> — for payment processing</li>
                  <li><strong>Cloudinary</strong> — for image storage (profile photos, portfolio)</li>
                  <li><strong>Neon Postgres</strong> — for database hosting</li>
                  <li><strong>Vercel</strong> — for website hosting</li>
                  <li><strong>Gmail SMTP</strong> — for sending transactional emails</li>
                </ul>
              </li>
              <li><strong>Legal compliance:</strong> If required by law, court order, or government authority, we may disclose your information</li>
              <li><strong>Business transfers:</strong> In the event of a merger, acquisition, or asset sale, your information may be transferred (with notice to you)</li>
              <li><strong>Consent:</strong> With your explicit consent, we may share information for specific purposes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">5. Data Security</h2>
            <p>
              We implement reasonable technical and organizational security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction. These measures include:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Encrypted password storage via Firebase Authentication</li>
              <li>HTTPS/TLS encryption for all data transmitted between your device and our servers</li>
              <li>Secure database hosting on Neon Postgres with encryption at rest</li>
              <li>Access controls limiting data access to authorized personnel only</li>
              <li>Regular security reviews and updates</li>
            </ul>
            <p>
              However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">6. Data Retention</h2>
            <p>
              We retain your personal information for as long as your account is active or as needed to provide you with the Service. We also retain information to comply with legal obligations, resolve disputes, and enforce our agreements. You may request deletion of your account at any time by contacting us at <a href="mailto:pukkei365@gmail.com" className="text-blue-600 hover:underline">pukkei365@gmail.com</a>.
            </p>
            <p>
              Booking records, chat messages, and payment records are retained for 7 years as required by Indian tax and accounting laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">7. Your Rights</h2>
            <p>You have the following rights regarding your personal information:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
              <li><strong>Withdraw consent:</strong> Withdraw consent for processing at any time</li>
              <li><strong>Data portability:</strong> Request your data in a structured, machine-readable format</li>
            </ul>
            <p>
              To exercise any of these rights, email us at <a href="mailto:pukkei365@gmail.com" className="text-blue-600 hover:underline">pukkei365@gmail.com</a>. We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">8. Cookies &amp; Tracking Technologies</h2>
            <p>
              SINTHA uses cookies and similar tracking technologies to enhance your browsing experience, analyze traffic, and remember your login session. You can control cookies through your browser settings. Disabling cookies may affect some features of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">9. Children&apos;s Privacy</h2>
            <p>
              SINTHA is not intended for children under 18 years of age. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately, and we will delete it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">10. Third-Party Links</h2>
            <p>
              Our Service may contain links to third-party websites (e.g., Razorpay, WhatsApp, Google Maps). We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">11. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date. You are advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">12. Contact Us</h2>
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or your personal information, please contact us:
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mt-2">
              <p><strong>SINTHA</strong></p>
              <p>Email: <a href="mailto:pukkei365@gmail.com" className="text-blue-600 hover:underline">pukkei365@gmail.com</a></p>
              <p>WhatsApp: <a href="https://wa.me/917005151875" className="text-blue-600 hover:underline">+91 70051 51875</a></p>
              <p>Location: Manipur, India</p>
            </div>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          <Link href="/terms" className="text-blue-600 hover:underline">Terms of Service</Link>
          {' • '}
          <Link href="/refund-policy" className="text-blue-600 hover:underline">Refund Policy</Link>
          {' • '}
          <Link href="/contact" className="text-blue-600 hover:underline">Contact Us</Link>
        </div>
      </div>
    </div>
  )
}
