import prisma from '../../../config/prisma';
import {
  DashboardOverviewResponse,
  UserProfileResponse,
  MedicalVaultItemResponse,
  EOBRecordResponse,
  AppealLetterResponse,
} from './client.types';

export const dashboardClientService = {
  async getOverview(userId: string): Promise<DashboardOverviewResponse> {
    const claimsCount = await prisma.claim.count({
      where: { userId, status: 'PENDING' },
    });

    const recentClaims = await prisma.claim.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return {
      activeClaimsCount: claimsCount,
      averageComplianceScore: 94, // Mock calculated logic for simplicity
      recentActivity: recentClaims.map((claim) => ({
        id: claim.id,
        action: `Claim filed to ${claim.provider}`,
        timestamp: claim.createdAt,
      })),
    };
  },

  async getProfile(userId: string): Promise<UserProfileResponse> {
    let profile = await prisma.memberProfile.findUnique({
      where: { userId },
    });

    // Simple mock seeding if profile doesn't exist yet for the user
    if (!profile) {
      profile = await prisma.memberProfile.create({
        data: {
          userId,
          memberId: `MBR-${Math.floor(Math.random() * 1000000)}`,
          planType: 'PPO',
          deductibleTotal: 5000,
          deductibleMet: 1200,
        },
      });
    }

    return {
      memberId: profile.memberId,
      planType: profile.planType,
      deductible: {
        total: profile.deductibleTotal,
        met: profile.deductibleMet,
      },
    };
  },

  async getVault(userId: string): Promise<MedicalVaultItemResponse[]> {
    const items = await prisma.medicalVaultItem.findMany({
      where: { userId },
      orderBy: { uploadDate: 'desc' },
    });

    return items.map((item) => ({
      id: item.id,
      type: item.type,
      fileName: item.fileName,
      uploadDate: item.uploadDate,
      url: item.url,
      publicId: item.publicId, // Save this publicly so clients know the hash if they delete
    }));
  },

  async deleteVaultItem(userId: string, itemId: string): Promise<void> {
    const item = await prisma.medicalVaultItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new Error('Item not found');
    }

    if (item.userId !== userId) {
      throw new Error('Unauthorized');
    }

    await prisma.medicalVaultItem.delete({
      where: { id: itemId },
    });
  },

  async getClaimsHistory(userId: string): Promise<EOBRecordResponse[]> {
    const claimsWithEOBs = await prisma.claim.findMany({
      where: { userId, eob: { isNot: null } },
      include: { eob: true },
      orderBy: { createdAt: 'desc' },
    });

    return claimsWithEOBs.map((claim) => {
      const eob = claim.eob!;
      return {
        id: eob.id,
        dateOfService: eob.dateOfService,
        billedAmount: eob.billedAmount,
        allowedAmount: eob.allowedAmount,
        paidAmount: eob.paidAmount,
        patientResponsibility: eob.patientResponsibility,
        finalStatus: eob.finalStatus,
      };
    });
  },

  async getAppeals(userId: string): Promise<AppealLetterResponse[]> {
    const appeals = await prisma.appeal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return appeals.map((appeal) => ({
      id: appeal.id,
      claimId: appeal.claimId,
      status: appeal.status,
      createdAt: appeal.createdAt,
      content: appeal.content,
    }));
  },
};
