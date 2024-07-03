#!/bin/sh
set -ex

date

PACKAGE_LOCK_RUN_FILE=node_modules/.package-lock.run
VERSION_UPDATE_SCRIPT_FILE=scripts/version-update.js

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

if [ ! -f src/version/version.ts ]; then
  echo "no version file found. starting version-update.js"
  if [ -e "$VERSION_UPDATE_SCRIPT_FILE" ]; then
      if grep -q '^[^#]' "$VERSION_UPDATE_SCRIPT_FILE"; then
          echo "Updating version."
          node scripts/version-update.js
      else
          echo "Nothing to do."
      fi
  else
      echo "File for version update does not exist."
  fi
fi

exec "$@"
