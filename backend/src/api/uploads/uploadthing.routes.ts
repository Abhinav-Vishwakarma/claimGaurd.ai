import { createRouteHandler, createUploadthing, type FileRouter } from 'uploadthing/express';
import { vaultUploadInputSchema } from './uploads.schemas';
import * as controller from './uploads.controller';

const f = createUploadthing();

export const uploadRouter = {
  vaultUploader: f({
    image: { maxFileSize: '16MB', maxFileCount: 1 },
    pdf: { maxFileSize: '16MB', maxFileCount: 1 },
  })
    .input(vaultUploadInputSchema)
    .middleware(controller.prepareVaultUpload)
    .onUploadComplete(controller.completeVaultUpload),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;

export const uploadthingHandler = createRouteHandler({
  router: uploadRouter,
});
