#!/bin/sh
set -ex

date

PACKAGE_LOCK_RUN_FILE=node_modules/.package-lock.run

if [ -f $PACKAGE_LOCK_RUN_FILE ]; then
  echo "$PACKAGE_LOCK_RUN_FILE found, running npm ci"
  npm ci
  rm -f $PACKAGE_LOCK_RUN_FILE
fi

if [ ! -f node_modules/.package-lock.json ]; then
  echo "node_modules/.package-lock.json not found, running npm ci"
  npm ci
fi

if [ package-lock.json -nt node_modules/.package-lock.json ]; then
  echo "package-lock.json is newer than node_modules/.package-lock.json, running npm ci"
  npm ci
fi

exec "$@"
