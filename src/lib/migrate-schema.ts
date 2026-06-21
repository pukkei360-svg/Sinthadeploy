import { db } from '@/lib/db';

/**
 * Runtime schema migration for the ban/claims feature.
 *
 * WHY THIS EXISTS:
 *   The Prisma schema was extended with new columns (isBanned, banReason,
 *   bannedAt on User) and new tables (BannedEmail, Claim) for the ban/
 *   claims feature. But `prisma db push` doesn't run reliably on Vercel's
 *   build environment (DATABASE_URL is often only available at runtime,
 *   not build time).
 *
 *   Without these columns/tables, every query that references them throws
 *   "column does not exist" — breaking login, registration, admin users
 *   list, etc.
 *
 * WHAT THIS DOES:
 *   Runs idempotent `ALTER TABLE` / `CREATE TABLE IF NOT EXISTS` statements
 *   directly via `prisma.$executeRaw`. Safe to run multiple times — if the
 *   column/table already exists, the SQL is a no-op.
 *
 * WHEN IT RUNS:
 *   Called from a top-level await in the app's first server module load.
 *   Wrapped in try/catch so the app still boots even if migration fails
 *   (in which case the ban/claims feature gracefully degrades).
 */

let migrationPromise: Promise<void> | null = null;
let migrationDone = false;

export function ensureSchemaMigrated(): Promise<void> {
  if (migrationDone) return Promise.resolve();
  if (!migrationPromise) {
    migrationPromise = runMigration().then(() => {
      migrationDone = true;
    }).catch((err) => {
      // Don't cache the failure — let the next call retry
      migrationPromise = null;
      console.error('[schema-migration] Failed:', err);
    });
  }
  return migrationPromise;
}

