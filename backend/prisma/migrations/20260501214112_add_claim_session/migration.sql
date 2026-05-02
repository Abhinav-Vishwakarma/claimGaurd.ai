-- CreateEnum
CREATE TYPE "ClaimSessionVerdict" AS ENUM ('CLAIMABLE', 'NOT_CLAIMABLE', 'NEEDS_REVIEW');

-- CreateTable
CREATE TABLE "ClaimSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "prescriptionVaultId" TEXT NOT NULL,
    "billVaultId" TEXT NOT NULL,
    "labReportVaultId" TEXT NOT NULL,
    "eventLog" JSONB NOT NULL DEFAULT '[]',
    "extractedServiceMap" JSONB,
    "validationReport" JSONB,
    "gatekeeperReport" JSONB,
    "verdict" "ClaimSessionVerdict" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "isClaimable" BOOLEAN NOT NULL DEFAULT false,
    "verdictReasons" JSONB NOT NULL DEFAULT '[]',
    "verdictSummary" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClaimSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClaimSession_userId_idx" ON "ClaimSession"("userId");

-- AddForeignKey
ALTER TABLE "ClaimSession" ADD CONSTRAINT "ClaimSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
