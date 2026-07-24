-- AlterTable: add routine_enabled to users
ALTER TABLE "users" ADD COLUMN "routine_enabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: routine_days
CREATE TABLE "routine_days" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routine_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable: routine_exercises
CREATE TABLE "routine_exercises" (
    "id" UUID NOT NULL,
    "day_id" UUID NOT NULL,
    "exercise_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routine_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE UNIQUE INDEX "routine_days_user_id_day_of_week_key" ON "routine_days"("user_id", "day_of_week");
CREATE INDEX "routine_days_user_id_idx" ON "routine_days"("user_id");
CREATE UNIQUE INDEX "routine_exercises_day_id_exercise_id_key" ON "routine_exercises"("day_id", "exercise_id");
CREATE INDEX "routine_exercises_day_id_sort_order_idx" ON "routine_exercises"("day_id", "sort_order");

-- AddForeignKeys
ALTER TABLE "routine_days" ADD CONSTRAINT "routine_days_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "routine_exercises" ADD CONSTRAINT "routine_exercises_day_id_fkey" FOREIGN KEY ("day_id") REFERENCES "routine_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "routine_exercises" ADD CONSTRAINT "routine_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
