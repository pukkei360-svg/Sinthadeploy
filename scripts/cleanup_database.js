/**
 * Database cleanup script — deletes ALL data except:
 * - Admin user (sintha37@sintha.app)
 * - Service categories (6 categories)
 *
 * Deletes:
 * - All non-admin users (clients + providers)
 * - All bookings
 * - All chat conversations + messages
 * - All reviews
 * - All notifications
 * - All verification documents
 * - All subscriptions
 * - All password reset tokens
 * - All provider profiles
 *
 * Run: node scripts/cleanup_database.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 SINTHA Database Cleanup')
  console.log('='.repeat(50))
  console.log('')

  // Show current state before cleanup
  const beforeCounts = {
    users: await prisma.user.count(),
    providers: await prisma.providerProfile.count(),
    bookings: await prisma.booking.count(),
    conversations: await prisma.chatConversation.count(),
    messages: await prisma.chatMessage.count(),
    reviews: await prisma.review.count(),
    notifications: await prisma.notification.count(),
    verifications: await prisma.verificationDoc.count(),
    subscriptions: await prisma.subscription.count(),
    passwordTokens: await prisma.passwordResetToken.count(),
    categories: await prisma.serviceCategory.count(),
  }

  console.log('📊 BEFORE cleanup:')
  for (const [key, value] of Object.entries(beforeCounts)) {
    console.log(`   ${key}: ${value}`)
  }
  console.log('')

  // Delete in dependency order (children first, parents last)
  console.log('🗑️  Deleting data...')

  // 1. Password reset tokens
  const deletedTokens = await prisma.passwordResetToken.deleteMany({})
  console.log(`   ✓ Password reset tokens: ${deletedTokens.count} deleted`)

  // 2. Subscriptions
  const deletedSubs = await prisma.subscription.deleteMany({})
  console.log(`   ✓ Subscriptions: ${deletedSubs.count} deleted`)

  // 3. Verification documents
  const deletedVerifications = await prisma.verificationDoc.deleteMany({})
  console.log(`   ✓ Verification docs: ${deletedVerifications.count} deleted`)

  // 4. Notifications
  const deletedNotifs = await prisma.notification.deleteMany({})
  console.log(`   ✓ Notifications: ${deletedNotifs.count} deleted`)

  // 5. Reviews
  const deletedReviews = await prisma.review.deleteMany({})
  console.log(`   ✓ Reviews: ${deletedReviews.count} deleted`)

  // 6. Chat messages
  const deletedMessages = await prisma.chatMessage.deleteMany({})
  console.log(`   ✓ Chat messages: ${deletedMessages.count} deleted`)

  // 7. Chat conversations
  const deletedConvs = await prisma.chatConversation.deleteMany({})
  console.log(`   ✓ Chat conversations: ${deletedConvs.count} deleted`)

  // 8. Bookings
  const deletedBookings = await prisma.booking.deleteMany({})
  console.log(`   ✓ Bookings: ${deletedBookings.count} deleted`)

  // 9. Provider profiles
  const deletedProviders = await prisma.providerProfile.deleteMany({})
  console.log(`   ✓ Provider profiles: ${deletedProviders.count} deleted`)

  // 10. Delete ALL non-admin users
  // Admin email: sintha37@sintha.app (keep this!)
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      email: {
        not: 'sintha37@sintha.app',
      },
    },
  })
  console.log(`   ✓ Non-admin users: ${deletedUsers.count} deleted`)

  // Show final state
  const afterCounts = {
    users: await prisma.user.count(),
    providers: await prisma.providerProfile.count(),
    bookings: await prisma.booking.count(),
    conversations: await prisma.chatConversation.count(),
    messages: await prisma.chatMessage.count(),
    reviews: await prisma.review.count(),
    notifications: await prisma.notification.count(),
    verifications: await prisma.verificationDoc.count(),
    subscriptions: await prisma.subscription.count(),
    passwordTokens: await prisma.passwordResetToken.count(),
    categories: await prisma.serviceCategory.count(),
  }

  console.log('')
  console.log('📊 AFTER cleanup:')
  for (const [key, value] of Object.entries(afterCounts)) {
    console.log(`   ${key}: ${value}`)
  }
  console.log('')

  // Show remaining users (should only be admin)
  const remainingUsers = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true },
  })
  console.log('👤 Remaining users:')
  for (const u of remainingUsers) {
    console.log(`   - ${u.email} (${u.name}) — role: ${u.role}`)
  }
  console.log('')
  console.log('✅ Cleanup complete! Categories preserved, all user data deleted.')
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('❌ Cleanup failed:', e)
    prisma.$disconnect()
    process.exit(1)
  })
