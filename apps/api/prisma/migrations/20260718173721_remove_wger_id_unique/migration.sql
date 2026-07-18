-- Remove unique constraint from wger_id so multiple exercises can reference the same wger exercise
ALTER TABLE "exercises" DROP CONSTRAINT IF EXISTS "exercises_wger_id_key";
