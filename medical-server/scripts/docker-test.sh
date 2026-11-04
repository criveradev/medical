#!/bin/sh

set -eu

project_name="medical-backend-test"

cleanup() {
  trap - EXIT HUP INT TERM
  docker compose -p "$project_name" --profile test down --remove-orphans
}

trap cleanup EXIT HUP INT TERM

docker compose \
  -p "$project_name" \
  --profile test \
  up \
  --build \
  --abort-on-container-exit \
  --exit-code-from test \
  test
