!/bin/bash

# This script is run before Terraform executable commands.
# It ensures all Node.js dependencies are installed, generates any required dependencies,
# and builds all Lambda functions in the workspace before Terraform provisions infrastructure.
# pre.sh runs in the same shell as terraform.sh, not in a subshell

: "${PROJECT:?PROJECT is required}"
: "${REGION:?REGION is required}"
: "${COMPONENT:?COMPONENT is required}"
: "${ENVIRONMENT:?ENVIRONMENT is required}"
: "${AWS_ACCOUNT_ID:?AWS_ACCOUNT_ID is required}"
: "${ACTION:?ACTION is required}"

# Helper function for error handling
run_or_fail() {
  "$@"
  if [ $? -ne 0 ]; then
    echo "$* failed!" >&2
    exit 1
  fi
}

echo "Running app pre.sh"
echo "REGION=$REGION"
echo "ENVIRONMENT=$ENVIRONMENT"
echo "ACTION=$ACTION"
echo "PROJECT=$PROJECT"
echo "COMPONENT=$COMPONENT"
echo "AWS_ACCOUNT_ID=$AWS_ACCOUNT_ID"

# change to repo root
pushd "$(git rev-parse --show-toplevel)" || exit 1

# Load .env from repo root if present (provides GITHUB_TOKEN, GITHUB_ACTOR, etc. for docker.sh)
if [ -f ".env" ]; then
  echo "Loading .env from repo root"
  set -a
  # shellcheck source=/dev/null
  source .env
  set +a
fi

run_or_fail npm ci
run_or_fail npm run generate-dependencies --workspaces --if-present
run_or_fail npm run lambda-build --workspaces --if-present

popd || exit 1 # return to working directory
