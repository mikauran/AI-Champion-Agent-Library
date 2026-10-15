#!/usr/bin/env bash
# Gate for phase 31: the 16 DDC-based agents contain nothing from the MCP work
# (MCP servers, LVI-INFO, STK, Prysmian, Rakennustieto). Run from the repo root.
set -euo pipefail
cd "$(dirname "$0")/.."

SLUGS="etim-classification-repair qto-normalization clash-prioritization rfi-generation-from-findings product-sourcing-mbom quote-comparison carbon-epd-enrichment cut-sheet-qa spooling-and-cutting d2-code-validation om-completeness bms-digital-twin daily-report-cross-check punch-list-closure-check change-order-consistency-check safety-observation-classification"
# Word boundaries keep "resolving" (contains "lvi") from matching.
PATTERN='\bMCP|\bLVI|\bSTK|Prysmian|Rakennustieto|\bstk-|\blvi-'

FILES=()
for s in $SLUGS; do
  FILES+=("data/agents/$s.yaml")
  [ -d "data/tryitout-prompts/$s" ] && FILES+=("data/tryitout-prompts/$s")
done

status=0
hits=$(grep -rniE "$PATTERN" "${FILES[@]}" || true)
if [ -n "$hits" ]; then printf '%s\n' "$hits"; status=1; fi

# Gap table rows only (lines starting with "| G-"); the changelog is excluded.
gaps=$(grep -niE "^\| G-[0-9]+ .*($PATTERN)" docs/consortium-agents-gaps.md || true)
if [ -n "$gaps" ]; then printf '%s\n' "$gaps"; status=1; fi

if [ "$status" -ne 0 ]; then echo "ddc-decoupling: FAILED" >&2; exit 1; fi
echo "ddc-decoupling: clean"
