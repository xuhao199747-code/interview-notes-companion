#!/bin/zsh
set -e

cd "$(dirname "$0")"
git pull --ff-only origin main
INTERVIEW_EDITION=release npm run desktop
