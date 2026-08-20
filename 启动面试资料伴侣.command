#!/bin/zsh
set -euo pipefail

cd "$(dirname "$0")"
APP_PATH="$PWD/release/mac-arm64/面试资料伴侣.app"

if [[ ! -d "$APP_PATH" ]]; then
  npm run package:mac
fi

open "$APP_PATH"
