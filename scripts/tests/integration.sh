#!/bin/bash

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

npm install
npx --yes playwright install --with-deps > /dev/null

npm run test:integration --workspace tests/playwright
