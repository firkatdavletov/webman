# Admin Product Frontend Refactoring Plan

## Overview

This document audits the current admin product creation and editing experience and proposes an incremental frontend refactoring plan for a more maintainable product management workspace.

The frontend is a React 18, TypeScript, Vite, and Tailwind CSS admin app. The repository follows a feature-sliced structure:

- `src/app`: app shell and routes.
- `src/pages`: route-level screens.
- `src/features`: editors and user workflows.
- `src/entities`: domain types, API clients, formatters, and mappers.
- `src/shared`: shared UI, API, config, and utilities.

The requested backend document `docs/product-management-refactoring-plan.md` is not present in this repository. The current local product documentation is `docs/product-creation.md`. This plan aligns with the requested backend direction from the task brief: a draft-based product workspace, server-side product state as the source of truth, and incremental editing of product sections.

Important current constraints:

- Do not rewrite the current editor before backend and UI migration phases are ready.
- Keep existing product creation/editing behavior working during the transition.
- Do not change generated API schema types manually.
- Do not add production dependencies without explicit approval.
- Current automated tests are absent; `npm run build` is the only configured verification command.

## Current Product Creation Flow

### Routes and entry points

- Route: `/products/new`
- Page: `src/pages/catalog/product-create/ui/ProductCreatePage.tsx`
- Draft persistence model: `src/pages/catalog/product-create/model/productCreationDraft.ts`
- Large editor component: `src/features/product-editor/ui/ProductEditor.tsx`
- Editor form model and validation: `src/features/product-editor/model/productEditor.ts`
- Product API client and DTO mappers: `src/entities/product/api/productApi.ts`

The product list links to creation from `src/pages/catalog/products/ui/ProductsPage.tsx`.

### How creation currently works

`ProductCreatePage` loads categories and modifier groups in parallel:

- `getCategories()`
- `getAllModifierGroups()`

It initializes a `ProductCreationDraft`, then renders `ProductEditor` with the full `ProductEditorValues` object. If categories are available and no category is selected, the first category is auto-selected.

On submit, `ProductCreatePage` validates:

- title is present;
- category id is a UUID;
- price is valid;
- old price is empty or valid;
- count step is a positive integer;
- unit is selected;
- variant section is valid through `validateProductVariantsSection`;
- modifier links are valid through `validateProductModifierGroupsSection`.

The page maps the form into a `Product` domain object and calls:

```ts
saveProduct(newProduct, {
  replaceVariantConfiguration: shouldReplaceVariantConfiguration,
  deferActivationUntilVariantConfiguration: shouldReplaceVariantConfiguration,
});
```

`shouldReplaceVariantConfiguration` is true when the submitted form has variants or when a previous create attempt already started variant saving.

`saveProduct` currently performs a multi-step flow:

1. `POST /api/v1/admin/catalog/products` to create or update the base product.
2. If variants must be saved, `PUT /api/v1/admin/products/{productId}/variant-configuration` to replace all option groups, option values, variants, and variant option links.
3. If activation was deferred and the admin wanted the product active, another `POST /api/v1/admin/catalog/products` re-saves the base product as active.

This sequence is documented in `docs/product-creation.md`. If step 1 succeeds but the variant configuration step fails, the product remains inactive and the create page stores the server product id in the browser draft so the admin can retry without creating a duplicate.

### Browser draft behavior

Creation uses a client-side draft stored in `sessionStorage` with keys prefixed by:

```text
webman.product-creation-draft:
```

The URL uses:

- `draftProductId`: browser draft id.
- `productId`: server product id after a partial create success.

The draft stores:

- full `ProductEditorValues`;
- `hasStartedVariantSave`;
- optional `serverProductId`.

It persists after a 400 ms debounce and on `pagehide`. Recovery is blocked if the URL server product id does not match the stored draft. This is a pragmatic safety mechanism for the current non-draft backend, but it also increases local state complexity.

### Simple product creation

For a product without variants:

- `hasVariants` is false;
- `optionGroups` and `variants` are ignored by `mapProductEditorValuesToProductStructures`;
- product images are not uploaded during creation;
- modifier group links can be included;
- the final payload goes to `POST /api/v1/admin/catalog/products`;
- the admin is navigated to `/products/{id}` after success.

Current form fields include:

- category;
- title;
- description;
- price;
- old price;
- active flag;
- unit;
- display weight;
- count step;
- SKU;
- modifier group links.

There is no stock or inventory field in the current product or variant DTOs. `quantity` appears only in order item schemas, not product management schemas.

### Product with variants creation

For a product with variants:

- `hasVariants` is true;
- option groups and variants are edited locally inside `ProductEditor`;
- the complete variant configuration is sent in one replace request after the base product is saved.

Variant mode is controlled by a checkbox in `ProductEditor`. Enabling it does not create server-side draft entities. It only reveals local option and variant sections.

Option groups are represented by `ProductEditorOptionGroupValues`:

- `code`;
- `title`;
- `sortOrder`;
- local `values`.

Option values are represented by:

- `code`;
- `title`;
- `sortOrder`.

During create, option groups and option values do not have ids. The mapper sends them by code through `ReplaceProductVariantConfigurationRequest`.

Variants are represented by `ProductEditorVariantValues`:

- `id`;
- `externalId`;
- `sku`;
- `title`;
- `price`;
- `oldPrice`;
- `images`;
- `sortOrder`;
- `isActive`;
- `options`, by option group code and option value code.

Variant images can be uploaded from the create editor. They use:

- `POST /api/v1/admin/media/uploads`;
- direct `PUT` to storage upload URL;
- `POST /api/v1/admin/media/uploads/{uploadId}/complete`.

For new variants, uploads are initialized with `targetType: 'VARIANT'` and `targetId: variantEditorState.draft.id`, which is usually `null` until the product and variant exist. The uploaded image ids are then stored in the local variant draft and included in the replace configuration payload.

