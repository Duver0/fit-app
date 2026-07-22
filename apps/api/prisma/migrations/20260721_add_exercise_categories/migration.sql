-- CreateTable
CREATE TABLE "exercise_categories" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercise_categories_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "exercises" ADD COLUMN "category_id" UUID;

-- CreateIndex
CREATE INDEX "exercise_categories_group_id_idx" ON "exercise_categories"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "exercise_categories_group_id_name_key" ON "exercise_categories"("group_id", "name");

-- AddForeignKey
ALTER TABLE "exercise_categories" ADD CONSTRAINT "exercise_categories_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_categories" ADD CONSTRAINT "exercise_categories_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "exercise_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
