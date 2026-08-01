-- AlterEnum
BEGIN;
CREATE TYPE "NotificationType_new" AS ENUM ('LIKE', 'COMMENT', 'REPLY', 'VISIT');
ALTER TABLE "Notification" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "public"."NotificationType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Community" DROP CONSTRAINT "Community_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "CommunityComment" DROP CONSTRAINT "CommunityComment_parentId_fkey";

-- DropForeignKey
ALTER TABLE "CommunityComment" DROP CONSTRAINT "CommunityComment_postId_fkey";

-- DropForeignKey
ALTER TABLE "CommunityComment" DROP CONSTRAINT "CommunityComment_userId_fkey";

-- DropForeignKey
ALTER TABLE "CommunityJoinRequest" DROP CONSTRAINT "CommunityJoinRequest_communityId_fkey";

-- DropForeignKey
ALTER TABLE "CommunityJoinRequest" DROP CONSTRAINT "CommunityJoinRequest_userId_fkey";

-- DropForeignKey
ALTER TABLE "CommunityLike" DROP CONSTRAINT "CommunityLike_postId_fkey";

-- DropForeignKey
ALTER TABLE "CommunityLike" DROP CONSTRAINT "CommunityLike_userId_fkey";

-- DropForeignKey
ALTER TABLE "CommunityMember" DROP CONSTRAINT "CommunityMember_communityId_fkey";

-- DropForeignKey
ALTER TABLE "CommunityMember" DROP CONSTRAINT "CommunityMember_userId_fkey";

-- DropForeignKey
ALTER TABLE "CommunityMessageReaction" DROP CONSTRAINT "CommunityMessageReaction_messageId_fkey";

-- DropForeignKey
ALTER TABLE "CommunityMessageReaction" DROP CONSTRAINT "CommunityMessageReaction_userId_fkey";

-- DropForeignKey
ALTER TABLE "CommunityPost" DROP CONSTRAINT "CommunityPost_communityId_fkey";

-- DropForeignKey
ALTER TABLE "CommunityPost" DROP CONSTRAINT "CommunityPost_userId_fkey";

-- DropForeignKey
ALTER TABLE "CommunityRoom" DROP CONSTRAINT "CommunityRoom_communityId_fkey";

-- DropForeignKey
ALTER TABLE "CommunityRoom" DROP CONSTRAINT "CommunityRoom_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "CommunityRoomMessage" DROP CONSTRAINT "CommunityRoomMessage_replyToId_fkey";

-- DropForeignKey
ALTER TABLE "CommunityRoomMessage" DROP CONSTRAINT "CommunityRoomMessage_roomId_fkey";

-- DropForeignKey
ALTER TABLE "CommunityRoomMessage" DROP CONSTRAINT "CommunityRoomMessage_userId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_communityId_fkey";

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "communityId",
DROP COLUMN "communityPostId";

-- DropTable
DROP TABLE "Community";

-- DropTable
DROP TABLE "CommunityComment";

-- DropTable
DROP TABLE "CommunityJoinRequest";

-- DropTable
DROP TABLE "CommunityLike";

-- DropTable
DROP TABLE "CommunityMember";

-- DropTable
DROP TABLE "CommunityMessageReaction";

-- DropTable
DROP TABLE "CommunityPost";

-- DropTable
DROP TABLE "CommunityRoom";

-- DropTable
DROP TABLE "CommunityRoomMessage";

-- DropEnum
DROP TYPE "CommunityType";