There is no automatic variant combination generation in the current UI. Admins manually create each variant and select one option value per group. The variant table only displays heuristic `color` and `size` columns based on matching option group code/title, so products with other option groups are not fully visible in the table.

### Modifiers during creation

Modifiers are not created inside the product form. Existing reusable modifier groups are loaded through `getAllModifierGroups()` and linked in `ProductEditor`.

Each product modifier link stores:

- `modifierGroupId`;
- `sortOrder`;
- `isActive`.

The mapper enriches links with group metadata from the loaded modifier group list, then `saveProduct` sends only `modifierGroupId`, `sortOrder`, and `isActive` in `UpsertProductModifierGroupLinkRequest`.

### Validation errors during creation

Validation is mostly page-level and returns the first error string:

- basic product validation is in `ProductCreatePage`;
- variant validation is in `validateProductVariantsSection`;
- modifier link validation is in `validateProductModifierGroupsSection`.

Errors are displayed as `AdminNotice` near the final save area rather than field-level errors, although `FormField` supports an `error` prop.

### Local draft state that becomes one large payload

The main large local payload is `ProductEditorValues`. It contains:

- base product fields;
- `hasVariants`;
- all option groups;
- all option values;
- all variant rows;
- all variant image references;
- all modifier group links.

`ProductEditor` also keeps hidden local editor state that is not part of `ProductEditorValues` until confirmed or submitted:

- `optionGroupEditorState`;
- `variantEditorState`;
- `variantImageUploadError`;
- `isVariantImageUploading`.

On submit, `ProductEditor` folds open option/variant editor drafts into the submitted form through `buildSubmitValues`.

### Current stale or inconsistent state risks

- Open option group or variant editor drafts are not stored in the creation `sessionStorage` draft until the admin confirms the local editor or submits the full product form.
- Toggling `hasVariants` off hides existing local option groups and variants but does not clear them from `ProductEditorValues`; toggling back on can revive stale hidden data.
- `syncVariantOptionsByOptionGroups` rewrites variant option selections when option groups change. This avoids some invalid selections, but can silently clear or change selections.
- Product and variant images are uploaded before the full product save. A failed or abandoned create can leave uploaded media that is not clearly attached to a finalized variant.
- The create flow relies on `hasStartedVariantSave` to decide whether to keep using replace configuration on retries. That is correct for recovery, but it is another local state flag that affects API behavior.
- The full replace configuration request is based on the frontend's local snapshot. A stale local snapshot can overwrite option/value/variant changes made elsewhere.
- Only the first validation error is shown, and it is not anchored to the field or row that needs attention.

## Current Product Editing Flow

### Routes and entry points

Product editing is already split across several route-level screens:

- `/products/:productId`: `src/pages/catalog/product-details/ui/ProductDetailsPage.tsx`
- `/products/:productId/option-groups/:optionGroupId`: `src/pages/catalog/product-option-group-details/ui/ProductOptionGroupDetailsPage.tsx`
- `/products/:productId/variants/:variantId`: `src/pages/catalog/product-variant-details/ui/ProductVariantDetailsPage.tsx`

The routes are configured in `src/app/router/AppRouter.tsx`.

### Loading an existing product

`ProductDetailsPage` loads:

- `getProductById(productId)`;
- `getCategories()`;
- `getAllModifierGroups()`.

`getProductById` first tries:

- `GET /api/v1/admin/products/{productId}`;

then falls back to active and inactive product list endpoints if details loading fails:

- `GET /api/v1/admin/catalog/products?isActive=true`;
- `GET /api/v1/admin/catalog/products?isActive=false`.

The details response includes:

- base product fields;
- `isConfigured`;
- `defaultVariantId`;
- option groups;
- modifier groups with options;
- variants.

The current frontend domain type drops `isConfigured`, so the UI cannot use it for publish readiness yet.

### Editing base product fields

`ProductDetailsPage` builds `ProductDetailsFormValues` from the loaded product. That form includes:

- category;
- title;
- description;
- price;
- old price;
- active flag;
- unit;
- count step;
- SKU;
- modifier group links.

On save, it calls `saveProduct` without `replaceVariantConfiguration`. Existing option groups and variants are kept in local `product` state but are not sent through the base product request. Modifier group links are saved as part of the base product upsert.

This means product details currently has a partial save for base fields and modifier links, but it is still implemented as a page-local form with manual mapping and validation.

### Editing images

Product images are edited directly on `ProductDetailsPage`:

- upload uses media upload session APIs;
- delete uses `DELETE /api/v1/admin/catalog/products/{productId}/images/{imageId}`;
- local `product.images` is updated after upload/delete.

Variant images are edited on `ProductVariantDetailsPage`:

- upload uses media upload session APIs with `targetType: 'VARIANT'`;
- delete uses `DELETE /api/v1/admin/products/{productId}/variants/{variantId}/images/{imageId}`;
- local `variant.images` is updated after upload/delete.

Image deletion is immediate and currently has no explicit confirmation.

### Editing option groups and option values

`ProductOptionGroupDetailsPage` loads both:

- `getProductById(productId)`;
- `getProductOptionGroupById(productId, optionGroupId)`.

The page edits group fields and values locally. It validates:

- group code/title/sort order;
- group code uniqueness against sibling groups;
- value code/title/sort order;
- value code uniqueness;
- prevents removing option values currently selected by variants.

Despite having API wrappers for `saveProductOptionGroup` and `saveProductOptionValue`, this page currently saves by rebuilding the full product variant configuration and calling:

```ts
saveProduct(nextProduct, {
  replaceVariantConfiguration: true,
});
```

That invokes `PUT /api/v1/admin/products/{productId}/variant-configuration`, replacing all option groups, option values, variants, and links.

### Editing variants

`ProductVariantDetailsPage` loads:

