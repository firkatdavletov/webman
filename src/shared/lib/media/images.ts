import type { MediaImage } from '@/shared/model/media';

export function buildMediaImagesFromUrls(urls: readonly string[] | null | undefined): MediaImage[] {
  return (urls ?? [])
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url) => ({
      id: null,
      url,
    }));
}

export function getMediaImageIdsForSave(images: readonly MediaImage[]): string[] | undefined {
  const normalizedImages = images
    .map((image) => ({
      id: image.id?.trim() ?? '',
      url: image.url.trim(),
    }))
    .filter((image) => image.url);

  if (!normalizedImages.length || normalizedImages.some((image) => !image.id)) {
    return undefined;
  }

  return normalizedImages.map((image) => image.id);
}

export function getPrimaryMediaImageUrl(images: readonly MediaImage[]): string {
  return images.find((image) => image.url.trim())?.url.trim() ?? '';
}
