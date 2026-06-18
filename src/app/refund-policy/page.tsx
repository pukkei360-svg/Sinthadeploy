import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy — SINTHA',
  description: 'SINTHA booking cancellation and refund policy for PRO subscriptions.',
}

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8 bg-white min-h-screen">
        <Link href="/" className="text-blue-600 hover:underline text-sm mb-4 inline-block">
          ← Back to SINTHA
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Refund &amp; Cancellation Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: June 18, 2026</p>

        <div className="prose prose-sm max-w-none text-gray-700 space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">1. Overview</h2>
            <p>
              This Refund &amp; Cancellation Policy explains the terms under which SINTHA offers cancellations and refunds. SINTHA is a marketplace platform — we facilitate bookings between clients and providers, and we sell PRO subscriptions to providers. The refund terms differ for each.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">2. Service Bookings (Client ↔ Provider)</h2>
            <p className="font-medium text-gray-900">2.1 Cancellation by Client:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Clients can cancel a booking at any time before the service is rendered</li>
              <li>Cancellations should be made as early as possible to respect the provider&apos;s time</li>
              <li>To cancel: open the SINTHA app → My Bookings → select the booking → tap &quot;Cancel&quot;</li>
              <li>Clients should also inform the provider directly via call or WhatsApp</li>
            </ul>

            <p className="font-medium text-gray-900 mt-4">2.2 Cancellation by Provider:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Providers can cancel a booking if they cannot fulfill it (emergency, scheduling conflict, etc.)</li>
              <li>Providers should notify the client as early as possible via call or WhatsApp</li>
              <li>Repeated cancellations may result in account suspension</li>
            </ul>

            <p className="font-medium text-gray-900 mt-4">2.3 Service Payment Refunds:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Service payments are made <strong>directly between client and provider</strong> (cash, UPI, etc.)</li>
              <li>SINTHA does not process, hold, or refund service payments</li>
              <li>If a client has paid a provider directly and the service is cancelled, the client must request a refund <strong>directly from the provider</strong></li>
              <li>SINTHA is not responsible for service payment disputes between clients and providers</li>
              <li>We recommend clients and providers agree on payment terms before the service begins</li>
            </ul>

            <p className="font-medium text-gray-900 mt-4">2.4 Disputed Services:</p>
            <p>
              If a client is dissatisfied with a service:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>First, try to resolve the issue directly with the provider</li>
              <li>If unresolved, contact SINTHA support at <a href="mailto:pukkei365@gmail.com" className="text-blue-600 hover:underline">pukkei365@gmail.com</a></li>
              <li>We can mediate but cannot force a refund (we don&apos;t hold the funds)</li>
              <li>Providers with repeated complaints may be suspended from the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">3. PRO Subscription (Paid to SINTHA)</h2>
            <p className="font-medium text-gray-900">3.1 Subscription Details:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>PRO subscription costs <strong>₹199 per month</strong></li>
              <li>Payment is processed securely via Razorpay (UPI, cards, net banking)</li>
              <li>Subscription is optional — providers can use SINTHA free forever</li>
              <li>PRO features: featured placement, verified badge, priority support</li>
            </ul>

            <p className="font-medium text-gray-900 mt-4">3.2 Refund Eligibility for PRO:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Within 24 hours of payment:</strong> Full refund if you cancel within 24 hours of subscribing and have not used PRO features (e.g., not received any bookings while PRO was active)</li>
              <li><strong>After 24 hours:</strong> No refund for the current month — subscription remains active until the end of the billing period</li>
              <li><strong>Auto-renewal:</strong> PRO does not auto-renew. Providers must manually renew each month</li>
            </ul>

            <p className="font-medium text-gray-900 mt-4">3.3 How to Request a PRO Refund:</p>
            <ol className="list-decimal pl-6 mt-2 space-y-1">
              <li>Email <a href="mailto:pukkei365@gmail.com" className="text-blue-600 hover:underline">pukkei365@gmail.com</a> with subject &quot;PRO Refund Request&quot;</li>
              <li>Include your registered email and Razorpay payment ID</li>
              <li>We will review and process the refund within <strong>5-7 business days</strong></li>
              <li>Refund will be credited back to the original payment method (UPI/bank account/card)</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">4. Refund Timeline</h2>
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-3 border-b border-gray-200">Refund Type</th>
                  <th className="text-left p-3 border-b border-gray-200">Processing Time</th>
                  <th className="text-left p-3 border-b border-gray-200">Credit to Account</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3 border-b border-gray-100">PRO subscription (within 24h)</td>
                  <td className="p-3 border-b border-gray-100">5-7 business days</td>
                  <td className="p-3 border-b border-gray-100">Original payment method</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-100">PRO subscription (after 24h)</td>
                  <td className="p-3 border-b border-gray-100">Not eligible</td>
                  <td className="p-3 border-b border-gray-100">N/A</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-100">Service payment (client-provider)</td>
                  <td className="p-3 border-b border-gray-100">Between client and provider</td>
                  <td className="p-3 border-b border-gray-100">As agreed between parties</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-2 text-xs text-gray-500">
              Note: Refund processing time depends on your bank. Some banks may take up to 10 business days to show the refund in your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">5. Cancellation of Account</h2>
            <p>
              You may cancel your SINTHA account at any time by emailing <a href="mailto:pukkei365@gmail.com" className="text-blue-600 hover:underline">pukkei365@gmail.com</a>. Account cancellation will:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Remove your profile from search results</li>
              <li>Prevent new bookings</li>
              <li>Cancel any active PRO subscription (no refund for the current month)</li>
              <li>Retain booking records for 7 years (legal compliance)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">6. SINTHA-Initiated Cancellations</h2>
            <p>
              SINTHA reserves the right to cancel bookings or suspend accounts in case of:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Fraudulent activity</li>
              <li>Violation of our <Link href="/terms" className="text-blue-600 hover:underline">Terms of Service</Link></li>
              <li>Multiple complaints against a user</li>
              <li>Illegal or unsafe service requests</li>
              <li>Technical issues affecting the platform</li>
            </ul>
            <p className="mt-2">
              In such cases, PRO subscriptions may be refunded on a pro-rata basis at SINTHA&apos;s discretion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">7. Force Majeure</h2>
            <p>
              SINTHA is not liable for failures or delays caused by circumstances beyond our control, including natural disasters, strikes, internet outages, government actions, or other force majeure events. No refunds will be issued for service interruptions caused by force majeure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">8. Contact for Refunds</h2>
            <p>For any refund-related queries, please contact us:</p>
            <div className="bg-gray-50 rounded-lg p-4 mt-2">
              <p><strong>SINTHA Refund Support</strong></p>
              <p>Email: <a href="mailto:pukkei365@gmail.com" className="text-blue-600 hover:underline">pukkei365@gmail.com</a></p>
              <p>WhatsApp: <a href="https://wa.me/917005151875" className="text-blue-600 hover:underline">+91 70051 51875</a></p>
              <p>Response time: Within 24 hours (business days)</p>
              <p>Refund processing: 5-7 business days</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">9. Changes to This Policy</h2>
            <p>
              We may update this Refund &amp; Cancellation Policy from time to time. Changes will be posted on this page with an updated &quot;Last updated&quot; date. Continued use of SINTHA after changes constitutes acceptance of the new policy.
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
          {' • '}
          <Link href="/terms" className="text-blue-600 hover:underline">Terms of Service</Link>
          {' • '}
          <Link href="/contact" className="text-blue-600 hover:underline">Contact Us</Link>
        </div>
      </div>
    </div>
  )
}