- `getProductById(productId)`;
- `getProductVariantById(productId, variantId)`.

The variant form includes:

- external id;
- SKU;
- title;
- price;
- old price;
- sort order;
- active flag;
- selected option value by option group.

Saving uses the incremental wrapper:

- `POST /api/v1/admin/products/{productId}/variants`

through `saveProductVariant`.

The UI can deactivate a variant, but there is no delete/remove variant action. There is no bulk edit.

### Editing modifiers

Reusable modifier group definitions are managed separately:

- `/modifier-groups`
- `/modifier-groups/new`
- `/modifier-groups/:modifierGroupId`
- `/modifier-groups/:modifierGroupId/options/new`
- `/modifier-groups/:modifierGroupId/options/:optionId`

Product modifier assignments are edited in `ProductDetailsPage` and saved with the base product upsert. There is no dedicated product modifier assignment endpoint in current frontend usage.

### Current edit support matrix

| Capability | Current support |
| --- | --- |
| Change simple product into product with variants | Not supported in the UI. Product details has no action to add option groups or variants to a simple product. |
| Edit existing variant options | Partially supported through option group detail route. Save still replaces the full variant configuration. |
| Edit existing option values | Partially supported through option group detail route. Removing values used by variants is blocked client-side. |
| Edit existing variants | Supported through variant detail route and incremental variant upsert. |
| Edit modifiers | Supported as product modifier group links on product details; modifier definitions are separate. |
| Remove variants | Not supported. Variants can be deactivated. |
| Disable variants | Supported through variant active flag. |
| Preserve existing order/cart safety | Not explicitly represented in the UI. Client prevents removing option values used by current variants, but order/cart safety is a backend dependency. |
| Partial saves per section | Partially supported for base product, media, and individual variants. Option group/value edits still use full replace. Modifier assignments save with base product. |

## Current UX/UI Screens

### Product list

Files:

- `src/pages/catalog/products/ui/ProductsPage.tsx`
- `src/pages/catalog/products/ui/ProductFilters.tsx`
- `src/pages/catalog/products/ui/ProductTable.tsx`

Structure:

- page header with status, create link, refresh button;
- active/inactive filter and search;
- product table with SKU, title, category, and price;
- localStorage snapshot cache split by active/inactive filter.

Limitations:

- no product type indicator;
- no variant count;
- no publish readiness or configured status, despite `isConfigured` existing in backend schema;
- no draft state;
- no stock or inventory columns;
- cached snapshots can become stale.

### Product create page

File:

- `src/pages/catalog/product-create/ui/ProductCreatePage.tsx`

Structure:

- breadcrumbs;
- page header;
- summary stat cards for price/category/unit/modifiers;
- warnings for loading/recovery/draft persistence;
- lazy-loaded `ProductEditor`.

The create page is a single large flow. Simple product and variant product creation share the same form and final submit button.

### Product editor

Files:

- `src/features/product-editor/ui/ProductEditor.tsx`
- `src/features/product-editor/model/productEditor.ts`

Sections:

- basic fields;
- active flag;
- variant mode flag;
- option groups table and inline/drawer editor;
- variants table and inline/drawer editor;
- modifier group links;
- description;
- final save card.

The component is about 1700 lines and handles rendering, local drafts, validation-adjacent synchronization, media uploads, table definitions, modal/drawer behavior, and submit composition.

### Product edit page

File:

- `src/pages/catalog/product-details/ui/ProductDetailsPage.tsx`

Sections:

- stats cards;
- product media;
- base product form;
- modifier group link table;
- option group list;
- variant list;
- page-level notices.

The page copy says product editing is separated from option groups and variants. That is directionally good, but the screen is still a long page and does not provide a workspace navigation model or publish checklist.

### Option group details page

File:

- `src/pages/catalog/product-option-group-details/ui/ProductOptionGroupDetailsPage.tsx`

Sections:

- group stats;
- group field form;
- option values table;
- save/reset controls.

The page appears incremental, but save currently performs a full variant configuration replace.

### Variant details page

File:

- `src/pages/catalog/product-variant-details/ui/ProductVariantDetailsPage.tsx`

Sections:

- variant stats;
- variant field form;
- option value selection table;
- variant media;
- save/reset controls.

This is the closest current screen to the target incremental editing model.

### Modifier screens

Files:

- `src/pages/catalog/modifier-groups/ui/ModifierGroupsPage.tsx`
- `src/pages/catalog/modifier-group-details/ui/ModifierGroupDetailsPage.tsx`
- `src/features/modifier-group-editor/ui/ModifierGroupEditor.tsx`

Modifier groups are already treated as reusable catalog entities. Product forms only link to existing groups. This should remain the target model.

### Reusable UI components available

The target flow should reuse existing shared UI:

- `AdminPage`;
- `AdminPageHeader`;
- `AdminPageStatus`;
- `AdminSectionCard`;
- `AdminEmptyState`;
- `AdminNotice`;
- `Button`;
- `FormField`;
- `Input`;
- `PriceInput`;
- `LazyDataTable`;
- `Badge`;
- `Dialog`;
- `Sheet`;
- `SegmentedControl`;
- `ResourceFilters`.

## Current UX/UI Problems

- The create screen has too many responsibilities and too much nested form state.
- The product type decision is a checkbox inside the main form instead of a managed product configuration workflow.
- A simple product cannot be converted to a variant product through the edit UI.
- Option groups, values, variants, and modifier links are mixed into one large create form.
- The create flow does not preview generated combinations because generation does not exist.
- Variant creation is manual and repetitive.
- There is no bulk edit for variant price, activity, sort order, or future stock fields.
- Variant table columns only show inferred color and size, not all option dimensions.
- Product images are unavailable during create, while variant images are available during create.
- Validation returns one page-level error instead of row-level and field-level feedback.
- The browser recovery draft is invisible as a concept until there is a warning.
- Open option/variant editor drafts can be lost on refresh because they are not stored in the main creation draft.
- Toggling variant mode off hides option and variant state without clearing it.
- There is no publish readiness checklist.
- There is no explicit "save this section" pattern in create.
- Disabled and loading states exist, but they are page-specific and not consistently modeled.
- Destructive or high-impact actions such as image deletion and local option/variant deletion have limited or no confirmation.
- Modifier groups are conceptually separate, but create UI still places modifier assignment alongside variant setup without strong workflow separation.

