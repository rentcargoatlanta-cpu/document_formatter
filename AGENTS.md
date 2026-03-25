# Agents

All work in this project is parallelized across multiple agents. Each agent follows its role-specific rules below plus the shared rules.

## Shared Rules (ALL agents)

<!-- BEGIN:shared-agent-rules -->
- This is a **Next.js 16** project with breaking changes. Read `node_modules/next/dist/docs/` before writing any Next.js code. Do not rely on training data.
- TypeScript strict mode is enabled — no `any` types without justification.
- Prefer server components by default; only use `"use client"` when client-side interactivity requires it.
- Path alias: use `@/*` for imports (maps to project root).
- **No git usage.** Agents must NOT run any git commands (commit, push, pull, checkout, merge, etc.). All git operations are handled manually by the user.
- When your task is done, report back a concise summary of what you created/changed and any decisions you made.
<!-- END:shared-agent-rules -->

## UI Agent

<!-- BEGIN:ui-agent-rules -->
**Scope**: React components, pages, layouts, client-side interactivity.

- Always check shadcn/ui registry via MCP (`mcp__shadcn__search_items_in_registries`) before building custom components.
- Follow the project's Tailwind v4 setup — use `@theme inline` custom properties, not arbitrary values.
- Respect light/dark mode via `prefers-color-scheme` and CSS custom properties in `globals.css`.
- Components go in `app/components/` (colocated) or `components/` (shared).
- Mark components `"use client"` only when they need browser APIs, event handlers, or hooks.
<!-- END:ui-agent-rules -->

## API Agent

<!-- BEGIN:api-agent-rules -->
**Scope**: Server actions, API routes, data fetching, middleware.

- Server actions go in colocated files or `app/actions/`.
- API routes go in `app/api/[route]/route.ts`.
- Always validate inputs at the boundary. Use TypeScript types for internal data flow.
- Read Next.js 16 docs on Route Handlers and Server Actions before writing anything — the API has changed.
- Never expose file system paths or internal errors to the client.
<!-- END:api-agent-rules -->

## Processing Agent

<!-- BEGIN:document-agent-rules -->
**Scope**: Document parsing, formatting, transformation logic.

- Documents live in `documents/` directory.
- When processing documents, never modify the original file — always create derived outputs.
- Support PDF format as a primary input type.
- Processing logic goes in `lib/` or `lib/processing/`.
- Keep processing logic framework-agnostic (no React/Next.js imports) so it can run in server actions or API routes.
<!-- END:document-agent-rules -->

## Styling Agent

<!-- BEGIN:styling-agent-rules -->
**Scope**: Tailwind classes, responsive design, theming, animations, layout polish.

- Use Tailwind v4 utilities. Global theme tokens are in `app/globals.css` under `@theme inline`.
- Responsive breakpoints: mobile-first (`sm:`, `md:`, `lg:`).
- Dark mode uses `prefers-color-scheme` — use CSS custom properties, not `dark:` variants unless needed.
- Do not add new CSS files unless absolutely necessary — prefer Tailwind utilities.
<!-- END:styling-agent-rules -->

## Quality Agent

<!-- BEGIN:quality-agent-rules -->
**Scope**: Runs AFTER all code-writing agents complete. Reviews, lints, typechecks.

- Run `npm run lint` and fix any errors.
- Run `npx tsc --noEmit` and fix any type errors.
- Review all changes from other agents for:
  - Conflicting imports or duplicate code
  - Missing `"use client"` directives where needed
  - Inconsistent naming or patterns
  - Security issues (exposed secrets, unsanitized input)
- Report a summary of issues found and fixed.
<!-- END:quality-agent-rules -->

## Research Agent

<!-- BEGIN:research-agent-rules -->
**Scope**: Read docs, explore codebase, find examples. Read-only — does NOT write code.

- Primary source of truth for Next.js APIs: `node_modules/next/dist/docs/`
- Use Explore agent type for broad codebase understanding.
- Use shadcn MCP to find relevant UI components and their usage patterns.
- Return findings as a concise brief that other agents can act on.
<!-- END:research-agent-rules -->
