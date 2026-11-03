-- AlterTable
ALTER TABLE "Assessment"
ADD COLUMN "consentVersion" TEXT,
ADD COLUMN "consentedAt" TIMESTAMP(3);
