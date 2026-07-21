-- AlterEnum
ALTER TYPE "exercise_unit" ADD VALUE 'REPS_AND_WEIGHT';

-- AlterTable: add reps and weight columns to performance_records
ALTER TABLE "performance_records" ADD COLUMN "reps" INTEGER,
ADD COLUMN "weight" DOUBLE PRECISION;