## Current Frontend Architecture

### Product-related modules

Entity layer:

- `src/entities/product/model/types.ts`
- `src/entities/product/api/productApi.ts`
- `src/entities/product/lib/formatters.ts`
- `src/entities/product/lib/image.ts`
- `src/entities/modifier-group/*`
- `src/entities/category/*`

Feature layer:

- `src/features/product-editor/model/productEditor.ts`
- `src/features/product-editor/ui/ProductEditor.tsx`

Page layer:

- `src/pages/catalog/products/*`
- `src/pages/catalog/product-create/*`
- `src/pages/catalog/product-details/*`
- `src/pages/catalog/product-option-group-details/*`
- `src/pages/catalog/product-variant-details/*`
- `src/pages/catalog/modifier-groups/*`
- `src/pages/catalog/modifier-group-details/*`
- `src/pages/catalog/modifier-option-details/*`

Shared layer:

- `src/shared/api/client.ts`
- `src/shared/api/schema.d.ts`
- `src/shared/lib/money/price.ts`
- `src/shared/lib/media/images.ts`
- `src/shared/lib/uuid/isUuid.ts`
- `src/shared/ui/*`

### Components with too many responsibilities

`ProductEditor.tsx` is the largest concentration of responsibility:

- renders base product fields;
- renders modifier assignment UI;
- renders variant option group UI;
- renders variant UI;
- owns local option group editor draft;
- owns local variant editor draft;
- uploads variant images;
- handles drawer/inline behavior;
- synchronizes variant options when option groups change;
- builds submitted values by merging open local drafts.

`ProductCreatePage.tsx` also owns a lot:

- loading reference data;
- draft recovery;
- URL recovery validation;
- draft persistence;
- base validation;
- mapping to `Product`;
- save orchestration and retry behavior.

`ProductDetailsPage.tsx` repeats validation, image upload/delete, modifier link mapping, and base product save logic instead of reusing product form primitives.

`ProductOptionGroupDetailsPage.tsx` duplicates integer parsing and validation patterns and saves through full product replacement.

`ProductVariantDetailsPage.tsx` repeats image upload/delete and numeric validation patterns.

### Duplicated logic

- price parsing and validation around product and variant forms;
- integer parsing for sort order and count step;
- modifier group assignment validation;
- product/variant image upload flow;
- product/variant image delete flow;
- active status badge styling;
- category option loading;
- field reset/save success/error state handling.

### Logic that should be isolated

- product basic information mapper;
- product pricing/default variant mapper;
- modifier assignment mapper;
- variant option/value mapper;
- replace configuration mapper;
- incremental variant mapper;
- product editor validation utilities;
- variant generation utilities;
- image upload service hooks.

## Current Admin API Usage

### Product endpoints used

| Purpose | Current method |
| --- | --- |
| Product list | `GET /api/v1/admin/catalog/products?isActive=...` |
| Product create/update base fields | `POST /api/v1/admin/catalog/products` |
| Product details | `GET /api/v1/admin/products/{productId}` |
| Product option group details | `GET /api/v1/admin/products/{productId}/option-groups/{optionGroupId}` |
| Product option group upsert wrapper | `POST /api/v1/admin/products/{productId}/option-groups` |
| Product option value upsert wrapper | `POST /api/v1/admin/products/{productId}/option-groups/{optionGroupId}/values` |
| Product variant details | `GET /api/v1/admin/products/{productId}/variants/{variantId}` |
| Product variant upsert | `POST /api/v1/admin/products/{productId}/variants` |
| Replace all variant config | `PUT /api/v1/admin/products/{productId}/variant-configuration` |
| Delete product image | `DELETE /api/v1/admin/catalog/products/{productId}/images/{imageId}` |
| Delete variant image | `DELETE /api/v1/admin/products/{productId}/variants/{variantId}/images/{imageId}` |
| Init media upload | `POST /api/v1/admin/media/uploads` |
| Complete media upload | `POST /api/v1/admin/media/uploads/{uploadId}/complete` |

The schema describes `PUT /api/v1/admin/products/{productId}/variant-configuration` as replacing all option groups, option values, variants, and variant option links for the product. This endpoint is the main legacy coupling point.

### Category endpoints used

| Purpose | Current method |
| --- | --- |
| Category list | `GET /api/v1/admin/catalog/categories?isActive=...` |
| Category details | `GET /api/v1/admin/catalog/categories/{categoryId}` |

Product create and edit need category lists for category selection.

### Modifier endpoints used

| Purpose | Current method |
| --- | --- |
| Modifier group list | `GET /api/v1/admin/catalog/modifier-groups?isActive=...` |
| Modifier group save | `POST /api/v1/admin/catalog/modifier-groups` |
| Modifier options list | `GET /api/v1/admin/catalog/modifier-groups/{groupId}/options?isActive=...` |
| Modifier option details | `GET /api/v1/admin/catalog/modifier-groups/{groupId}/options/{optionId}` |
| Modifier option save | `POST /api/v1/admin/catalog/modifier-groups/{groupId}/options` |

Product modifier assignments are not a dedicated endpoint. They are saved in `UpsertProductRequest.modifierGroups`.

### Current API coupling issues

