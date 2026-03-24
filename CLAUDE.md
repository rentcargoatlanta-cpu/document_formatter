# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Build & Development Commands

- `npm run dev` — start dev server (port 3000)
- `npm run build` — production build
- `npm start` — production server
- `npm run lint` — ESLint (flat config, Next.js + TypeScript rules)

No test framework is configured yet.

## Tech Stack

- **Next.js 16.2.1** (App Router) with **React 19** and **TypeScript 5** (strict mode)
- **Tailwind CSS v4** via `@tailwindcss/postcss`
- **ESLint 9** flat config format

## Critical: Next.js 16 Breaking Changes

Next.js 16 has breaking changes from prior versions. **Before writing any Next.js code**, consult the docs at `node_modules/next/dist/docs/` — especially `01-app/` for App Router APIs and conventions. Do not rely on training data for Next.js APIs.

## Architecture

- **App Router**: All routes live in `app/`. Currently a single page (`app/page.tsx`) with root layout (`app/layout.tsx`).
- **Path alias**: `@/*` maps to project root (e.g., `import X from "@/app/component"`).
- **Styling**: Tailwind v4 with `@import "tailwindcss"` and `@theme inline` in `app/globals.css`. Light/dark mode via CSS custom properties and `prefers-color-scheme`.
- **Fonts**: Geist Sans and Geist Mono loaded via `next/font/google`, exposed as CSS variables `--font-geist-sans` and `--font-geist-mono`.
