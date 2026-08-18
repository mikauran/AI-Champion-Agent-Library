# syntax=docker/dockerfile:1
#
# Podman/Docker build for the AIC Agent Library (SvelteKit + adapter-node).
#
# Build:  podman build -t aic-agent-library -f Containerfile .
# Run:    podman run -d --name aic-agent-library -p 3000:3000 aic-agent-library
#
# The catalog is baked into the image at build time: `npm run build` runs
# drizzle-kit push + the YAML ingest script against data/agents/ before the
# SvelteKit build, so db/catalog.db ships inside the image already populated.
# To pick up new/changed agent YAML files, rebuild the image (or see the
# RUN_INGEST_ON_START option below for re-ingesting at container start).

ARG NODE_VERSION=22-bookworm-slim

# ---- builder --------------------------------------------------------------
FROM node:${NODE_VERSION} AS builder
WORKDIR /app

# python3/make/g++ back node-gyp in case better-sqlite3's prebuilt binary
# download is unreachable from this network (falls back to compiling).
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# db:push (schema) -> ingest (data/agents/*.yaml -> db/catalog.db) -> vite build
RUN npm run build

# ---- runtime ----------------------------------------------------------
FROM node:${NODE_VERSION} AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    CATALOG_DB_PATH=/app/db/catalog.db \
    INGEST_DATA_DIR=/app/data/agents

# Full node_modules (incl. @sveltejs/kit, svelte, tsx, drizzle-kit) is
# copied verbatim from the builder so the native better-sqlite3 binary
# matches this image's glibc, and optional re-ingest at startup works.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/db ./db
COPY --from=builder /app/data ./data
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/package.json ./package.json
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh \
    && chown -R node:node /app

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/catalog').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "build"]