- Create with variants is coupled to a full replace variant configuration payload.
- Option group details page still uses full replace even though limited option group/value upsert wrappers exist.
- Base product save and activation are the same `POST /catalog/products` operation.
- Product details returns `isConfigured`, but the frontend model discards it.
- There is no frontend-facing draft product API.
- There is no publish endpoint separate from `isActive`.
- There is no bulk variant update endpoint.
- There is no variant generation endpoint.
- There is no product-level stock/inventory API in current schemas.
- There is no explicit delete/deactivate API for option groups or option values.
- There is no dedicated product modifier assignment endpoint.

## Main Technical Problems

1. The create flow treats product data, options, values, variants, variant images, and modifier assignments as one nested local form.
2. The current browser draft is necessary for safety but duplicates what should be server-side draft workspace state.
3. Validation is tightly coupled to the shape of `ProductEditorValues`.
4. DTO mapping is split between page code, product editor model code, and entity API code.
5. Full replace variant configuration can overwrite stale server state.
6. The edit flow is visually split but not consistently backed by incremental APIs.
7. There is no product workspace model with section-level loading, error, dirty, and saved states.
8. There are no tests protecting mappers, validation, or stale state edge cases.
9. Current UI does not support simple product to variants conversion.
10. Future additions such as stock, publish checklist, variant generation, and bulk editing will further increase complexity if added to `ProductEditor`.

## Target UX Flow

Prefer a draft-based product workspace:

```text
Product list
-> Create product draft
-> Product workspace
-> Complete sections
-> Publish
```

### Product list

The product list should remain at `/products`, but eventually show:

- active/draft/published status;
- configured/readiness status;
- product type: simple or variants;
- category;
- price range or default price;
- variant count;
- optional stock summary when backend supports stock.

### Create product draft

`/products/new` should become a minimal draft creation screen.

Required inputs should be minimal:

- title;
- category;
- optional product type starting point;
- optional initial active/publish intent, if backend supports draft status separately.

The action creates a server-side draft/inactive product and redirects to the product workspace.

Until backend draft APIs exist, this route can keep the current create flow or create an inactive base product through existing `saveProduct`, behind a feature flag.

### Product workspace

`/products/:productId` should evolve into a workspace with clear sections:

- Basic information;
- Media;
- Price and stock;
- Variants;
- Modifiers;
- Publishing/checklist.

Each section should:

- read from the latest product snapshot;
- own only its local form fields while editing;
- save independently;
- show loading/saving/error/success states;
- refetch or update the product snapshot after mutation;
- never rely on hidden parent form state for final payload mapping.

### Variant workflow

The target variants flow should support:

1. Enable variants for a simple product.
2. Add variant option groups independently.
3. Add option values independently.
4. Preview combinations before creating variants.
5. Generate selected combinations.
6. Edit variants in a table.
7. Bulk edit price, stock, active state, and sort order.
8. Open a variant drawer for detailed edit and images.
9. Deactivate rather than delete when order/cart safety requires it.

Option/value management and variant row management should be separate. Changing option definitions should not require rebuilding unrelated variants from a stale frontend snapshot.

### Modifier workflow

Modifiers should stay separate from variants:

- modifier groups are reusable catalog definitions;
- product workspace assigns existing groups to a product;
- group creation/editing remains in the modifier catalog;
- product assignment settings control sort order and active state;
- future assignment endpoint should allow saving modifier links without re-saving base product fields.

### Publishing workflow

Publishing should be explicit and backed by a readiness checklist:

- basic information complete;
- category selected;
- media present if required;
- price/default variant valid;
- variants configured if variants are enabled;
- required modifier groups valid;
- no invalid inactive dependencies;
- stock configured when backend supports it.

Activation should not be used as the only proxy for publish readiness.

## Target Screen Structure

Keep current route conventions, but split implementation behind route-level pages and feature modules.

Recommended target routes:

- `/products`: `ProductsPage`
- `/products/new`: `ProductDraftCreatePage` or migrated `ProductCreatePage`
- `/products/:productId`: `ProductWorkspacePage`
- `/products/:productId/variants/:variantId`: keep as compatibility route or redirect to workspace variant drawer
- `/products/:productId/option-groups/:optionGroupId`: keep as compatibility route during migration

Recommended module structure:

```text
src/pages/catalog/product-workspace/
  ui/ProductWorkspacePage.tsx
  model/productWorkspacePage.ts

src/features/product-basic-information/
  model/basicInformationForm.ts
  ui/BasicInformationSection.tsx

src/features/product-media/
  model/productMedia.ts
  ui/ProductMediaSection.tsx

src/features/product-pricing/
  model/productPricingForm.ts
  ui/ProductPricingSection.tsx

src/features/product-variants/
  model/variantOptions.ts
  model/variantGeneration.ts
  model/variantValidation.ts
  ui/ProductVariantsSection.tsx
  ui/VariantOptionsPanel.tsx
  ui/VariantOptionDrawer.tsx
  ui/VariantOptionValueDrawer.tsx
  ui/VariantGenerationPreview.tsx
  ui/ProductVariantsTable.tsx
  ui/VariantEditDrawer.tsx
  ui/VariantBulkEditToolbar.tsx

src/features/product-modifier-assignments/
  model/productModifierAssignments.ts
  ui/ProductModifierGroupsSection.tsx
  ui/ModifierGroupPicker.tsx
  ui/ProductModifierAssignmentSettings.tsx

src/features/product-publishing/
  model/productPublishingChecklist.ts
  ui/ProductPublishingSection.tsx

src/entities/product/
  api/productApi.ts
  api/productDraftApi.ts
  api/productVariantApi.ts
  model/types.ts
  model/dto.ts
  lib/mappers.ts
  lib/validation.ts
```

This structure should be adjusted during implementation to avoid over-fragmenting too early. The first extraction should prioritize shared validation, mappers, and upload helpers that already have multiple real use cases.

## Target Component Architecture

### Workspace shell

`ProductWorkspacePage` should own:

- product id route validation;
- product snapshot loading;
- section navigation state;
- product-level error state;
- refetch/invalidation coordination;
- publish readiness summary.

