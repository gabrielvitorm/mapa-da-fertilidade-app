/*
  Warnings:

  - You are about to drop the column `conteudo` on the `Devolutiva` table. All the data in the column will be lost.
  - You are about to drop the column `mediaUrl` on the `Devolutiva` table. All the data in the column will be lost.
  - You are about to drop the column `tipo` on the `Devolutiva` table. All the data in the column will be lost.
  - Added the required column `texto` to the `Devolutiva` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Devolutiva" DROP COLUMN "conteudo",
DROP COLUMN "mediaUrl",
DROP COLUMN "tipo",
ADD COLUMN     "texto" TEXT NOT NULL;

-- DropEnum
DROP TYPE "DevolutivaTipo";
