import type { Request } from 'express';
import prisma from '../../config/prisma';
import { verifyAccessToken } from '../auth/token.service';
import type { AuthUser } from '../auth/auth.types';
import type { SaveVaultUploadInput, VaultUploadMetadata } from './uploads.types';

type ServiceError = Error & { status: number };

const serviceError = (status: number, message: string): ServiceError => {
  const error = new Error(message) as ServiceError;
  error.status = status;
  return error;
};

const getAuthenticatedUser = (req: Request): AuthUser => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw serviceError(401, 'Missing bearer token');
  }

  try {
    const payload = verifyAccessToken(token);
    return { id: payload.id, email: payload.email, role: payload.role };
  } catch {
    throw serviceError(401, 'Invalid bearer token');
  }
};

export const uploadsService = {
  getVaultUploadMetadata(req: Request, type: VaultUploadMetadata['type']): VaultUploadMetadata {
    const user = getAuthenticatedUser(req);

    if (user.role !== 'CLIENT') {
      throw serviceError(403, 'Forbidden');
    }

    return { user, type };
  },

  async saveVaultUpload(input: SaveVaultUploadInput) {
    return prisma.medicalVaultItem.create({
      data: {
        userId: input.userId,
        type: input.type,
        fileName: input.fileName,
        url: input.url,
        publicId: input.publicId || null,
      },
    });
  },
};
