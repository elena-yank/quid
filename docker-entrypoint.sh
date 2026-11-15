#!/bin/sh
set -eu
node scripts/ensure-db.mjs
node scripts/migrate.mjs
exec node .output/server/index.mjs