It should not own a giant editable `ProductEditorValues` object.

### Section components

Each section should receive:

- product snapshot or the specific section model;
- saving state;
- last saved/error state;
- callbacks for save/refetch.

Each section should own:

- only local form input state for that section;
- dirty tracking for that section;
- field-level validation;
- reset-to-server behavior.

### Drawers and dialogs

Use existing `Sheet` or existing drawer patterns for:

- variant option group create/edit;
- option value create/edit;
- variant edit;
- generation preview;
- bulk edit confirmation;
- destructive/high-impact confirmations.

Destructive or high-impact actions should use `Dialog`/confirmation, not silent local removal.

### Tables

Use `LazyDataTable` for:

- variants table;
- option values table;
- modifier assignment table;
- publish checklist table if useful.

The variants table should not hardcode color/size. It should generate option columns from product option groups or provide a compact options summary plus filters.

## Target State Management Approach

### Server state

Server should be the source of truth for:

- product identity and status;
- basic product data;
- product images;
- default/simple price and future stock;
- variant mode/configuration state;
- option groups;
- option values;
- variants;
- variant images;
- modifier assignments;
- publish readiness.

The frontend should load a product snapshot and update it through section mutations.

Current project does not use TanStack Query or another server-state dependency. Because new production dependencies require approval, the first implementation can use a small internal hook pattern:

- `useProductSnapshot(productId)`;
- `reloadProductSnapshot()`;
- section mutation hooks returning `{ isSaving, error, save }`;
- request id guards for stale responses, matching existing page patterns.

If dependency approval is granted later, TanStack Query would simplify query invalidation and mutation state, but it should not be introduced silently.

### Local UI state

Local state should be limited to:

- active workspace section/tab;
- drawer open/closed state;
- current section form fields;
- row selection for bulk edit;
- generation preview selections;
- transient upload progress;
- field-level validation errors;
- unsaved changes prompts.

Local state should not store the entire product graph for final submission.

### Draft state

Target draft state should live on the server. A frontend browser draft should only be a temporary compatibility fallback while backend draft APIs are missing.

For target APIs:

- creating a product starts with `createProductDraft`;
- every section save persists immediately;
- refresh resumes from server state;
- no URL/sessionStorage mismatch logic should be needed for normal operation.

### Validation

Validation should be split by domain:

- basic product validation;
- media validation;
- default price/stock validation;
- option group validation;
- option value validation;
- variant validation;
- modifier assignment validation;
- publish readiness validation.

Validation utilities should return structured field/row errors, not only one string. Page-level strings can still be derived for notices.

## Target API Integration Approach

### Existing APIs to keep during migration

Keep these wrappers working while migration proceeds:

- `getAllProducts`;
- `getProductById`;
- `saveProduct`;
- `saveProductVariant`;
- `initProductImageUpload`;
- `uploadProductImageToStorage`;
- `completeProductImageUpload`;
- `deleteProductImage`;
- `deleteProductVariantImage`;
- `getAllModifierGroups`;
- `getCategories`.

Short term, `saveProduct` can still back basic info and modifier assignment saves.

### Existing APIs to adopt more deliberately

Current wrappers exist but are not used by product option group screens:

- `saveProductOptionGroup`;
- `saveProductOptionValue`.

Before using them broadly, verify backend behavior for:

- creating option groups on simple products;
- creating option values;
- updating option group code when variants reference old values;
- duplicate code errors;
- deleting/disabling option groups and values;
- order/cart safety.

### Future API client methods

Add these only when backend contracts exist:

- `createProductDraft`;
- `updateProductBasicInfo`;
- `updateProductMedia`;
- `updateDefaultVariant`;
- `getProductVariants`;
- `createVariantOption`;
- `updateVariantOption`;
- `deleteOrDeactivateVariantOption`;
- `createVariantOptionValue`;
- `updateVariantOptionValue`;
- `deleteOrDeactivateVariantOptionValue`;
- `assignVariantOptionToProduct`, if options are reusable beyond one product;
- `generateProductVariants`;
- `updateProductVariant`;
- `bulkUpdateProductVariants`;
- `getModifierGroups`;
- `assignModifierGroupToProduct`;
- `updateProductModifierAssignment`;
- `removeProductModifierAssignment`;
- `getProductPublishReadiness`;
- `publishProduct`;
- `unpublishProduct`.

### Integration principles

- Keep raw generated schema types out of UI components.
- Keep DTO-to-domain mappers in `entities/product`.
- Keep form-to-request mappers near the feature section when they are UI-specific, or in entity lib when shared.
- Prefer section-specific request types over passing full `Product`.
- Treat replace configuration as a legacy compatibility path only.
- Make backend validation errors mappable to field/row errors when possible.
- Preserve authentication/error handling patterns from `apiClient`.

## Refactoring Phases

### Phase 1: Audit and document current flow

Status: complete in this document.

Deliverables:

- current create flow documentation;
- current edit flow documentation;
- current UX/UI problem list;
- current API usage map;
- target plan and dependencies.

Phase 1 completion map:

| Deliverable | Documented in |
| --- | --- |
| Current create flow documentation | `Current Product Creation Flow` |
| Current edit flow documentation | `Current Product Editing Flow` |
| Current UX/UI problem list | `Current UX/UI Screens` and `Current UX/UI Problems` |
| Current API usage map | `Current Admin API Usage` |
| Target plan and dependencies | `Target UX Flow`, `Target Screen Structure`, `Target State Management Approach`, `Target API Integration Approach`, `Refactoring Phases`, and `Risks and Open Questions` |

Audited source areas:

