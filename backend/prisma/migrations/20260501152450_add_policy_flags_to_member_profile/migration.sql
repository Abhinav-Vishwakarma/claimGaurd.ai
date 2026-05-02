-- AlterTable
ALTER TABLE "MemberProfile" ADD COLUMN     "policyActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "premiumPaid" BOOLEAN NOT NULL DEFAULT true;
