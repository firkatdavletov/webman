# Repository Guidelines

## Project Structure & Module Organization

This repository contains a React 18 admin application for online store built with TypeScript, Vite, and Tailwind CSS. 
The admin app is used to manage products, categories, orders, customers, delivery settings, payments, banners, and store content.Application code lives under `src/` and follows a feature-sliced layout:

- `src/app/`: application shell and routing.
- `src/pages/`: route-level screens.
- `src/widgets/`: reusable, page-scale UI compositions.
- `src/features/`: user-facing workflows and editors.
- `src/entities/`: domain types, API clients, and formatters.
- `src/shared/`: generic UI, API, configuration, and utility code.

Static files belong in `public/`; production output is generated in `dist/`. Prefer public imports through each module's `index.ts`, and use the `@/` alias for `src/` imports.

## Working rules

- Before making changes, inspect the existing architecture and follow current project conventions.
- Prefer small, focused changes over large rewrites.
- Do not introduce new production dependencies without explicit approval.
- Keep API DTOs separate from UI models when possible.
- Preserve strict TypeScript typing. Avoid `any` unless there is a clear reason.
- Handle loading, error, empty, and success states for user-facing admin screens.
- Destructive actions must have confirmation.
- Do not expose secrets, tokens, or private customer data in logs.
- Reuse existing UI components before creating new ones.
- Keep Tailwind usage consistent with the existing design system.

## Build, Test, and Development Commands

Requires Node.js 20 or newer.

- `npm install`: install exact dependencies from `package-lock.json`.
- `npm run dev`: start the Vite development server.
- `npm run build`: run strict TypeScript checks, then create the production bundle.
- `npm run preview`: serve the built bundle locally for verification.
- `npm start`: serve `dist/` through `server.js`.
- `npm run api:gen`: regenerate `src/shared/api/schema.d.ts`; update its machine-specific OpenAPI input path before use.

No automated test script is currently configured. At minimum, run `npm run build` before submitting changes and manually verify affected flows in the browser.

## Coding Style & Naming Conventions

Use TypeScript and functional React components. Match the existing style: two-space indentation, single quotes, semicolons, trailing commas, and named exports for module APIs. Use `PascalCase` for components and types, `camelCase` for functions and variables, and `UPPER_SNAKE_CASE` for constants. Keep domain logic in `model/` or `lib/`, API calls in `api/`, and rendering in `ui/`.

TypeScript is strict and rejects unused locals, unused parameters, and switch fallthrough. Do not edit generated API schema types manually.

## Commit & Pull Request Guidelines

Recent commits use short, descriptive summaries, commonly in Russian, without Conventional Commit prefixes. Keep each commit focused and describe the completed behavior, for example: `Добавил фильтры промокодов`.

Pull requests should explain the user-visible change, identify affected routes or modules, and note verification performed. Link relevant issues and include screenshots or recordings for UI changes. Call out configuration, API schema, or deployment changes explicitly.

## Configuration & Security

Copy `.env.example` for local configuration. Never commit `.env` files, credentials, tokens, or production endpoints. Treat `public/env.js` and `amvera.yaml` as deployment-sensitive files and review changes carefully.