- `src/pages/catalog/product-create/*`
- `src/features/product-editor/*`
- `src/pages/catalog/product-details/*`
- `src/pages/catalog/product-option-group-details/*`
- `src/pages/catalog/product-variant-details/*`
- `src/pages/catalog/products/*`
- `src/entities/product/*`
- `src/entities/category/*`
- `src/entities/modifier-group/*`
- `src/shared/api/schema.d.ts`
- `docs/product-creation.md`

No runtime behavior changes.

### Phase 2: Extract safe shared primitives from the current editor

Status: complete.

Goal: reduce duplication without changing UX.

Work:

- Move product basic field validation into reusable utilities.
- Move modifier assignment validation and mapping into reusable utilities.
- Move option group/value/variant validation into focused modules.
- Move form mappers out of `ProductEditor` model into explicit mapper files.
- Extract product and variant image upload helpers/hooks.
- Reuse `FormField.error` where low-risk.

Implemented:

- Product basic validation is centralized in `src/features/product-editor/model/productBasicValidation.ts`.
- Modifier assignment validation and mapping are centralized in `src/features/product-editor/model/productModifierAssignments.ts`.
- Option group, option value, and variant-section validation is centralized in `src/features/product-editor/model/productVariantValidation.ts`.
- Product editor DTO/form mappers are centralized in `src/features/product-editor/model/productEditorMappers.ts`.
- Product and variant image upload flow is shared through `src/features/product-media/model/productImageUpload.ts`.
- `ProductEditor` now uses `FormField.error` for the low-risk missing modifier group message.

Keep:

- `/products/new` behavior unchanged;
- `ProductEditor` UI structure unchanged;
- current API contracts unchanged.

Candidate files:

- `src/features/product-editor/model/productBasicValidation.ts`
- `src/features/product-editor/model/productVariantValidation.ts`
- `src/features/product-editor/model/productModifierAssignments.ts`
- `src/features/product-editor/model/productEditorMappers.ts`
- `src/features/product-media/model/productImageUpload.ts`

### Phase 3: Introduce product workspace layout behind a flag or separate route

Status: complete.

Goal: create the target shell without replacing production editing yet.

Options:

- feature flag in environment/config;
- temporary route such as `/products/:productId/workspace`;
- query flag such as `/products/:productId?workspace=1`.

Work:

- Build `ProductWorkspacePage` using existing product snapshot API.
- Add section navigation.
- Render read-only or minimally editable versions of sections.
- Keep existing `/products/:productId` as the default production edit route until parity.

No backend dependency beyond `getProductById`.

Implemented:

- added a separate route at `/products/:productId/workspace`;
- added `ProductWorkspacePage` as a read-only product workspace shell backed by the existing `getProductById` snapshot API;
- kept `/products/:productId` on the existing production `ProductDetailsPage`;
- added section navigation for basic information, media, pricing, variants, modifiers, and publishing;
- rendered current product data in read-only sections with links back to existing edit/detail screens where current production editing remains available;
- added a manual snapshot refresh control and publishing readiness checks based on currently available product fields.

### Phase 4: Split basic information, media, and price sections

Status: complete.

Goal: move low-risk sections into independent saves.

Work:

- `BasicInformationSection` saves title/category/description/unit/count step/SKU/active using current `saveProduct`.
- `ProductMediaSection` uses existing media upload/delete APIs.
- `ProductPricingSection` initially edits current product price/old price; later maps to default variant or stock APIs when available.
- Preserve current modifier links either in basic section or a separate section backed by current `saveProduct`.

Risk controls:

- Refetch product after every save.
- Keep reset-to-server button per section.
- Keep old page available until section behavior matches existing edit behavior.

Implemented:

- added section-level workspace form mapping in `src/pages/catalog/product-workspace/model/productWorkspaceForms.ts`;
- replaced read-only workspace cards with `BasicInformationSection`, `ProductMediaSection`, `ProductPricingSection`, and `ProductModifiersSection`;
- kept `/products/:productId` on the existing production editor and continued using `/products/:productId/workspace` as the new incremental route;
- saved basic information, pricing, and modifier assignments through the existing `saveProduct` API by preserving the rest of the current product snapshot;
- used existing product media upload/delete APIs for media changes and added delete confirmation in the workspace route;
- refetched the product snapshot after every section save, upload, or delete;
- added reset-to-server controls for basic information, pricing, and modifier assignment forms;
- left variants read-only in the workspace and linked to the existing option group and variant detail routes.

Deferred:

- stock editing remains unavailable because the current product snapshot/API does not expose section-level stock fields;
- default-variant price/stock mapping remains deferred until the backend exposes explicit default variant or inventory APIs.

### Phase 5: Redesign variants section incrementally

Goal: replace local nested variant graph editing with server-backed option/value/variant management.

Work:

- Add `ProductVariantsSection` to workspace.
- Show all option groups and values from product snapshot.
- Add option group and option value drawers.
- Prefer existing incremental option group/value upsert wrappers if backend behavior is verified.
- Add variant table with dynamic option columns.
- Add variant edit drawer backed by `saveProductVariant`.
- Add generation preview UI.
- Add bulk edit toolbar.

Backend dependencies:

- reliable create/update option group API;
- reliable create/update option value API;
- variant generation API or agreed client-side generation plus backend bulk create;
- bulk update variants;
- delete/deactivate semantics for variants and option values;
- order/cart safety responses.

Compatibility:

- Keep legacy full replace only for current create flow and any unsupported migration path.
- Do not use full replace for section edits once incremental APIs are available.

### Phase 6: Redesign modifiers section

Goal: keep modifier definitions separate and product assignments simple.

Work:

- Add `ProductModifierGroupsSection`.
- Add `ModifierGroupPicker`.
- Show assigned group constraints and options read-only.
- Save assignment sort order and active state independently.
- Link to modifier group editor for definition changes.

Backend dependency:

- dedicated product modifier assignment endpoints, or keep using `saveProduct` as a temporary adapter.

### Phase 7: Add publishing checklist

Goal: make publish readiness explicit.

Work:

