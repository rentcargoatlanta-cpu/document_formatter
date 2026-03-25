# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Build & Development Commands

- `npm run dev` — start dev server (port 3000)
- `npm run build` — production build
- `npm start` — production server
- `npm run lint` — ESLint (flat config, Next.js + TypeScript rules)

No test framework is configured yet.

## CI/CD

GitHub Actions workflows live in `.github/workflows/`:

- **ci.yml** — Runs on every push/PR to `main`. Three jobs:
  1. **Lint** — `npm run lint`
  2. **Type Check** — `npx tsc --noEmit`
  3. **Build** — `npm run build` (runs after lint + typecheck pass, uploads `.next/` artifact)
- **deploy.yml** — Runs on push to `main` or manual dispatch. Build + deploy to production. Deploy target is not yet configured — see comments in the workflow for Vercel setup instructions.

Required secrets for Vercel deploy: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

## Tech Stack

- **Next.js 16.2.1** (App Router) with **React 19** and **TypeScript 5** (strict mode)
- **Tailwind CSS v4** via `@tailwindcss/postcss`
- **ESLint 9** flat config format
- **shadcn/ui** — use the shadcn MCP tools to search, browse, and add components

## Critical: Next.js 16 Breaking Changes

Next.js 16 has breaking changes from prior versions. **Before writing any Next.js code**, consult the docs at `node_modules/next/dist/docs/` — especially `01-app/` for App Router APIs and conventions. Do not rely on training data for Next.js APIs.

## Architecture

- **App Router**: All routes live in `app/`. Currently a single page (`app/page.tsx`) with root layout (`app/layout.tsx`).
- **Path alias**: `@/*` maps to project root (e.g., `import X from "@/app/component"`).
- **Styling**: Tailwind v4 with `@import "tailwindcss"` and `@theme inline` in `app/globals.css`. Light/dark mode via CSS custom properties and `prefers-color-scheme`.
- **Fonts**: Geist Sans and Geist Mono loaded via `next/font/google`, exposed as CSS variables `--font-geist-sans` and `--font-geist-mono`.
- **Documents**: User-uploaded documents are stored in `documents/`.

## MCP Servers

The following MCP servers are configured in `.claude/settings.json`:

- **shadcn** — Browse, search, and get install commands for shadcn/ui components. Use `mcp__shadcn__search_items_in_registries` to find components, `mcp__shadcn__view_items_in_registries` to inspect them, and `mcp__shadcn__get_add_command_for_items` to get the install command.
- **memory** — Persistent knowledge graph for storing entities, observations, and relations across conversations. Use `mcp__memory__create_entities` and `mcp__memory__add_observations` to save context, `mcp__memory__search_nodes` to recall it.

## Hooks

Hooks are configured in `.claude/settings.json` to automate repetitive checks:

- **pre-commit**: Runs `npm run lint` before every commit to catch lint errors early.
- **post-build**: After `npm run build`, logs build completion status.

## Parallel Agent Execution (MANDATORY)

**All tasks in this project MUST be parallelized across multiple agents.** When given any task, break it into independent work streams and launch agents concurrently. Never work sequentially when parallel execution is possible.

### How to Parallelize

1. **Analyze the task** — Identify independent pieces of work that don't depend on each other's output.
2. **Launch agents simultaneously** — Use the Agent tool with multiple tool calls in a single message. Use `isolation: "worktree"` for agents that write code so they don't conflict.
3. **Merge results** — After agents complete, integrate their work into the main branch.

### Agent Roles

Break any feature into these work streams (use whichever are relevant):

| Agent | Role | Isolation |
|-------|------|-----------|
| **UI Agent** | Components, pages, layouts. Uses shadcn MCP. Follows `ui-agent-rules`. | worktree |
| **API Agent** | Server actions, API routes, data fetching logic. | worktree |
| **Processing Agent** | Document parsing, formatting, transformation logic. | worktree |
| **Styling Agent** | Tailwind classes, responsive design, theming, animations. | worktree |
| **Quality Agent** | Lint, typecheck, test, review after other agents finish. | none |
| **Research Agent** | Read Next.js 16 docs, explore codebase, find examples. | none |

### Parallelization Rules

- **Minimum 2 agents** for any non-trivial task. Prefer 3-5 when the work allows it.
- **Research agents run first** when the task involves unfamiliar APIs — launch a research agent alongside a planning agent, then fan out implementation agents.
- **Quality agent runs last** — after all code-writing agents complete, launch a quality agent to lint, typecheck, and review.
- **Use worktrees** for all code-writing agents so they get isolated copies of the repo and can't conflict.
- **Read-only agents** (research, explore, review) don't need worktrees.
- **Keep agents focused** — each agent gets a clear, self-contained task. Don't give one agent half the app.

### Example: "Build a file upload feature"

Launch in parallel:
1. **Research Agent** — Read Next.js 16 docs on form handling and server actions
2. **UI Agent** (worktree) — Build the upload component with drag-and-drop, progress bar
3. **API Agent** (worktree) — Build the server action to receive and store the file
4. **Processing Agent** (worktree) — Build the PDF parsing logic
5. After 1-4 complete → **Quality Agent** — Lint, typecheck, review all changes

### Agent Completion Requirements (MANDATORY)

Agents MUST NOT stop or report as "done" unless **both** of the following conditions are met:

1. **Specs are created** — The agent has produced or verified a clear specification for its work (e.g., component API, data flow, file structure, input/output contract). If no spec exists, the agent must create one before writing implementation code.
2. **Approval plan is satisfied** — The agent's output must fully meet the approved plan. If a plan was established (via Plan mode, user approval, or task breakdown), every item in that plan must be addressed. Partially completed work is not acceptable — agents must loop back and finish all planned items before reporting completion.

**If either condition is not met, the agent must continue working.** Do not return partial results, do not ask the user to finish remaining items, and do not skip planned work. An agent that stops early is a failed agent.

### Git Policy

**Agents must NOT use git.** No commits, pushes, pulls, merges, checkouts, or any other git commands. All git operations are performed manually by the user. The `Bash(git *)` command is denied in project settings.

### General Workflow Patterns

- **UI work**: Use the shadcn MCP to find and install components before building custom ones.
- **Next.js docs first**: Always read `node_modules/next/dist/docs/` before writing Next.js code — this is a Next.js 16 project with breaking changes.
- **Memory**: Store important project decisions and non-obvious context in memory MCP so it persists across sessions.
