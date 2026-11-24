#!/usr/bin/env bash
# 安全部署 Cloudflare Pages：只拷贝白名单公开运行时资源到临时目录并校验无内部/敏感文件后上传。
# 用法：./tools/deploy-cloudflare.sh [--dry-run]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_NAME="${CF_PAGES_PROJECT:-qimath}"
BRANCH="${CF_PAGES_BRANCH:-main}"
DRY_RUN=0

for arg in "$@"; do
  case "$arg" in
    --dry-run)
      DRY_RUN=1
      ;;
    -h|--help)
      echo "Usage: $0 [--dry-run]"
      echo "Env: CF_PAGES_PROJECT (default: qimath), CF_PAGES_BRANCH (default: main), WRANGLER_BIN"
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 1
      ;;
  esac
done

STAGE="$(mktemp -d "${TMPDIR:-/tmp}/qimath-cf-dist.XXXXXX")"
trap 'rm -rf "$STAGE"' EXIT

ALLOW_FILES=(_headers index.html 404.html manifest.json icon.svg sw.js)
ALLOW_DIRS=(css js audio)

for file in "${ALLOW_FILES[@]}"; do
  if [[ ! -f "$ROOT/$file" ]]; then
    echo "ERROR: required public file missing: $ROOT/$file" >&2
    exit 1
  fi
  cp "$ROOT/$file" "$STAGE/$file"
done

for dir in "${ALLOW_DIRS[@]}"; do
  if [[ ! -d "$ROOT/$dir" ]]; then
    echo "ERROR: required public directory missing: $ROOT/$dir" >&2
    exit 1
  fi
  cp -R "$ROOT/$dir" "$STAGE/$dir"
done

# 清理系统元数据文件，避免上传任何隐藏文件
find "$STAGE" -name '.DS_Store' -delete

# 安全校验：禁止任何点文件、点目录及内部研发文件进入上传目录
DOTFILES="$(find "$STAGE" -mindepth 1 -name '.*')"
if [[ -n "$DOTFILES" ]]; then
  echo "ERROR: unexpected dotfiles found in staging directory:" >&2
  echo "$DOTFILES" >&2
  exit 1
fi

FORBIDDEN="$(find "$STAGE" -mindepth 1 \( \
  -name 'AGENTS.md' -o \
  -name 'AI_readme.md' -o \
  -name 'DESIGN.md' -o \
  -name 'README.md' -o \
  -name 'tools' -o \
  -name 'docs' -o \
  -name 'vercel.json' \
\))"
if [[ -n "$FORBIDDEN" ]]; then
  echo "ERROR: forbidden internal paths found in staging directory:" >&2
  echo "$FORBIDDEN" >&2
  exit 1
fi

SRC_AUDIO_COUNT="$(find "$ROOT/audio" -type f ! -name '.DS_Store' | wc -l | tr -d ' ')"
STAGE_AUDIO_COUNT="$(find "$STAGE/audio" -type f | wc -l | tr -d ' ')"
if [[ "$SRC_AUDIO_COUNT" != "$STAGE_AUDIO_COUNT" ]]; then
  echo "ERROR: audio file count mismatch (src=$SRC_AUDIO_COUNT, stage=$STAGE_AUDIO_COUNT)" >&2
  exit 1
fi

STAGE_FILE_COUNT="$(find "$STAGE" -type f | wc -l | tr -d ' ')"
echo "Staged $STAGE_FILE_COUNT public files (audio: $STAGE_AUDIO_COUNT) -> project=$PROJECT_NAME branch=$BRANCH"

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "--- Top-level staged entries ---"
  ls -la "$STAGE"
  echo "--- Non-audio files ---"
  find "$STAGE" -type f ! -path "$STAGE/audio/*" | sed "s#^$STAGE/##" | sort
  echo "Dry run OK."
  exit 0
fi

WRANGLER_CMD=()
if [[ -n "${WRANGLER_BIN:-}" && -x "$WRANGLER_BIN" ]]; then
  WRANGLER_CMD=("$WRANGLER_BIN")
elif command -v wrangler >/dev/null 2>&1; then
  WRANGLER_CMD=("$(command -v wrangler)")
else
  for candidate in "$HOME"/.npm/_npx/*/node_modules/.bin/wrangler; do
    if [[ -x "$candidate" ]]; then
      WRANGLER_CMD=("$candidate")
      break
    fi
  done
fi

if [[ ${#WRANGLER_CMD[@]} -eq 0 ]]; then
  WRANGLER_CMD=(npx --yes wrangler)
fi

COMMIT_HASH="$(git -C "$ROOT" rev-parse HEAD)"
COMMIT_MSG="$(git -C "$ROOT" log -1 --pretty=%s)"

echo "Deploying via: ${WRANGLER_CMD[*]}"
"${WRANGLER_CMD[@]}" pages deploy "$STAGE" \
  --project-name="$PROJECT_NAME" \
  --branch="$BRANCH" \
  --commit-hash="$COMMIT_HASH" \
  --commit-message="$COMMIT_MSG" \
  --commit-dirty=false
