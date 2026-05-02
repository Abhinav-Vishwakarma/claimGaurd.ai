import { User, MemberProfile } from '@prisma/client';
import bcrypt from 'bcrypt';
import prisma from '../../config/prisma';
import { RegisterClientInput } from './admin.schemas';

type UserWithProfile = User & { memberProfile?: MemberProfile | null };

export const adminService = {
  async registerClient(input: RegisterClientInput) {
    let user: UserWithProfile | null | undefined;

    if (input.userId && input.userId.trim() !== '') {
      user = await prisma.user.findUnique({
        where: { id: input.userId },
        include: { memberProfile: true },
      });
      if (!user) {
        const err = new Error('User not found');
        Object.assign(err, { status: 404 });
        throw err;
      }
      if (user.memberProfile) {
        const err = new Error('User already has a clinical profile');
        Object.assign(err, { status: 409 });
        throw err;
      }
    } else {
      // Fallback: check if user exists by email if no userId provided
      const existingUser = await prisma.user.findUnique({
        where: { email: input.email },
        include: { memberProfile: true },
      });

      if (existingUser) {
        if (existingUser.memberProfile) {
          const err = new Error('User already has a clinical profile');
          Object.assign(err, { status: 409 });
          throw err;
        }
        user = existingUser;
      }
    }

    const existingProfile = await prisma.memberProfile.findUnique({
      where: { memberId: input.memberId },
    });

    if (existingProfile) {
      const err = new Error('Member with this ID already exists');
      Object.assign(err, { status: 409 });
      throw err;
    }

    return prisma.$transaction(async (tx) => {
      if (!user) {
        if (!input.password) {
          const err = new Error('Password is required for new user registration');
          Object.assign(err, { status: 400 });
          throw err;
        }
        const passwordHash = await bcrypt.hash(input.password, 12);
        user = await tx.user.create({
          data: {
            email: input.email,
            name: input.name,
            passwordHash,
            role: 'CLIENT',
          },
        });
      }

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

  async searchUserByEmail(email: string) {
    return prisma.user.findMany({
      where: {
        email: { contains: email, mode: 'insensitive' },
      },
      take: 5,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        memberProfile: true,
      },
    });
  },
};
