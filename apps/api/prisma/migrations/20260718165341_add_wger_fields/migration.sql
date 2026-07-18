-- Add wger enrichment fields to exercises table
ALTER TABLE "exercises" ADD COLUMN "wger_id" INTEGER;
ALTER TABLE "exercises" ADD COLUMN "wger_category" TEXT;
ALTER TABLE "exercises" ADD COLUMN "wger_muscles" TEXT;
ALTER TABLE "exercises" ADD COLUMN "wger_equipment" TEXT;
ALTER TABLE "exercises" ADD COLUMN "wger_instructions" TEXT;
