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
# To pick up new/changed agent YAML files, rebuild the image.

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

# @sveltejs/kit and svelte are real runtime dependencies of the built
# server (adapter-node externalizes them rather than bundling), so they
# live in "dependencies" in package.json. Everything left in
# devDependencies (vite's CLI, drizzle-kit, tsx, tailwindcss, vitest, ...)
# is build-only tooling — prune it before it ships in the runtime image.
RUN npm prune --omit=dev

# ---- runtime ----------------------------------------------------------
FROM node:${NODE_VERSION} AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    CATALOG_DB_PATH=/app/db/catalog.db

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY --from=builder /app/db ./db
COPY --from=builder /app/package.json ./package.json
RUN chown -R node:node /app

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/catalog').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "build"]
