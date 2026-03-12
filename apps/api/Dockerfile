# ─── Stage 1: Builder ───────────────────────────────────────────────────────
FROM node:22 AS builder

WORKDIR /build

# Copy all package manifests first for layer caching.
# npm workspaces hoists node_modules to root, so all manifests must be present
# before running npm ci from the root.
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/pwa/package.json ./apps/pwa/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/domain/package.json ./packages/domain/

# Install all dependencies (dev + prod) for the workspace.
# better-sqlite3 is a native module; node:22 (Debian) has the build tools it needs.
RUN npm ci

# Copy source files.
COPY tsconfig.base.json ./
COPY packages/contracts/ ./packages/contracts/
COPY packages/domain/ ./packages/domain/
COPY apps/api/ ./apps/api/

# Build in dependency order.
RUN npm run build -w @olivia/contracts
RUN npm run build -w @olivia/domain
RUN npm run build -w @olivia/api

# ─── Stage 2: Production ────────────────────────────────────────────────────
FROM node:22 AS production

WORKDIR /app

# Copy manifests for production-only install.
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/pwa/package.json ./apps/pwa/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/domain/package.json ./packages/domain/

# Install production dependencies only.
# --ignore-scripts is intentionally NOT used: better-sqlite3 requires its
# node-gyp install script to build the native addon.
RUN npm ci --omit=dev

# Copy the built bundle.
COPY --from=builder /build/apps/api/dist/ ./dist/

# Copy built workspace package dist folders (symlinked via npm workspaces).
COPY --from=builder /build/packages/contracts/dist/ ./packages/contracts/dist/
COPY --from=builder /build/packages/domain/dist/ ./packages/domain/dist/

# CRITICAL: The migration SQL is resolved at runtime via import.meta.url.
# With the bundle at /app/dist/server.js, the path resolves to /app/drizzle/.
# See apps/api/src/db/client.ts: new URL('../../drizzle/...', import.meta.url)
COPY --from=builder /build/apps/api/drizzle/ ./drizzle/

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "dist/server.js"]
