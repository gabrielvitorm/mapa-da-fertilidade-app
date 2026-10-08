-- CreateEnum
CREATE TYPE "QuizVersion" AS ENUM ('MAPA_V1', 'CHECKLIST_V2');

-- CreateEnum
CREATE TYPE "ChecklistClassification" AS ENUM ('FAVORAVEL', 'INTERMEDIARIA', 'ALTA_PRIORIDADE', 'INCONCLUSIVA');

-- AlterTable
ALTER TABLE "Assessment" ADD COLUMN     "checklistResult" JSONB,
ADD COLUMN     "classification" "ChecklistClassification",
ADD COLUMN     "quizVersion" "QuizVersion" NOT NULL DEFAULT 'MAPA_V1',
ALTER COLUMN "resultadoFinal" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "code" TEXT,
ADD COLUMN     "helpText" TEXT,
ADD COLUMN     "multiSelect" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "version" "QuizVersion" NOT NULL DEFAULT 'MAPA_V1';

-- AlterTable
ALTER TABLE "QuestionOption" ADD COLUMN     "exclusive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "value" TEXT;

-- CreateTable
CREATE TABLE "ChecklistText" (
    "key" TEXT NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,

    CONSTRAINT "ChecklistText_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Question_version_code_key" ON "Question"("version", "code");

