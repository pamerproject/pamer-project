-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "durationUnit" TEXT,
ADD COLUMN     "durationValue" INTEGER,
ADD COLUMN     "endsAt" TIMESTAMP(3);
