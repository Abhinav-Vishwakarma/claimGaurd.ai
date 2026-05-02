/*
  Warnings:

  - The values [pending,approved,denied] on the enum `ClaimStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `amount` on the `Claim` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[claimSessionId]` on the table `Claim` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `billVaultId` to the `Claim` table without a default value. This is not possible if the table is not empty.
  - Added the required column `labReportVaultId` to the `Claim` table without a default value. This is not possible if the table is not empty.
  - Added the required column `prescriptionVaultId` to the `Claim` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AdminDecision" AS ENUM ('APPROVED', 'PARTIAL_APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PaymentRequestStatus" AS ENUM ('PENDING_VERIFICATION', 'APPROVED', 'REJECTED');

-- AlterEnum
BEGIN;
CREATE TYPE "ClaimStatus_new" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'PARTIAL_APPROVED', 'REJECTED');
ALTER TABLE "public"."Claim" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Claim" ALTER COLUMN "status" TYPE "ClaimStatus_new" USING ("status"::text::"ClaimStatus_new");
ALTER TYPE "ClaimStatus" RENAME TO "ClaimStatus_old";
ALTER TYPE "ClaimStatus_new" RENAME TO "ClaimStatus";
DROP TYPE "public"."ClaimStatus_old";
ALTER TABLE "Claim" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "Claim" DROP COLUMN "amount",
ADD COLUMN     "adjudicationResult" JSONB,
ADD COLUMN     "adminApprovedAmount" DOUBLE PRECISION,
ADD COLUMN     "adminDecision" "AdminDecision",
ADD COLUMN     "adminRemark" TEXT,
ADD COLUMN     "billVaultId" TEXT NOT NULL,
ADD COLUMN     "billedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "claimSessionId" TEXT,
ADD COLUMN     "decidedAt" TIMESTAMP(3),
ADD COLUMN     "decidedByAdminId" TEXT,
ADD COLUMN     "labReportVaultId" TEXT NOT NULL,
ADD COLUMN     "parentClaimId" TEXT,
ADD COLUMN     "prescriptionVaultId" TEXT NOT NULL,
ALTER COLUMN "provider" SET DEFAULT 'Unknown Provider',
ALTER COLUMN "date" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "ClaimSession" ADD COLUMN     "adjudicationResult" JSONB;

-- AlterTable
ALTER TABLE "MemberProfile" ADD COLUMN     "coinsuranceRate" DOUBLE PRECISION NOT NULL DEFAULT 0.20,
ADD COLUMN     "copay" DOUBLE PRECISION NOT NULL DEFAULT 20.0,
ADD COLUMN     "coverageLimit" DOUBLE PRECISION NOT NULL DEFAULT 100000.0;

-- CreateTable
CREATE TABLE "PaymentRequest" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grantedAmount" DOUBLE PRECISION NOT NULL,
    "accountHolderName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "ifscCode" TEXT NOT NULL,
    "additionalNotes" TEXT,
    "status" "PaymentRequestStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "adminRemark" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRequest_claimId_key" ON "PaymentRequest"("claimId");

-- CreateIndex
CREATE INDEX "PaymentRequest_userId_idx" ON "PaymentRequest"("userId");

-- CreateIndex
CREATE INDEX "PaymentRequest_status_idx" ON "PaymentRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Claim_claimSessionId_key" ON "Claim"("claimSessionId");

-- CreateIndex
CREATE INDEX "Claim_userId_idx" ON "Claim"("userId");

-- CreateIndex
CREATE INDEX "Claim_status_idx" ON "Claim"("status");

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_claimSessionId_fkey" FOREIGN KEY ("claimSessionId") REFERENCES "ClaimSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_parentClaimId_fkey" FOREIGN KEY ("parentClaimId") REFERENCES "Claim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
