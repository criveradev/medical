#!/bin/sh

set -eu

version="${1:-}"

if ! printf '%s\n' "$version" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  echo "Uso: $0 <major.minor.patch>" >&2
  exit 1
fi

(cd medical-server && npm version "$version" --no-git-tag-version --allow-same-version)
(cd medical-client && npm version "$version" --no-git-tag-version --allow-same-version)
printf '%s\n' "$version" > version.txt

echo "Versión sincronizada en version.txt, package.json y package-lock.json: $version"
