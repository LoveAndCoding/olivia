# ─── Stage 1: Builder ───────────────────────────────────────────────────────
FROM node:22-slim AS builder

WORKDIR /build

# Copy all package manifests for layer caching.
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/pwa/package.json ./apps/pwa/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/domain/package.json ./packages/domain/

RUN npm ci

# Copy source files.
COPY tsconfig.base.json ./
COPY packages/contracts/ ./packages/contracts/
COPY packages/domain/ ./packages/domain/
COPY apps/pwa/ ./apps/pwa/

# VITE_API_BASE_URL is a relative path so the baked-in URL works regardless
# of the Tailscale IP/hostname — nginx proxies /api/ to the Fastify container.
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Build packages in dependency order.
RUN npm run build -w @olivia/contracts
RUN npm run build -w @olivia/domain
RUN npm run build -w @olivia/pwa

# ─── Stage 2: nginx ─────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS production

# Remove default nginx config.
RUN rm /etc/nginx/conf.d/default.conf

# Copy our nginx config.
COPY deploy/nginx.conf /etc/nginx/conf.d/olivia.conf

# Copy the built PWA assets.
COPY --from=builder /build/apps/pwa/dist/ /usr/share/nginx/html/

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
