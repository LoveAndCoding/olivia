# TOOLS.md -- Founding Engineer Toolchain

## Development Stack

- **Runtime**: Node.js with TypeScript
- **Package manager**: npm (monorepo with workspaces)
- **Build**: Vite (PWA), esbuild (API)
- **Database**: better-sqlite3 with Drizzle ORM
- **Offline storage**: Dexie (IndexedDB wrapper)

## Key Commands

| Command | Purpose |
|---|---|
| `npm run typecheck` | Full project type-check. Run after every implementation phase. |
| `npm test` | Run all tests via Vitest. |
| `npm run dev` | Start dev servers (API + PWA). |
| `npx vitest run --reporter=verbose packages/<pkg>` | Run tests for a specific package. |

## Package Structure

| Package | Role |
|---|---|
| `packages/domain` | Business rules, Zod schemas, pure logic. No side effects. |
| `packages/contracts` | Shared types and API contracts between client and server. |
| `packages/api` | Fastify server, Drizzle migrations, SQLite persistence. |
| `packages/pwa` | React PWA with TanStack Router/Query, Dexie offline layer. |

## Libraries

- **Zod**: Validation at system boundaries (API input, domain entry points).
- **date-fns**: Date manipulation in domain logic.
- **chrono-node**: Natural language date parsing.
- **TanStack Router**: File-based routing for the PWA.
- **TanStack Query**: Server state management and cache.
- **Dexie**: IndexedDB wrapper for offline-first client storage.

## Paperclip Coordination

- Use the `paperclip` skill for all issue management.
- Always include `X-Paperclip-Run-Id` on mutating API calls.
- `GET /api/agents/me/inbox-lite` for compact assignment inbox.

## Notes

(Add tool-specific notes and gotchas as you encounter them.)
