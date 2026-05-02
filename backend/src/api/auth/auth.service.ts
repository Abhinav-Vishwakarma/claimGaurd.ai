import bcrypt from 'bcrypt';
import prisma from '../../config/prisma';
import { AuthUser, TokenPair } from './auth.types';
import { LoginInput, RegisterInput } from './auth.schemas';
import { hashToken, refreshExpiryDate, signTokenPair, verifyRefreshToken } from './token.service';

type ServiceError = Error & { status: number };

const serviceError = (status: number, message: string): ServiceError => {
  const error = new Error(message) as ServiceError;
  error.status = status;
  return error;
};

const toAuthUser = (user: { id: string; email: string; role: AuthUser['role'] }): AuthUser => ({
  id: user.id,
  email: user.email,
  role: user.role,
});

const saveRefreshToken = (userId: string, refreshToken: string) =>
  prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshExpiryDate(),
    },
  });

export const authService = {
  async register(input: RegisterInput): Promise<{ user: AuthUser } & TokenPair> {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw serviceError(409, 'Email already registered');

    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        role: input.role,
        passwordHash: await bcrypt.hash(input.password, 12),
      },
    });
    const authUser = toAuthUser(user);
    const tokens = signTokenPair(authUser);
    await saveRefreshToken(user.id, tokens.refreshToken);

    return { user: authUser, ...tokens };
  },

  async login(input: LoginInput): Promise<{ user: AuthUser } & TokenPair> {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw serviceError(401, 'Invalid email or password');
    }

    const authUser = toAuthUser(user);
    const tokens = signTokenPair(authUser);
    await saveRefreshToken(user.id, tokens.refreshToken);

    return { user: authUser, ...tokens };
  },

  async refresh(refreshToken: string): Promise<{ user: AuthUser } & TokenPair> {
    const payload = verifyRefreshToken(refreshToken);
    const savedToken = await prisma.refreshToken.findFirst({
      where: {
        userId: payload.sub,
        tokenHash: hashToken(refreshToken),
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
    if (!savedToken) throw serviceError(401, 'Invalid refresh token');

    await prisma.refreshToken.update({
      where: { id: savedToken.id },
      data: { revokedAt: new Date() },
    });

    const authUser = toAuthUser(savedToken.user);
    const tokens = signTokenPair(authUser);
    await saveRefreshToken(authUser.id, tokens.refreshToken);

    return { user: authUser, ...tokens };
  },

  async logout(refreshToken: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },
};
