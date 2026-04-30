#!/bin/sh
set -e

echo "Installing dependencies..."
npm install

echo "Starting React development server..."

# Bind to all interfaces so the dev server is reachable from outside the container
export HOST=0.0.0.0

# Use polling instead of inotify — required for reliable file-change detection
# on Docker bind mounts (macOS/Windows hosts do not propagate inotify events)
export WATCHPACK_POLLING=true

# Enable access logs output
export GENERATE_SOURCEMAP=true
export BROWSER=none
export TSC_COMPILE_ON_ERROR=true
export REACT_APP_ACCESS_LOGS=true
export DEBUG=express:*,connect:*

exec npx react-scripts start 2>&1 | tee /var/log/react-access.log
