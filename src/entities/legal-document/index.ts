export { formatLegalDocumentUpdatedAt, getLegalDocumentTypeLabel } from './lib/formatters';
export type { LegalDocument, LegalDocumentType, UpdateLegalDocumentPayload } from './model/types';
export { getLegalDocument, getLegalDocuments, updateLegalDocument } from './api/legalDocumentApi';
export type { LegalDocumentResult, LegalDocumentsResult, SaveLegalDocumentResult } from './api/legalDocumentApi';
