#!/bin/sh
# Optional re-ingest at container start.
#
# The image already ships db/catalog.db populated at build time. Set
# RUN_INGEST_ON_START=true (e.g. when data/agents is bind-mounted with
# fresher YAML than what the image was built with) to re-apply the schema
# and re-run ingestion before the server starts.
set -e

if [ "${RUN_INGEST_ON_START:-false}" = "true" ]; then
  echo "[entrypoint] RUN_INGEST_ON_START=true — pushing schema and re-ingesting ${INGEST_DATA_DIR}"
  # drizzle.config.ts targets ./db/catalog.db (relative to /app); keep
  # INGEST_DB_PATH in sync with CATALOG_DB_PATH so the app reads what was
  # just ingested. Leave CATALOG_DB_PATH at its default (/app/db/catalog.db)
  # unless you also change dbCredentials.url in drizzle.config.ts.
  INGEST_DB_PATH="${CATALOG_DB_PATH}" npx drizzle-kit push --config=drizzle.config.ts
  INGEST_DB_PATH="${CATALOG_DB_PATH}" npx tsx scripts/ingest.ts
fi

exec "$@"
