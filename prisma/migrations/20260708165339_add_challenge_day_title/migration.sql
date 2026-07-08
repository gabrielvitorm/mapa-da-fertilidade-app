/*
  Warnings:

  - Added the required column `title` to the `ChallengeDay` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ChallengeDay" ADD COLUMN     "title" TEXT NOT NULL;
