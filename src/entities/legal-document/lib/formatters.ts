import type { LegalDocumentType } from '@/entities/legal-document/model/types';

const LEGAL_DOCUMENT_TYPE_LABELS: Record<LegalDocumentType, string> = {
  'public-offer': 'Публичная оферта',
  'personal-data-consent': 'Согласие на обработку персональных данных',
  'personal-data-policy': 'Политика конфиденциальности',
};

export function getLegalDocumentTypeLabel(type: LegalDocumentType): string {
  return LEGAL_DOCUMENT_TYPE_LABELS[type] ?? type;
}

export function formatLegalDocumentUpdatedAt(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