- Preserve backend `isConfigured` in frontend product model.
- Add `ProductPublishingSection`.
- Show readiness checklist.
- Separate save from publish.
- Publish/unpublish through dedicated APIs when available.

Temporary fallback:

- active flag can remain in basic section until `publishProduct` exists, but UI should not imply that active means fully configured.

### Phase 8: Migrate product creation to server draft workspace

Goal: remove giant create submit.

Work:

- Change `/products/new` to minimal draft creation.
- Create inactive/draft product on the server.
- Redirect to `/products/:productId`.
- Move all follow-up editing into workspace section saves.
- Keep old create route behind fallback until backend draft flow is stable.

Backend dependency:

- `createProductDraft` or equivalent safe inactive product creation contract.

### Phase 9: Remove legacy giant editor path

Goal: retire `ProductEditor` once workspace has parity.

Work:

- Remove full local create graph from `/products/new`.
- Remove sessionStorage recovery draft code.
- Remove full replace variant configuration from normal UI paths.
- Keep any import/migration-specific replace API usage isolated and clearly named.

Only do this after production parity is verified.

## How to Keep Existing Creation Working During Transition

- Do not change `ProductCreatePage` behavior in early phases.
- Extract validation/mappers under existing public exports first.
- Keep `ProductEditor` props stable while internal helpers move.
- Keep `ProductCreationDraft` sessionStorage compatibility until server draft creation is the default.
- Keep `saveProduct(...replaceVariantConfiguration...)` for legacy create retries.
- Add workspace route separately before switching `/products/:productId`.
- Migrate one edit section at a time.
- Keep old option group and variant detail routes until workspace drawers support the same tasks.

## Gradual Backend API Adoption

1. Preserve current base product upsert for basic section.
2. Use existing product media endpoints for media.
3. Use existing variant upsert for individual variant edit.
4. Verify and adopt existing option group/value upsert endpoints for option management.
5. Add backend generation and bulk update APIs before building bulk variant workflows.
6. Add product draft and publish APIs before replacing `/products/new`.
7. Add modifier assignment APIs before decoupling modifier links from base product save.
8. Retire full replace variant configuration from normal admin UX.

## Testing Strategy

Current repository has no configured test script and no test dependencies. Initial verification remains `npm run build` plus manual browser checks. A proper refactor should add tests in phases, with dependency approval if new tooling is required.

### Unit tests

Add tests for pure utilities first:

- product basic form mappers;
- price and old price validation;
- count step and sort order validation;
- modifier assignment validation;
- option group/value validation;
- variant validation;
- variant combination generation;
- DTO-to-domain and form-to-request mappers;
- preservation of `isConfigured` and `defaultVariantId`.

### Component tests

Use React Testing Library if approved:

- `BasicInformationSection` save/reset/errors;
- `ProductMediaSection` upload/delete states;
- `ProductVariantsTable` dynamic option columns;
- `VariantOptionDrawer` field validation;
- `VariantGenerationPreview` combination selection;
- `VariantBulkEditToolbar`;
- `ProductModifierGroupsSection`;
- `ProductPublishingSection`.

### Integration tests

Use mocked API boundaries:

- create draft redirects to workspace;
- simple product edit saves basic section only;
- simple product to variants conversion;
- create option group, create option values, generate variants;
- edit variant option values without stale option snapshots;
- bulk update variants;
- assign/remove modifier groups;
- publish checklist blocks invalid publish.

### Regression tests for current behavior

Before replacing the old flow, cover:

- current simple product creation;
- current product with variants creation;
- recovery after base product saved but variant configuration failed;
- duplicate SKU validation;
- duplicate option group/value code validation;
- modifier duplicate assignment validation;
- variant image upload and missing image id guard;
- option value removal blocked when variants use it.

### E2E tests

Use Playwright or Cypress only after tool choice is approved:

- create product draft and publish;
- convert simple product to variants;
- generate variants from color/size options;
- edit variant price/activity;
- add modifier group assignment;
- verify product list status updates.

## Risks and Open Questions

- The requested backend refactoring document is missing locally. Frontend assumptions must be reconciled with backend owners before implementation.
- Current schemas do not expose product stock/inventory fields. Target stock UX is blocked by backend contracts.
- Current product model drops `isConfigured`; preserving it is needed for publish readiness.
- It is unclear whether existing option group/value upsert endpoints are safe enough to replace the full configuration endpoint in all edit cases.
- There are no delete/deactivate APIs for option groups or option values in current frontend usage.
- Variant delete semantics are unclear. Deactivation is safer until backend provides order/cart-safe deletion.
- Product media and variant media upload target behavior for draft/new variants needs backend confirmation.
- Introducing a server-state library would help, but new dependencies require approval.
- Full replace configuration can overwrite concurrent changes until removed from normal edit paths.
- Current browser draft recovery is complex but important. Removing it before server drafts exist would increase duplicate-product risk.
- Existing UI text is mostly Russian. New screens should follow the same language unless localization strategy changes.

## Recommended Implementation Order

1. Agree with backend on draft, publish, option/value, generation, bulk update, and safety contracts.
2. Add `isConfigured` to the frontend `Product` model and mappers.
3. Extract current validation and mappers into testable modules without changing behavior.
4. Extract reusable image upload/delete helpers.
5. Add unit tests for extracted validation and mappers.
6. Build workspace shell behind a separate route or flag.
7. Move basic information and media into section components using current APIs.
8. Move modifier assignments into a section, initially backed by current `saveProduct`.
9. Build variants section read-only, then enable incremental variant edit with existing `saveProductVariant`.
10. Adopt verified option group/value incremental APIs.
11. Add generation preview and bulk edit after backend support exists.
12. Change `/products/new` to create a server draft and redirect to workspace.
13. Add publishing checklist and publish action.
14. Remove legacy `ProductEditor` and full replace configuration from normal product management flows after parity.
