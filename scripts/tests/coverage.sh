#!/bin/bash

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

# This file is for you! Edit it to call your test suite. Note that the same
# file will be called if you run it locally as if you run it on CI.
# add in whatever is appropriate to your project.
PYTHONPATH=src/backend
find $PYTHONPATH -name "requirements.txt" -exec pip install -r {} \;
python -m pytest \
  src/backend \
  --cov-config=scripts/config/.coveragerc \
  --cov-report=xml \
  --cov=.
