import { type ChangeEvent, useRef, useState } from 'react';
import {
  deleteProductImage,
  type Product,
} from '@/entities/product';
import {
  PRODUCT_IMAGE_ACCEPT,
  uploadProductImageFile,
  validateProductImageFiles,
} from '@/features/product-media';
import type { ProductWorkspaceMutationResult } from '@/pages/catalog/product-workspace/model/productWorkspaceForms';
import type { MediaImage } from '@/shared/model/media';
import {
  AdminEmptyState,
  AdminNotice,
  AdminSectionCard,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui';

type ProductMediaSectionProps = {
  onRefreshProduct: () => Promise<ProductWorkspaceMutationResult>;
  product: Product;
};

type ImageDeleteTarget = {
  imageId: string;
  imageKey: string;
  label: string;
};

function getImageKey(image: MediaImage, imageIndex: number): string {
  return image.id?.trim() || `${image.url}-${imageIndex}`;
}

export function ProductMediaSection({ onRefreshProduct, product }: ProductMediaSectionProps) {
  const imageUploadInputRef = useRef<HTMLInputElement | null>(null);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [imageDeleteTarget, setImageDeleteTarget] = useState<ImageDeleteTarget | null>(null);
  const [pendingImageRemovalKey, setPendingImageRemovalKey] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState('');
  const [mutationSuccess, setMutationSuccess] = useState('');

  const isMutating = isImageUploading || pendingImageRemovalKey !== null;

  const handleImageUploadClick = () => {
    imageUploadInputRef.current?.click();
  };

  const refreshAfterMutation = async (successMessage: string) => {
    const refreshResult = await onRefreshProduct();

    if (!refreshResult.product) {
      setMutationError(refreshResult.error ?? 'Изменение выполнено, но не удалось обновить снимок товара.');
      setMutationSuccess('');
      return;
    }

    setMutationError(refreshResult.error ?? '');
    setMutationSuccess(refreshResult.error ? '' : successMessage);
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const imageFiles = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (!imageFiles.length) {
      return;
    }

    const validationError = validateProductImageFiles(imageFiles);

    if (validationError) {
      setMutationError(validationError);
      setMutationSuccess('');
      return;
    }

    setIsImageUploading(true);
    setMutationError('');
    setMutationSuccess('');

    let hasCompletedUpload = false;

    try {
      for (const imageFile of imageFiles) {
        const uploadResult = await uploadProductImageFile({
          targetType: 'PRODUCT',
          targetId: product.id,
          file: imageFile,
          requireImage: false,
        });

        if (uploadResult.error) {
          if (hasCompletedUpload) {
            await refreshAfterMutation('Часть фотографий загружена.');
          }

          setMutationError(uploadResult.error);
          setMutationSuccess('');
          setIsImageUploading(false);
          return;
        }

        hasCompletedUpload = true;
      }

      await refreshAfterMutation(imageFiles.length > 1 ? 'Фотографии загружены.' : 'Фотография загружена.');
    } catch {
      setMutationError('Не удалось обработать выбранный файл.');
      setMutationSuccess('');
    } finally {
      setIsImageUploading(false);
    }
  };

  const openImageDeleteDialog = (image: MediaImage, imageIndex: number) => {
    const imageId = image.id?.trim() ?? '';

    setMutationError('');
    setMutationSuccess('');

    if (!imageId) {
      setMutationError('Нельзя удалить фотографию без imageId. Обновите снимок товара и попробуйте снова.');
      return;
    }

    setImageDeleteTarget({
      imageId,
      imageKey: getImageKey(image, imageIndex),
      label: `Фото #${imageIndex + 1}`,
    });
  };

  const handleConfirmImageDelete = async () => {
    if (!imageDeleteTarget) {
      return;
    }

    setPendingImageRemovalKey(imageDeleteTarget.imageKey);
    setMutationError('');
    setMutationSuccess('');

    const result = await deleteProductImage(product.id, imageDeleteTarget.imageId);

    if (result.error) {
      setMutationError(result.error);
      setPendingImageRemovalKey(null);
      setImageDeleteTarget(null);
      return;
    }

    await refreshAfterMutation('Фотография удалена.');
    setPendingImageRemovalKey(null);
    setImageDeleteTarget(null);
  };

  return (
    <>
      <AdminSectionCard
        eyebrow="Медиа"
        title="Фотографии продукта"
        description="Загрузка и удаление используют текущие медиа API, затем секция заново получает снимок товара."
        action={
          <Button type="button" variant="outline" onClick={handleImageUploadClick} disabled={isMutating}>
            {isImageUploading ? 'Загрузка...' : 'Загрузить фото'}
          </Button>
        }
      >
        <input
          ref={imageUploadInputRef}
          type="file"
          accept={PRODUCT_IMAGE_ACCEPT}
          multiple
          className="hidden"
          onChange={(event) => void handleImageUpload(event)}
          disabled={isMutating}
          tabIndex={-1}
        />

        {product.images.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {product.images.map((image, imageIndex) => {
              const imageKey = getImageKey(image, imageIndex);
              const isRemovingCurrentImage = pendingImageRemovalKey === imageKey;

              return (
                <article key={imageKey} className="overflow-hidden rounded-2xl border border-border/70 bg-background/70">
                  <img className="aspect-square w-full object-cover" src={image.url} alt={`${product.title} - фото ${imageIndex + 1}`} />
                  <div className="flex items-center justify-between gap-2 border-t border-border/60 px-3 py-2">
                    <span className="text-xs text-muted-foreground">Фото #{imageIndex + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openImageDeleteDialog(image, imageIndex)}
                      disabled={isMutating}
                    >
                      {isRemovingCurrentImage ? 'Удаление...' : 'Удалить'}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <AdminEmptyState description="У продукта пока нет фотографий." />
        )}

        {mutationError ? <AdminNotice tone="destructive">{mutationError}</AdminNotice> : null}
        {mutationSuccess ? <AdminNotice>{mutationSuccess}</AdminNotice> : null}
      </AdminSectionCard>

      <Dialog
        open={Boolean(imageDeleteTarget)}
        onOpenChange={(open) => {
          if (!open && !pendingImageRemovalKey) {
            setImageDeleteTarget(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить фотографию?</DialogTitle>
            <DialogDescription>
              {imageDeleteTarget?.label ?? 'Фотография'} будет удалена из карточки товара. Это действие нельзя отменить в интерфейсе.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleConfirmImageDelete()}
              disabled={Boolean(pendingImageRemovalKey)}
            >
              {pendingImageRemovalKey ? 'Удаление...' : 'Удалить'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setImageDeleteTarget(null)}
              disabled={Boolean(pendingImageRemovalKey)}
            >
              Отмена
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
