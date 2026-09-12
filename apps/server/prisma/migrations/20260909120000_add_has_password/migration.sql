-- Tracks whether a user has ever set a password on their Supabase Auth account
-- (as opposed to a Google-only account with no password credential yet).
ALTER TABLE "User" ADD COLUMN "hasPassword" BOOLEAN NOT NULL DEFAULT false;
