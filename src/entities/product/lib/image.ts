export const MAX_PRODUCT_IMAGE_SIZE_BYTES = 1 * 1024 * 1024;

const PRODUCT_IMAGE_ASPECT_RATIO_WIDTH = 4;
const PRODUCT_IMAGE_ASPECT_RATIO_HEIGHT = 5;
const PRODUCT_IMAGE_ASPECT_RATIO_PIXEL_TOLERANCE = 1;

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();

    const cleanup = () => {
      URL.revokeObjectURL(imageUrl);
    };

    image.onload = () => {
      cleanup();

      if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
        reject(new Error('Не удалось определить размеры изображения.'));
        return;
      }

      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };

    image.onerror = () => {
      cleanup();
      reject(new Error('Не удалось определить размеры изображения.'));
    };

    image.src = imageUrl;
  });
}

export async function getProductImageAspectRatioError(file: File): Promise<string | null> {
  try {
    const { width, height } = await readImageDimensions(file);
    const ratioDelta = Math.abs(width * PRODUCT_IMAGE_ASPECT_RATIO_HEIGHT - height * PRODUCT_IMAGE_ASPECT_RATIO_WIDTH);

    if (ratioDelta > PRODUCT_IMAGE_ASPECT_RATIO_PIXEL_TOLERANCE) {
      return 'Соотношение сторон изображения должно быть 4:5.';
    }

    return null;
  } catch {
    return 'Не удалось определить размеры изображения.';
  }
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Не удалось прочитать изображение.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Не удалось прочитать изображение.'));
    };

    reader.readAsDataURL(file);
  });
}
