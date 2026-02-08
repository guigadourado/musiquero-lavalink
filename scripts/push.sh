#!/usr/bin/env bash
# Push to GitHub using GITHUB_TOKEN from .env (no interactive auth).
# Requires: origin remote set to this repo, and GITHUB_TOKEN in .env.
set -e
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "No .env file. Copy .env.example to .env and add GITHUB_TOKEN."
  exit 1
fi

# Read token (value after first =, so tokens containing = work)
GITHUB_TOKEN=$(grep '^GITHUB_TOKEN=' .env 2>/dev/null | cut -d= -f2- | tr -d '\r')
if [ -z "$GITHUB_TOKEN" ]; then
  echo "GITHUB_TOKEN is not set in .env. Add: GITHUB_TOKEN=ghp_your_token"
  exit 1
fi

REMOTE=$(git remote get-url origin)
# Support both HTTPS and SSH remotes
if [[ "$REMOTE" == https://* ]]; then
  # https://github.com/user/repo.git -> https://TOKEN@github.com/user/repo.git
  PUSH_URL="https://${GITHUB_TOKEN}@${REMOTE#https://}"
elif [[ "$REMOTE" == git@github.com:* ]]; then
  # git@github.com:user/repo.git -> https://TOKEN@github.com/user/repo.git
  PUSH_URL="https://${GITHUB_TOKEN}@github.com/${REMOTE#git@github.com:}"
else
  echo "Unsupported remote: $REMOTE"
  exit 1
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD)
git push "$PUSH_URL" "$BRANCH"
