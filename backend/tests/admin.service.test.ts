import { adminService } from '../src/api/admin/admin.service';
import { prismaMock } from './singleton';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword' as never),
}));

describe('Admin Service', () => {
  beforeEach(() => {
    // Mock prisma.$transaction to simply execute the callback with prismaMock
    prismaMock.$transaction.mockImplementation(async (callback: any) => {
      return await callback(prismaMock);
    });
  });

  describe('registerClient', () => {
    it('should throw 404 if userId is provided but user is not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        adminService.registerClient({
          userId: 'nonexistent-user',
          email: 'test@example.com',
          name: 'Test',
          memberId: 'mem1',
          planType: 'PPO',
          deductibleTotal: 1000,
          policyActive: true,
          premiumPaid: true,
        })
      ).rejects.toMatchObject({ status: 404 });
    });

    it('should throw 409 if user already has a member profile (by userId)', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        memberProfile: { id: 'prof-1' },
      } as any);

      await expect(
        adminService.registerClient({
          userId: 'user-1',
          email: 'test@example.com',
          name: 'Test',
          memberId: 'mem1',
          planType: 'PPO',
          deductibleTotal: 1000,
          policyActive: true,
          premiumPaid: true,
        })
      ).rejects.toMatchObject({ status: 409, message: 'User already has a clinical profile' });
    });

    it('should throw 409 if memberId already exists', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        memberProfile: null,
      } as any);
      
      prismaMock.memberProfile.findUnique.mockResolvedValue({ id: 'prof-1' } as any);

      await expect(
        adminService.registerClient({
          userId: 'user-1',
          email: 'test@example.com',
          name: 'Test',
          memberId: 'existing-mem',
          planType: 'PPO',
          deductibleTotal: 1000,
          policyActive: true,
          premiumPaid: true,
        })
      ).rejects.toMatchObject({ status: 409, message: 'Member with this ID already exists' });
    });

    it('should create a profile for an existing user (by userId)', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        memberProfile: null,
      } as any);
      prismaMock.memberProfile.findUnique.mockResolvedValue(null);

      prismaMock.memberProfile.create.mockResolvedValue({ id: 'new-prof', memberId: 'mem1' } as any);

      const result = await adminService.registerClient({
        userId: 'user-1',
        email: 'test@example.com',
        name: 'Test',
        memberId: 'mem1',
        planType: 'PPO',
        deductibleTotal: 1000,
        policyActive: true,
        premiumPaid: true,
      });

      expect(result.user.id).toBe('user-1');
      expect(result.profile.id).toBe('new-prof');
      expect(prismaMock.memberProfile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          memberId: 'mem1',
        }),
      });
    });

    it('should throw 400 if creating a new user without password', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.memberProfile.findUnique.mockResolvedValue(null);

      await expect(
        adminService.registerClient({
          email: 'new@example.com',
          name: 'New',
          memberId: 'mem1',
          planType: 'PPO',
          deductibleTotal: 1000,
          policyActive: true,
          premiumPaid: true,
        })
      ).rejects.toMatchObject({ status: 400, message: 'Password is required for new user registration' });
    });

    it('should create a new user and profile', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null); // No existing email
      prismaMock.memberProfile.findUnique.mockResolvedValue(null);

      prismaMock.user.create.mockResolvedValue({ id: 'new-user', email: 'new@example.com' } as any);
      prismaMock.memberProfile.create.mockResolvedValue({ id: 'new-prof' } as any);

      const result = await adminService.registerClient({
        email: 'new@example.com',
        name: 'New User',
        password: 'password123',
        memberId: 'mem1',
        planType: 'PPO',
        deductibleTotal: 1000,
        policyActive: true,
        premiumPaid: true,
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(prismaMock.user.create).toHaveBeenCalled();
      expect(prismaMock.memberProfile.create).toHaveBeenCalled();
      expect(result.user.id).toBe('new-user');
    });
  });

  describe('getAllClients', () => {
    it('should return all clients', async () => {
      prismaMock.user.findMany.mockResolvedValue([
        { id: 'user-1', role: 'CLIENT' },
      ] as any);

      const result = await adminService.getAllClients();
      expect(result.length).toBe(1);
      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: { role: 'CLIENT' },
        include: { memberProfile: true },
      });
    });
  });

  describe('searchUserByEmail', () => {
    it('should return matching users', async () => {
      prismaMock.user.findMany.mockResolvedValue([
        { id: 'user-1', email: 'test@example.com' },
      ] as any);

      const result = await adminService.searchUserByEmail('test');
      expect(result.length).toBe(1);
      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: { contains: 'test', mode: 'insensitive' } },
        })
      );
    });
  });
});
