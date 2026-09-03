#!/bin/sh

set -eu

project_name="medical-backend-e2e"

cleanup() {
  trap - EXIT HUP INT TERM
  docker compose -p "$project_name" --profile e2e down --volumes --remove-orphans
}

trap cleanup EXIT HUP INT TERM

docker compose -p "$project_name" up --build --wait -d backend frontend
docker compose -p "$project_name" exec -T backend npm run seed:roles
docker compose -p "$project_name" exec -T backend npm run seed:admin
docker compose -p "$project_name" --profile e2e build e2e
docker compose -p "$project_name" --profile e2e run --rm --no-deps e2e
