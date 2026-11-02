#!/usr/bin/env bash
# Baut die App und veröffentlicht dist/ als neuen Commit auf dem Branch gh-pages.
set -euo pipefail
npm test
npm run build
touch dist/.nojekyll
repo=$(git remote get-url origin)
tmp=$(mktemp -d)
git clone -q --branch gh-pages --single-branch "$repo" "$tmp" 2>/dev/null || { git -C "$tmp" init -q -b gh-pages; git -C "$tmp" remote add origin "$repo"; }
find "$tmp" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -R dist/. "$tmp/"
git -C "$tmp" add -A
git -C "$tmp" commit -q -m "Deploy $(date +%Y-%m-%d\ %H:%M)" || echo "Keine Änderungen"
git -C "$tmp" push -q origin gh-pages
rm -rf "$tmp"
