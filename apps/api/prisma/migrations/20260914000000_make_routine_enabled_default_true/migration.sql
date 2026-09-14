-- AlterTable: make routine_enabled default TRUE (legacy, always visible)
-- Backfill: rutina fija para todos los usuarios existentes
UPDATE "users" SET "routine_enabled" = TRUE WHERE "routine_enabled" = FALSE;

-- Alter default for future inserts
ALTER TABLE "users" ALTER COLUMN "routine_enabled" SET DEFAULT TRUE;