async function runMigration(): Promise<void> {
  // Use $executeRawUnsafe for raw DDL. Each statement is wrapped in a
  // conditional / IF NOT EXISTS so re-running is safe.

  // 1. Add isBanned column to User (PostgreSQL syntax)
  //    BOOLEAN NOT NULL DEFAULT false — same as Prisma would create.
  await safeExec(
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isBanned" BOOLEAN NOT NULL DEFAULT false`
  );

  // 2. Add banReason column (nullable string)
  await safeExec(
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "banReason" TEXT`
  );

  // 3. Add bannedAt column (nullable timestamp)
  await safeExec(
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bannedAt" TIMESTAMP(3)`
  );

  // 4. Create BannedEmail table if it doesn't exist
  await safeExec(`
    CREATE TABLE IF NOT EXISTS "BannedEmail" (
      "id" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "reason" TEXT,
      "bannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "bannedBy" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "BannedEmail_pkey" PRIMARY KEY ("id")
    )
  `);

  // 4a. Unique index on BannedEmail.email (IF NOT EXISTS)
  await safeExec(
    `CREATE UNIQUE INDEX IF NOT EXISTS "BannedEmail_email_key" ON "BannedEmail"("email")`
  );

  // 5. Create Claim table if it doesn't exist
  await safeExec(`
    CREATE TABLE IF NOT EXISTS "Claim" (
      "id" TEXT NOT NULL,
      "reporterId" TEXT NOT NULL,
      "subjectId" TEXT NOT NULL,
      "bookingId" TEXT,
      "type" TEXT NOT NULL,
      "severity" TEXT NOT NULL DEFAULT 'medium',
      "title" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'open',
      "resolution" TEXT,
      "handledBy" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
    )
  `);

  // 5a. Foreign keys for Claim (reporterId → User.id, subjectId → User.id)
  //     Use DO blocks so we can check if the constraint already exists.
  await safeExec(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'Claim_reporterId_fkey'
      ) THEN
        ALTER TABLE "Claim"
        ADD CONSTRAINT "Claim_reporterId_fkey"
        FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  await safeExec(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'Claim_subjectId_fkey'
      ) THEN
        ALTER TABLE "Claim"
        ADD CONSTRAINT "Claim_subjectId_fkey"
        FOREIGN KEY ("subjectId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  // 5b. Indexes for Claim (IF NOT EXISTS)
  await safeExec(
    `CREATE INDEX IF NOT EXISTS "Claim_subjectId_idx" ON "Claim"("subjectId")`
  );
  await safeExec(
    `CREATE INDEX IF NOT EXISTS "Claim_reporterId_idx" ON "Claim"("reporterId")`
  );
  await safeExec(
    `CREATE INDEX IF NOT EXISTS "Claim_status_idx" ON "Claim"("status")`
  );

  // ── Phase 1 identity verification columns on VerificationDoc ──
  // These store the Aadhaar photo, passport photo, entered name, and
  // face-detection result. All nullable so existing rows are unaffected.
  await safeExec(
    `ALTER TABLE "VerificationDoc" ADD COLUMN IF NOT EXISTS "fullNameAsPerAadhaar" TEXT`
  );
  await safeExec(
    `ALTER TABLE "VerificationDoc" ADD COLUMN IF NOT EXISTS "aadhaarPhotoUrl" TEXT`
  );
  await safeExec(
    `ALTER TABLE "VerificationDoc" ADD COLUMN IF NOT EXISTS "aadhaarBackPhotoUrl" TEXT`
  );
  await safeExec(
    `ALTER TABLE "VerificationDoc" ADD COLUMN IF NOT EXISTS "passportPhotoUrl" TEXT`
  );
  await safeExec(
    `ALTER TABLE "VerificationDoc" ADD COLUMN IF NOT EXISTS "faceDetected" BOOLEAN`
  );

  // ── Job Marketplace tables ─────────────────────────────────────
  // Job: posted by clients, visible to providers in matching category
  await safeExec(`
    CREATE TABLE IF NOT EXISTS "Job" (
      "id" TEXT NOT NULL,
      "clientId" TEXT NOT NULL,
      "categoryId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "location" TEXT,
      "budget" DOUBLE PRECISION,
      "preferredDate" TIMESTAMP(3),
      "urgency" TEXT NOT NULL DEFAULT 'flexible',
      "status" TEXT NOT NULL DEFAULT 'open',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
    )
  `);
  await safeExec(
    `CREATE INDEX IF NOT EXISTS "Job_clientId_idx" ON "Job"("clientId")`
  );
  await safeExec(
    `CREATE INDEX IF NOT EXISTS "Job_categoryId_idx" ON "Job"("categoryId")`
  );
  await safeExec(
    `CREATE INDEX IF NOT EXISTS "Job_status_idx" ON "Job"("status")`
  );
  await safeExec(
    `CREATE INDEX IF NOT EXISTS "Job_createdAt_idx" ON "Job"("createdAt")`
  );
  // Job.photoUrls — optional JSON array of Cloudinary URLs (max 2 photos)
  await safeExec(
    `ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "photoUrls" TEXT`
  );
  // FK: Job.clientId → User.id
  await safeExec(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'Job_clientId_fkey'
      ) THEN
        ALTER TABLE "Job"
        ADD CONSTRAINT "Job_clientId_fkey"
        FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;
  `);
  // FK: Job.categoryId → ServiceCategory.id
  await safeExec(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'Job_categoryId_fkey'
      ) THEN
        ALTER TABLE "Job"
        ADD CONSTRAINT "Job_categoryId_fkey"
        FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  // JobQuote: a provider's offer on a job
  await safeExec(`
    CREATE TABLE IF NOT EXISTS "JobQuote" (
      "id" TEXT NOT NULL,
      "jobId" TEXT NOT NULL,
      "providerId" TEXT NOT NULL,
      "price" DOUBLE PRECISION NOT NULL,
      "message" TEXT NOT NULL,
      "estimatedTime" TEXT,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "JobQuote_pkey" PRIMARY KEY ("id")
    )
  `);
  await safeExec(
    `CREATE INDEX IF NOT EXISTS "JobQuote_jobId_idx" ON "JobQuote"("jobId")`
  );
  await safeExec(
    `CREATE INDEX IF NOT EXISTS "JobQuote_providerId_idx" ON "JobQuote"("providerId")`
  );
  await safeExec(
    `CREATE INDEX IF NOT EXISTS "JobQuote_status_idx" ON "JobQuote"("status")`
  );
  // FK: JobQuote.jobId → Job.id
  await safeExec(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'JobQuote_jobId_fkey'
      ) THEN
        ALTER TABLE "JobQuote"
        ADD CONSTRAINT "JobQuote_jobId_fkey"
        FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;
  `);
  // FK: JobQuote.providerId → User.id
  await safeExec(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'JobQuote_providerId_fkey'
      ) THEN
        ALTER TABLE "JobQuote"
        ADD CONSTRAINT "JobQuote_providerId_fkey"
        FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  console.log('[schema-migration] Ban/claims + verification + jobs schema is ready');
}

/**
 * Execute a raw SQL statement, swallowing errors that indicate the
 * column/table/constraint already exists. Other errors are logged
 * but don't abort the migration (so a single bad statement doesn't
 * block the rest).
 */
async function safeExec(sql: string): Promise<void> {
  try {
    await db.$executeRawUnsafe(sql);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // "already exists" errors are expected and safe to ignore
    if (
      msg.includes('already exists') ||
      msg.includes('duplicate column') ||
      msg.includes('relation already exists')
    ) {
      return;
    }
    // Log but don't throw — other statements may still succeed
    console.warn('[schema-migration] SQL warning:', msg, '| SQL:', sql.slice(0, 100));
  }
}
