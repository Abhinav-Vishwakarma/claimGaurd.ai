-- AlterTable
ALTER TABLE "MedicalVaultItem" ADD COLUMN     "extractedAt" TIMESTAMP(3),
ADD COLUMN     "extractedData" JSONB;
