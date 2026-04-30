#!/bin/bash

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

npm ci
npx --yes playwright install --with-deps > /dev/null

# TODO: CM-00000 - enable integration tests once Cognito access for tests resolved
# npm run test:integration --workspace tests/playwright
