-- AlterTable: add single_group_auto_enter to users
ALTER TABLE "users" ADD COLUMN "single_group_auto_enter" BOOLEAN NOT NULL DEFAULT false;
