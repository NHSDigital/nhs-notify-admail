#!/bin/sh
set -e

echo "Starting esbuild in watch mode..."

npx esbuild \
  --bundle \
  --sourcemap \
  --target=es2020 \
  --platform=node \
  --entry-names=[name] \
  --outdir=dist \
  src/local-server.ts \
  --watch=forever &

# Wait for the initial compile to produce output before starting Node
until [ -f dist/local-server.js ]; do
  sleep 0.1
done

echo "Initial build ready — starting server with live reload."

# exec replaces the shell so Node becomes PID 1 and receives Docker signals correctly.
# Node --watch restarts the process whenever esbuild rewrites dist/local-server.js.
exec node --watch dist/local-server.js
