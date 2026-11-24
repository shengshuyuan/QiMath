#!/usr/bin/env bash
# 发布 WorkBuddy 前：把内部配置临时移出（平台不读 .gitignore，且是增量覆盖）。
# 用法：./tools/prepare-workbuddy-deploy.sh
# 发布结束后：./tools/restore-workbuddy-deploy.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STASH_FILE="$ROOT/.workbuddy-deploy-stash-path"
STASH="${TMPDIR:-/tmp}/qimath-wb-stash-$$"
mkdir -p "$STASH"

MOVED=0
for name in .env.local .vercel .wrangler .omx .gstack .workbuddy AGENTS.md .DS_Store; do
  if [[ -e "$ROOT/$name" ]]; then
    mv "$ROOT/$name" "$STASH/"
    echo "moved $name"
    MOVED=$((MOVED + 1))
  fi
done

printf '%s\n' "$STASH" > "$STASH_FILE"
echo "stash=$STASH ($MOVED items)"
echo "发布完成后执行: ./tools/restore-workbuddy-deploy.sh"
