import type { Request } from 'express';
import type { UploadedFileData } from 'uploadthing/types';
import { uploadsService } from './uploads.service';
import type { VaultUploadInput, VaultUploadResult } from './uploads.schemas';
import type { VaultUploadMetadata } from './uploads.types';

export const prepareVaultUpload = ({
  req,
  input,
}: {
  req: Request;
  input: VaultUploadInput;
}): VaultUploadMetadata => {
  return uploadsService.getVaultUploadMetadata(req, input.type);
};

export const completeVaultUpload = async ({
  metadata,
  file,
}: {
  metadata: VaultUploadMetadata;
  file: UploadedFileData;
}): Promise<VaultUploadResult> => {
  await uploadsService.saveVaultUpload({
    userId: metadata.user.id,
    type: metadata.type,
    fileName: file.name,
    url: file.url,
    publicId: file.key,
  });

  return { fileUrl: file.url };
};
