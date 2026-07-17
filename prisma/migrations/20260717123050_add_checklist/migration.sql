-- AlterEnum
ALTER TYPE "MessageType" ADD VALUE 'CHECKLIST';

-- AlterTable
ALTER TABLE "ChallengeMessage" ADD COLUMN     "checklistItems" JSONB;

-- AlterTable
ALTER TABLE "ChallengeProgress" ADD COLUMN     "checklistProgress" JSONB NOT NULL DEFAULT '{}';
