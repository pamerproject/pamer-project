-- AlterTable
ALTER TABLE "User" ADD COLUMN "emailVerified" TIMESTAMP(3),
ADD COLUMN "verifyToken" TEXT,
ADD COLUMN "verifyTokenExpires" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_verifyToken_key" ON "User"("verifyToken");
