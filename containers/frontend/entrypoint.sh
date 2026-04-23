#!/bin/sh
# Deprecated: frontend runtime env injection via window.env has been removed.
# This script is kept only for backwards compatibility with older image entrypoints.
exec nginx -g 'daemon off;'
