import {
  completeProductImageUpload,
  initProductImageUpload,
  readFileAsDataUrl,
  uploadProductImageToStorage,
} from '@/entities/product';
import type { MediaImage } from '@/shared/model/media';

export const PRODUCT_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
export const SUPPORTED_PRODUCT_IMAGE_TYPES = new Set(PRODUCT_IMAGE_ACCEPT.split(','));

type ProductImageUploadTargetType = NonNullable<Parameters<typeof initProductImageUpload>[0]['targetType']>;

type UploadProductImageFileOptions = {
  file: File;
  targetType: ProductImageUploadTargetType;
  targetId: string | null;
  includePreviewDataUrl?: boolean;
  requireImage?: boolean;
};

export type UploadProductImageFileResult = {
  error: string | null;
  image: MediaImage | null;
  previewDataUrl?: string;
};

export function validateProductImageFiles(files: File[]): string | null {
  if (files.some((imageFile) => !SUPPORTED_PRODUCT_IMAGE_TYPES.has(imageFile.type))) {
    return 'Выберите изображение в формате JPG, PNG или WEBP.';
  }

  return null;
}

export async function uploadProductImageFile({
  file,
  targetType,
  targetId,
  includePreviewDataUrl = false,
  requireImage = true,
}: UploadProductImageFileOptions): Promise<UploadProductImageFileResult> {
  const initResult = await initProductImageUpload({
    targetType,
    targetId,
    contentType: file.type,
    sizeBytes: file.size,
    fileName: file.name || null,
  });

  if (!initResult.upload) {
    return {
      error: initResult.error ?? 'Не удалось получить данные для загрузки изображения.',
      image: null,
    };
  }

  const uploadData = initResult.upload;
  const storageUploadResult = await uploadProductImageToStorage({
    uploadUrl: uploadData.uploadUrl,
    requiredHeaders: uploadData.requiredHeaders,
    file,
  });

  if (storageUploadResult.error) {
    return {
      error: storageUploadResult.error,
      image: null,
    };
  }

  const completeResult = await completeProductImageUpload({
    uploadId: uploadData.uploadId,
  });

  if (completeResult.error || (requireImage && !completeResult.image)) {
    return {
      error: completeResult.error ?? 'Сервис завершения загрузки не вернул данные изображения.',
      image: null,
    };
  }

  return {
    error: null,
    image: completeResult.image ?? null,
    previewDataUrl: includePreviewDataUrl ? await readFileAsDataUrl(file) : undefined,
  };
}
