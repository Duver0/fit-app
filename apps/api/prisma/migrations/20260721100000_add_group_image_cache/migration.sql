-- CreateTable
CREATE TABLE "group_image_cache" (
    "id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "search_term" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "thumbnail_url" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "attribution_url" TEXT NOT NULL,
    "image_id" TEXT NOT NULL,
    "width" INTEGER NOT NULL DEFAULT 0,
    "height" INTEGER NOT NULL DEFAULT 0,
    "downloaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_image_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "group_image_cache_category_idx" ON "group_image_cache"("category");

-- CreateIndex
CREATE INDEX "group_image_cache_category_search_term_idx" ON "group_image_cache"("category", "search_term");

-- CreateIndex
CREATE INDEX "group_image_cache_expires_at_idx" ON "group_image_cache"("expires_at");
