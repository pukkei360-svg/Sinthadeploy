import { db } from '@/lib/db';

/**
 * Cascade-delete a user and ALL their related records.
 *
 * This is the single source of truth for user deletion. Used by:
 *   - DELETE /api/admin/users/[id]  (single user)
 *   - PATCH /api/admin/users/[id]  (action='reject')
 *   - DELETE /api/admin/users       (bulk delete all non-admin users)
 *
 * Order matters: child records must be deleted before parent records.
 * Favorites + SavedAddresses don't have onDelete: Cascade in the schema,
 * so they MUST be cleaned up manually or the FK constraint blocks deletion.
 *
 * After this function runs, the user is GONE from:
 *   - Database (user table)
 *   - Admin panel (users list)
 *   - Service portal (provider list — providerProfile is deleted)
 *   - Chat system (conversations + messages deleted)
 *   - Bookings (all their bookings deleted)
 *   - Reviews (all their reviews deleted)
 *   - Notifications (all their notifications deleted)
 *   - Jobs marketplace (their jobs + quotes deleted)
 *   - Referral earnings (their referrals deleted)
 *
 * The user can sign up again with the same email — they'll get a fresh
 * account with no history.
 */
export async function cascadeDeleteUser(userId: string): Promise<void> {
  // 1. Password reset tokens
  await db.passwordResetToken.deleteMany({ where: { userId } });

  // 2. Subscriptions (PRO payment history)
  await db.subscription.deleteMany({ where: { userId } });

  // 3. Verification documents (Aadhaar + photo)
  await db.verificationDoc.deleteMany({ where: { userId } });

  // 4. Notifications
  await db.notification.deleteMany({ where: { userId } });

  // 5. Reviews — both as author and as target
  await db.review.deleteMany({ where: { authorId: userId } });
  await db.review.deleteMany({ where: { targetId: userId } });

  // 6. Chat messages + conversations
  await db.chatMessage.deleteMany({ where: { senderId: userId } });
  await db.chatConversation.deleteMany({
    where: { OR: [{ participantA: userId }, { participantB: userId }] },
  });

  // 7. Bookings — both as client and as provider
  await db.booking.deleteMany({
    where: { OR: [{ clientId: userId }, { providerId: userId }] },
  });

  // 8. Claims/reports — both as reporter and as subject
  await db.claim.deleteMany({
    where: { OR: [{ reporterId: userId }, { subjectId: userId }] },
  });

  // 9. Favorites — both as client (saved providers) and as provider (saved by others)
  //    NO onDelete: Cascade in schema — must clean manually.
  await db.favorite.deleteMany({
    where: { OR: [{ clientId: userId }, { providerId: userId }] },
  });

  // 10. Saved addresses
  //     NO onDelete: Cascade in schema — must clean manually.
  await db.savedAddress.deleteMany({ where: { clientId: userId } });

  // 11. Job quotes (provider's quotes on client jobs)
  //     Has onDelete: Cascade in schema, but clean explicitly for safety.
  try { await db.jobQuote.deleteMany({ where: { providerId: userId } }); } catch {}

  // 12. Jobs (client's posted jobs)
  //     Has onDelete: Cascade in schema, but clean explicitly for safety.
  try { await db.job.deleteMany({ where: { clientId: userId } }); } catch {}

  // 13. Referral earnings — both as referrer and as referred user
  //      Has onDelete: Cascade in schema, but clean explicitly for safety.
  try {
    await db.referralEarning.deleteMany({
      where: { OR: [{ referrerId: userId }, { referredUserId: userId }] },
    });
  } catch {}

  // 14. Provider profile — THIS is what makes the user appear in the
  //     service portal (provider list). Deleting it removes them from
  //     search results and the home screen.
  await db.providerProfile.deleteMany({ where: { userId } });

  // 15. FINALLY — delete the user record itself
  await db.user.delete({ where: { id: userId } });
}
