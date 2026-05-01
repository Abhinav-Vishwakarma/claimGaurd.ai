import type { AuthUser } from '../auth/auth.types';
import type { VaultUploadInput } from './uploads.schemas';

export type VaultUploadMetadata = {
  user: AuthUser;
  type: VaultUploadInput['type'];
};

export type SaveVaultUploadInput = {
  userId: string;
  type: VaultUploadInput['type'];
  fileName: string;
  url: string;
  publicId?: string | null;
};
