/*
  Warnings:

  - Added the required column `pillarOrdem` to the `Question` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "pillarOrdem" INTEGER NOT NULL;
