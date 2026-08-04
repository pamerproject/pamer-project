-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "censored" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: komentar lama yang kontennya sudah disensor (berisi tanda bintang
-- hasil penggantian kata) ditandai censored agar warning di UI juga muncul
-- untuk komentar yang dibuat sebelum kolom ini ada.
UPDATE "Comment"
SET "censored" = true
WHERE "content" LIKE '%*%*%*%'
  AND "deleted" = false;
