import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import bcrypt from 'bcrypt';
import prisma from '../src/config/prisma';
import { authService } from '../src/api/auth/auth.service';

jest.mock('../src/config/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers a client and stores a hashed refresh token', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(null);
    mockedPrisma.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'client@test.com',
      name: 'Client',
      role: 'CLIENT',
      passwordHash: 'hash',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockedPrisma.refreshToken.create.mockResolvedValue({} as never);

    const result = await authService.register({
      email: 'client@test.com',
      password: 'password123',
      name: 'Client',
      role: 'CLIENT',
    });

    expect(result.user).toEqual({ id: 'user-1', email: 'client@test.com', role: 'CLIENT' });
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(mockedPrisma.refreshToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        tokenHash: expect.not.stringContaining(result.refreshToken),
      }),
    });
  });

  it('logs in and rejects invalid credentials', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: 'hospital-1',
      email: 'hospital@test.com',
      name: 'Hospital',
      role: 'HOSPITAL',
      passwordHash: await bcrypt.hash('password123', 4),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockedPrisma.refreshToken.create.mockResolvedValue({} as never);

    await expect(
      authService.login({ email: 'hospital@test.com', password: 'wrong-pass' }),
    ).rejects.toMatchObject({ status: 401 });

    const result = await authService.login({ email: 'hospital@test.com', password: 'password123' });

    expect(result.user.role).toBe('HOSPITAL');
    expect(mockedPrisma.refreshToken.create).toHaveBeenCalledTimes(1);
  });

  it('rotates valid refresh tokens', async () => {
    const user = {
      id: 'admin-1',
      email: 'admin@test.com',
      name: 'Admin',
      role: 'ADMIN' as const,
      passwordHash: await bcrypt.hash('password123', 4),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockedPrisma.user.findUnique.mockResolvedValue(user);
    mockedPrisma.refreshToken.create.mockResolvedValue({} as never);

    const login = await authService.login({ email: user.email, password: 'password123' });

    mockedPrisma.refreshToken.findFirst.mockResolvedValue({
      id: 'refresh-1',
      tokenHash: 'hash',
      userId: user.id,
      user,
      expiresAt: new Date(Date.now() + 1000),
      revokedAt: null,
      createdAt: new Date(),
    } as never);
    mockedPrisma.refreshToken.update.mockResolvedValue({} as never);

    const result = await authService.refresh(login.refreshToken);

    expect(result.accessToken).toBeTruthy();
    expect(mockedPrisma.refreshToken.update).toHaveBeenCalledWith({
      where: { id: 'refresh-1' },
      data: { revokedAt: expect.any(Date) },
    });
    expect(mockedPrisma.refreshToken.create).toHaveBeenCalledTimes(2);
  });
});
