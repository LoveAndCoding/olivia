# Tools

## Codebase Navigation

- **Grep/Glob**: primary tools for tracing stack traces to source code. Search by error message, function name, or file path.
- **Read**: read source files around the stack trace to understand context and control flow.

## Error Investigation

- **Paperclip issue search**: `GET /api/companies/{companyId}/issues?q=<keywords>` to find duplicate errors or related issues.
- **Git log/blame**: trace when code changed and why — useful for identifying regressions.
- **Stack trace analysis**: map error lines to source, accounting for TypeScript compilation and source maps.

## Olivia Stack Notes

- **TypeScript + Zod**: validation errors often surface as Zod parse failures — check the schema definition, not just the caller.
- **Fastify**: route handlers are in the API package. Check request validation schemas and reply serialization.
- **Drizzle ORM + better-sqlite3**: database errors may be constraint violations, migration issues, or type mismatches.
- **React + TanStack Router/Query**: frontend errors often relate to query cache state, route params, or suspense boundaries.
- **Dexie**: IndexedDB wrapper for offline cache. Errors here can involve version migrations, missing stores, or sync conflicts.
- **Vitest**: test runner. Use for validating fixes before routing.

## Observability Patterns

- When adding logging, use structured context: `{ error, context, timestamp }`.
- Keep log additions minimal — one or two strategic log points per investigation.
- Prefer error context enrichment (adding data to existing error paths) over new log statements.

(Add notes as you encounter new tools and patterns during triage.)
