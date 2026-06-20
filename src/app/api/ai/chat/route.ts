import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * SINTHA AI Chat API — Smart Keyword Bot
 * 
 * No external API needed — works on Vercel from any location.
 * Fetches real providers from database and gives contextual responses.
 */

function getSmartResponse(message: string, providers: any[], categories: any[]): string {
  const lower = message.toLowerCase().trim()

  // Helper: find matching providers
  const findProviders = (keywords: string[], categoryKeywords: string[] = []) => {
    return providers.filter(p => {
      const skills = (p.skills || '').toLowerCase()
      const categoryName = (p.category?.name || '').toLowerCase()
      const desc = (p.description || '').toLowerCase()
      const hasSkill = keywords.some(k => skills.includes(k) || desc.includes(k))
      const hasCategory = categoryKeywords.some(k => categoryName.includes(k))
      return hasSkill || hasCategory
    })
  }

  // Format provider names
  const formatProviders = (list: any[]) => {
    if (list.length === 0) return ''
    return list.slice(0, 3).map(p => {
      const rating = p.rating > 0 ? ` (⭐ ${p.rating.toFixed(1)})` : ''
      const verified = p.user?.isVerified ? ' ✅' : ''
      return `**${p.user?.name || 'Provider'}**${rating}${verified}`
    }).join(', ')
  }

  // Electrical
  if (lower.match(/electric|wire|spark|light|fan|switch|socket/)) {
    const matches = findProviders(['electr', 'wire', 'light', 'fan'], ['home'])
    if (matches.length > 0) return `I found ${matches.length} provider(s) who can help with electrical work: ${formatProviders(matches)}. Tap on any provider from the Home screen to book them!`
    return `Check the **Home Services** category on the Home screen for electricians in your area. New providers are joining every day!`
  }

  // Plumbing
  if (lower.match(/plumb|pipe|tap|water|leak|drain|tank|faucet|toilet/)) {
    const matches = findProviders(['plumb', 'pipe', 'water', 'tap'], ['home'])
    if (matches.length > 0) return `Great! I found ${matches.length} plumbing expert(s): ${formatProviders(matches)}. They can help with leaks, pipe fitting, and more. Book from the Home screen!`
    return `Check the **Home Services** category for plumbers. You can also post your requirement and providers will respond!`
  }

  // Education/Tutoring
  if (lower.match(/tutor|teach|tuition|coach|study|learn|class|course|education|exam|math|science|english/)) {
    const matches = findProviders(['tutor', 'teach', 'coach', 'education', 'math', 'science'], ['education'])
    if (matches.length > 0) return `We have ${matches.length} education provider(s): ${formatProviders(matches)}. They offer tutoring and coaching. Book from the Home screen!`
    return `Check the **Education** category for verified tutors and coaches in Manipur!`
  }

  // Photography/Events
  if (lower.match(/photo|camera|wedding|event|decorat|party|function|birthday/)) {
    const matches = findProviders(['photo', 'camera', 'event', 'decorat', 'wedding'], ['event'])
    if (matches.length > 0) return `Found ${matches.length} event professional(s): ${formatProviders(matches)}. Perfect for weddings, parties, and functions. Book from the Home screen!`
    return `Browse the **Events** category for photographers, decorators, and event planners!`
  }

  // Beauty
  if (lower.match(/makeup|beauty|bridal|mehendi|hair|salon|facial|nail/)) {
    const matches = findProviders(['makeup', 'beauty', 'bridal', 'hair', 'salon'], ['beauty'])
    if (matches.length > 0) return `We have ${matches.length} beauty professional(s): ${formatProviders(matches)}. They offer bridal makeup, party looks, and more. Book from the Home screen!`
    return `Check the **Beauty** category for makeup artists and salon services!`
  }

  // Repair
  if (lower.match(/repair|mobile|phone|computer|laptop|fix|broken|screen|battery/)) {
    const matches = findProviders(['repair', 'mobile', 'computer', 'laptop', 'phone'], ['repair'])
    if (matches.length > 0) return `Found ${matches.length} repair specialist(s): ${formatProviders(matches)}. They fix phones, computers, and electronics. Book from the Home screen!`
    return `Check the **Repairs** category for mobile and computer repair professionals!`
  }

  // Transport
  if (lower.match(/driver|drive|car|bike|transport|taxi|cab|vehicle/)) {
    const matches = findProviders(['driver', 'drive', 'transport', 'car', 'bike'], ['transport'])
    if (matches.length > 0) return `We have ${matches.length} transport provider(s): ${formatProviders(matches)}. Book from the Home screen!`
    return `Check the **Transport** category for drivers and vehicle services!`
  }

  // Cleaning
  if (lower.match(/clean|wash|dust|mop|sweep|maid/)) {
    const matches = findProviders(['clean', 'wash', 'maid'], ['home'])
    if (matches.length > 0) return `Found ${matches.length} cleaning service provider(s): ${formatProviders(matches)}. Book from the Home screen!`
    return `Check the **Home Services** category for cleaning professionals!`
  }

  // Carpentry
  if (lower.match(/carpenter|wood|furniture|door|table|chair|cupboard/)) {
    const matches = findProviders(['carpenter', 'wood', 'furniture'], ['home'])
    if (matches.length > 0) return `Found ${matches.length} carpentry expert(s): ${formatProviders(matches)}. Book from the Home screen!`
    return `Check the **Home Services** category for carpenters and furniture makers!`
  }

  // Booking help
  if (lower.match(/book|hire|how.*do|how.*book|how.*hire/)) {
    return `To book a service on SINTHA:\n\n1. **Browse** categories on the Home screen\n2. **Select** a provider\n3. **Tap "Book Now"** on their profile\n4. **Fill in** date, time, and address\n5. **Submit** — booking is auto-confirmed!\n\nAfter booking, you can chat and call the provider directly. 💬📞`
  }

  // SINTHA info
  if (lower.match(/sintha|about|what.*this|what.*app/)) {
    return `**SINTHA** is Manipur's trusted service marketplace! 🌟\n\n✅ Zero commission for providers\n✅ AI-powered matching\n✅ Verified service professionals\n✅ Available in Meitei Mayek\n\nWe connect you with trusted local providers for Home Services, Education, Transport, Events, Beauty, and Repairs.`
  }

  // PRO info
  if (lower.match(/pro|premium|subscription|upgrade|plan/)) {
    return `**SINTHA PRO** is our premium plan for providers at just ₹199/month!\n\nBenefits:\n⭐ Higher search ranking\n👑 Featured Provider Badge\n📍 Homepage visibility\n🎧 Priority Support\n\nVisit the SINTHA PRO page from your Profile to subscribe!`
  }

  // Verification
  if (lower.match(/verif|aadhaar|identity|document|kyc/)) {
    return `Provider verification on SINTHA:\n\n1. **Aadhaar Card** upload\n2. **Selfie Photo** for identity matching\n3. **Address Proof** submission\n\nOur team reviews within 24-48 hours. Verified providers get a ✅ badge and more visibility!`
  }

  // Commission
  if (lower.match(/commission|fee|charge|cost|free|price/)) {
    return `Great news! SINTHA charges **ZERO commission** from providers! 💰\n\nUnlike other platforms that take 15-30%, providers keep 100% of their earnings. We only charge for optional PRO features (₹199/month).`
  }

  // Payment
  if (lower.match(/pay|payment|money|upi|cash|razorpay/)) {
    return `**Payments on SINTHA:**\n\n💬 Service payments are made **directly** between client and provider (cash, UPI, etc.)\n💳 SINTHA doesn't process service payments\n👑 PRO subscription (₹199/month) is paid via Razorpay (UPI, Card, Net Banking)`
  }

  // Chat
  if (lower.match(/chat|message|talk|communicate/)) {
    return `Chat on SINTHA is **unlocked after booking** for security. 🔒\n\nOnce you book a provider, you can chat with them directly in the app. You can also call or WhatsApp them from the booking details page.`
  }

  // Greetings
  if (lower.match(/hello|hi|hey|namaste|oi|hola/)) {
    return `Hello! 👋 Welcome to SINTHA AI! I can help you:\n\n🔍 Find service providers\n📋 Guide you through booking\n💡 Answer questions about SINTHA\n\nWhat can I help you with?`
  }

  // Thanks
  if (lower.match(/thank|thanks|thx|cheers/)) {
    return `You're welcome! 😊 If you need anything else, I'm always here. Happy to help with any SINTHA services!`
  }

  // Available services
  if (lower.match(/service|available|offer|what.*do you|categories/)) {
    const catNames = categories.map(c => c.name).join(', ')
    return `SINTHA offers these service categories:\n\n📋 ${catNames}\n\nBrowse them all from the Home screen. New providers are joining every day!`
  }

  // Provider count
  if (lower.match(/how many|provider|count|number/)) {
    return `SINTHA currently has ${providers.length} verified provider(s) across ${categories.length} categories. New providers are joining every day!\n\nBrowse them all from the Home screen.`
  }

  // Help
  if (lower.match(/help|support|contact|problem|issue/)) {
    return `Need help? Here are your options:\n\n💬 Chat with me anytime\n📱 WhatsApp our support: +91 70051 51875\n📧 Email: pukkei365@gmail.com\n\nOr browse our FAQ on the Home screen!`
  }

  // Default
  return `I can help you find services, book providers, or answer questions about SINTHA. Try asking:\n\n• "Find me an electrician"\n• "How do I book a service?"\n• "What is SINTHA PRO?"\n• "Is SINTHA free?"\n\nWhat would you like to know?`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversationHistory = [] } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Fetch real providers and categories from database
    const [providers, categories] = await Promise.all([
      db.providerProfile.findMany({
        take: 20,
        include: {
          user: { select: { id: true, name: true, photoUrl: true, isVerified: true, isPro: true } },
          category: true,
        },
        orderBy: { rating: 'desc' },
      }),
      db.serviceCategory.findMany({
        where: { isActive: true },
        include: { _count: { select: { providers: true } } },
        orderBy: { order: 'asc' },
      }),
    ]);

    const response = getSmartResponse(message, providers, categories);

    // Small delay to simulate thinking
    await new Promise(resolve => setTimeout(resolve, 300));

    return NextResponse.json({
      response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[AI Chat] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get response' },
      { status: 500 }
    );
  }
}
