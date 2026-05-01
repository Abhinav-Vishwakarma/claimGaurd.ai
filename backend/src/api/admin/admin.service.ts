import bcrypt from 'bcrypt';
import prisma from '../../config/prisma';
import { RegisterClientInput } from './admin.schemas';

export const adminService = {
  async registerClient(input: RegisterClientInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      const err = new Error('User with this email already exists');
      Object.assign(err, { status: 409 });
      throw err;
    }

    const existingProfile = await prisma.memberProfile.findUnique({
      where: { memberId: input.memberId },
    });

    if (existingProfile) {
      const err = new Error('Member with this ID already exists');
      Object.assign(err, { status: 409 });
      throw err;
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash,
          role: 'CLIENT',
        },
      });

      const profile = await tx.memberProfile.create({
        data: {
          userId: user.id,
          memberId: input.memberId,
          planType: input.planType,
          deductibleTotal: input.deductibleTotal,
          policyActive: input.policyActive,
          premiumPaid: input.premiumPaid,
        },
      });

      return { user, profile };
    });
  },

  async getAllClients() {
    return prisma.user.findMany({
      where: { role: 'CLIENT' },
      include: { memberProfile: true },
    });
  },
};
