#!/bin/bash
# Tana data ingestion script
# Run after tana-preprocess.ts produces /tmp/tana-preprocessed/
#
# Usage: bash spike/tana-ingest.sh [--sources-only] [--highlights-only]

set -e

LENS="bun run packages/lens-core/src/main.ts"
SOURCES_DIR="/tmp/tana-preprocessed/sources"
HIGHLIGHTS_DIR="/tmp/tana-preprocessed/highlights"

export PATH="$HOME/.bun/bin:$PATH"
export ANTHROPIC_API_KEY=$(grep ANTHROPIC_API_KEY .env | cut -d= -f2)

# Parse args
DO_SOURCES=true
DO_HIGHLIGHTS=true
if [ "$1" = "--sources-only" ]; then DO_HIGHLIGHTS=false; fi
if [ "$1" = "--highlights-only" ]; then DO_SOURCES=false; fi

# Phase 1: Sources (compile mode)
if [ "$DO_SOURCES" = true ]; then
  echo "=== Phase 1: Ingesting sources (compile mode) ==="
  total=$(ls "$SOURCES_DIR"/*.md 2>/dev/null | wc -l | tr -d ' ')
  count=0
  failed=0
  for f in "$SOURCES_DIR"/*.md; do
    count=$((count + 1))
    name=$(basename "$f" .md)
    echo ""
    echo "[$count/$total] $name"
    if $LENS ingest "$f" 2>&1; then
      echo "  OK"
    else
      echo "  FAILED"
      failed=$((failed + 1))
    fi
  done
  echo ""
  echo "=== Sources complete: $((count - failed))/$count succeeded, $failed failed ==="
fi

# Phase 2: Highlights (place mode)
if [ "$DO_HIGHLIGHTS" = true ]; then
  echo ""
  echo "=== Phase 2: Placing highlights (place mode) ==="
  total=$(ls "$HIGHLIGHTS_DIR"/*.md 2>/dev/null | wc -l | tr -d ' ')
  count=0
  failed=0
  for f in "$HIGHLIGHTS_DIR"/*.md; do
    count=$((count + 1))
    name=$(basename "$f" .md)
    echo ""
    echo "[$count/$total] $name"
    if $LENS note --file "$f" 2>&1; then
      echo "  OK"
    else
      echo "  FAILED"
      failed=$((failed + 1))
    fi
  done
  echo ""
  echo "=== Highlights complete: $((count - failed))/$count succeeded, $failed failed ==="
fi

echo ""
echo "=== Final status ==="
$LENS status
