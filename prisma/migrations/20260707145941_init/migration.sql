-- CreateEnum
CREATE TYPE "AssessmentSource" AS ENUM ('TYPEBOT', 'APP_NATIVE');

-- CreateEnum
CREATE TYPE "NivelGlobal" AS ENUM ('BAIXA', 'MODERADA', 'ALTA');

-- CreateEnum
CREATE TYPE "PillarLevel" AS ENUM ('Alto', 'Moderado', 'Baixo');

-- CreateEnum
CREATE TYPE "ProductKind" AS ENUM ('APP_ACCESS', 'CHALLENGE', 'ORDER_BUMP');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('KIWIFY', 'HOTMART');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PAID', 'REFUNDED', 'CHARGEBACK');

-- CreateEnum
CREATE TYPE "EntitlementType" AS ENUM ('REPORT', 'CHALLENGE', 'BUMP');

-- CreateEnum
CREATE TYPE "EntitlementStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXTO', 'AUDIO', 'IMAGEM', 'VIDEO');

-- CreateEnum
CREATE TYPE "DevolutivaTipo" AS ENUM ('TEXTO', 'AUDIO', 'FOTO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nome" TEXT,
    "cpf" TEXT,
    "celular" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "source" "AssessmentSource" NOT NULL,
    "leadEmail" TEXT,
    "leadCpf" TEXT,
    "leadNome" TEXT,
    "leadCelular" TEXT,
    "answers" JSONB NOT NULL,
    "pillarScores" JSONB NOT NULL,
    "scoreTotal" DOUBLE PRECISION NOT NULL,
    "resultadoFinal" DOUBLE PRECISION NOT NULL,
    "nivelGlobal" "NivelGlobal" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "pillar" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "rawScore" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "QuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreRule" (
    "pillar" TEXT NOT NULL,
    "peso" INTEGER NOT NULL,
    "maxDoPilar" DOUBLE PRECISION NOT NULL,
    "scoreDenominator" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ScoreRule_pkey" PRIMARY KEY ("pillar")
);

-- CreateTable
CREATE TABLE "PillarMessage" (
    "id" TEXT NOT NULL,
    "pillar" TEXT NOT NULL,
    "level" "PillarLevel" NOT NULL,
    "diagnostico" TEXT NOT NULL,
    "recomendacao" TEXT NOT NULL,

    CONSTRAINT "PillarMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "kind" "ProductKind" NOT NULL,
    "platform" "Platform" NOT NULL,
    "platformProductId" TEXT NOT NULL,
    "checkoutUrl" TEXT NOT NULL,
    "grants" JSONB NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "platformTransactionId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entitlement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "EntitlementType" NOT NULL,
    "status" "EntitlementStatus" NOT NULL,
    "metadata" JSONB,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Entitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeTrack" (
    "id" TEXT NOT NULL,
    "level" "NivelGlobal" NOT NULL,
    "codename" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "defaultCooldownHours" INTEGER NOT NULL,

    CONSTRAINT "ChallengeTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeDay" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "isOnboarding" BOOLEAN NOT NULL DEFAULT false,
    "cooldownHours" INTEGER,

    CONSTRAINT "ChallengeDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeMessage" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "tipo" "MessageType" NOT NULL,
    "texto" TEXT,
    "mediaKey" TEXT,
    "delayMs" INTEGER NOT NULL,

    CONSTRAINT "ChallengeMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "currentDay" INTEGER NOT NULL DEFAULT 0,
    "dayCompletions" JSONB NOT NULL DEFAULT '{}',
    "lastSeenOrdem" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "ChallengeProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Devolutiva" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "tipo" "DevolutivaTipo" NOT NULL,
    "conteudo" TEXT,
    "mediaUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Devolutiva_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "PillarMessage_pillar_level_key" ON "PillarMessage"("pillar", "level");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Order_platformTransactionId_key" ON "Order"("platformTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeTrack_level_key" ON "ChallengeTrack"("level");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeDay_trackId_dayNumber_key" ON "ChallengeDay"("trackId", "dayNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeProgress_userId_trackId_key" ON "ChallengeProgress"("userId", "trackId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeDay" ADD CONSTRAINT "ChallengeDay_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "ChallengeTrack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeMessage" ADD CONSTRAINT "ChallengeMessage_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "ChallengeDay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeProgress" ADD CONSTRAINT "ChallengeProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeProgress" ADD CONSTRAINT "ChallengeProgress_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "ChallengeTrack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Devolutiva" ADD CONSTRAINT "Devolutiva_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
