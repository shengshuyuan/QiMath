#!/usr/bin/env bash
# 还原 prepare-workbuddy-deploy.sh 移出的内部文件。
# 用法：./tools/restore-workbuddy-deploy.sh [stash目录]
# 若发布后平台新建了 .workbuddy/applications.yaml，会保留新文件，只还原 memory 等旧内容。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STASH_FILE="$ROOT/.workbuddy-deploy-stash-path"

if [[ $# -ge 1 ]]; then
  STASH="$1"
elif [[ -f "$STASH_FILE" ]]; then
  STASH="$(cat "$STASH_FILE")"
else
  echo "找不到暂存目录。请传入路径，或先运行 prepare-workbuddy-deploy.sh。" >&2
  exit 1
fi

if [[ ! -d "$STASH" ]]; then
  echo "暂存目录不存在: $STASH" >&2
  exit 1
fi

# .workbuddy：若发布后平台已写入新目录，合并还原 memory 等，保留线上新写的 applications.yaml。
if [[ -d "$STASH/.workbuddy" ]]; then
  if [[ -d "$ROOT/.workbuddy" ]]; then
    mkdir -p "$ROOT/.workbuddy"
    for item in "$STASH/.workbuddy"/*; do
      base="$(basename "$item")"
      if [[ "$base" == "applications.yaml" && -e "$ROOT/.workbuddy/applications.yaml" ]]; then
        echo "keep new .workbuddy/applications.yaml"
        continue
      fi
      rm -rf "$ROOT/.workbuddy/$base"
      mv "$item" "$ROOT/.workbuddy/"
      echo "restored .workbuddy/$base"
    done
    rm -rf "$STASH/.workbuddy"
  else
    mv "$STASH/.workbuddy" "$ROOT/"
    echo "restored .workbuddy"
  fi
fi

for item in "$STASH"/* "$STASH"/.[!.]*; do
  [[ -e "$item" ]] || continue
  base="$(basename "$item")"
  [[ "$base" == "." || "$base" == ".." ]] && continue
  [[ "$base" == ".workbuddy" ]] && continue
  rm -rf "$ROOT/$base"
  mv "$item" "$ROOT/"
  echo "restored $base"
done

rm -rf "$STASH"
rm -f "$STASH_FILE"
echo "restore done"
