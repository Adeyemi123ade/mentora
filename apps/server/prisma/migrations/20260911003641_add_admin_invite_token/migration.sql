-- AlterTable
ALTER TABLE "AdminInvite" ADD COLUMN IF NOT EXISTS "token" TEXT;
ALTER TABLE "AdminInvite" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AdminInvite_token_key" ON "AdminInvite"("token");
