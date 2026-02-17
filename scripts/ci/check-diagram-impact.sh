#!/usr/bin/env bash
set -euo pipefail

BASE_SHA="${1:-}"
HEAD_SHA="${2:-}"

MAP_FILE="docs/platform/codebase_atlas/path-flow-map.tsv"
FLOW_DOC_DIR="docs/platform/codebase_atlas/flows"

fail() {
  echo "Diagram impact check failed: $1"
  exit 1
}

contains() {
  local needle="$1"
  shift
  local item
  for item in "$@"; do
    if [[ "$item" == "$needle" ]]; then
      return 0
    fi
  done
  return 1
}

if [[ -z "$BASE_SHA" || -z "$HEAD_SHA" ]]; then
  fail "Usage: bash scripts/ci/check-diagram-impact.sh <base_sha> <head_sha>"
fi

if [[ ! -f "$MAP_FILE" ]]; then
  fail "missing mapping file: $MAP_FILE"
fi

CHANGED_FILES=()
while IFS= read -r path; do
  [[ -n "$path" ]] && CHANGED_FILES+=("$path")
done < <(git diff --name-only --diff-filter=ACMR "$BASE_SHA" "$HEAD_SHA")

if [[ "${#CHANGED_FILES[@]}" -eq 0 ]]; then
  echo "Diagram impact: no added/copied/moved/modified files in range."
  exit 0
fi

CHANGED_FLOW_DOCS=()
REQUIRED_FLOWS=()
DECLARED_FLOWS=()
DECLARED_DOCS=()

for path in "${CHANGED_FILES[@]}"; do
  if [[ "$path" =~ ^docs/platform/codebase_atlas/flows/(F[0-9]+)-.+\.md$ ]]; then
    flow_id="${BASH_REMATCH[1]}"
    if ! contains "$flow_id" "${CHANGED_FLOW_DOCS[@]-}"; then
      CHANGED_FLOW_DOCS+=("$flow_id")
    fi
  fi
done

while IFS=$'\t' read -r pattern flows _notes; do
  [[ -z "${pattern// }" ]] && continue
  [[ "$pattern" == \#* ]] && continue

  for changed in "${CHANGED_FILES[@]}"; do
    if [[ "$changed" == $pattern ]]; then
      IFS=',' read -ra FLOW_TOKENS <<< "$flows"
      for flow in "${FLOW_TOKENS[@]}"; do
        normalized="$(echo "$flow" | tr -d '[:space:]' | tr '[:lower:]' '[:upper:]')"
        if [[ -n "$normalized" ]] && ! contains "$normalized" "${REQUIRED_FLOWS[@]-}"; then
          REQUIRED_FLOWS+=("$normalized")
        fi
      done
    fi
  done
done < "$MAP_FILE"

if [[ "${#REQUIRED_FLOWS[@]}" -gt 0 ]]; then
  SORTED_REQUIRED_FLOWS=()
  while IFS= read -r flow; do
    [[ -n "$flow" ]] && SORTED_REQUIRED_FLOWS+=("$flow")
  done < <(
    printf '%s\n' "${REQUIRED_FLOWS[@]}" \
      | awk '{ n=$0; sub(/^[^0-9]*/, "", n); if (n ~ /^[0-9]+$/) { printf "%010d\t%s\n", n, $0 } else { printf "9999999999\t%s\n", $0 } }' \
      | sort \
      | cut -f2-
  )
  REQUIRED_FLOWS=("${SORTED_REQUIRED_FLOWS[@]}")
fi

if [[ "${#REQUIRED_FLOWS[@]}" -eq 0 ]]; then
  echo "Diagram impact: no mapped critical paths changed. No flow update required."
  exit 0
fi

PR_BODY="${PR_BODY:-}"
if [[ -z "${PR_BODY//[[:space:]]/}" ]]; then
  fail "PR body is empty or missing. Add the Diagram Impact contract fields."
fi

has_impact_line=$(printf '%s\n' "$PR_BODY" | grep -Eic '^[[:space:]]*impact:[[:space:]]*')
has_affected_line=$(printf '%s\n' "$PR_BODY" | grep -Eic '^[[:space:]]*affected_flows:[[:space:]]*')
has_updated_line=$(printf '%s\n' "$PR_BODY" | grep -Eic '^[[:space:]]*updated_docs:[[:space:]]*')
has_justification_line=$(printf '%s\n' "$PR_BODY" | grep -Eic '^[[:space:]]*justification:[[:space:]]*')

if [[ "$has_impact_line" -eq 0 || "$has_affected_line" -eq 0 || "$has_updated_line" -eq 0 || "$has_justification_line" -eq 0 ]]; then
  fail "Missing required Diagram Impact fields. Required lines: impact, affected_flows, updated_docs, justification."
fi

IMPACT="$(printf '%s\n' "$PR_BODY" | sed -nE 's/^[[:space:]]*impact:[[:space:]]*(none|minor|major)[[:space:]]*$/\1/ip' | head -n1 | tr '[:upper:]' '[:lower:]')"
AFFECTED_RAW="$(printf '%s\n' "$PR_BODY" | sed -nE 's/^[[:space:]]*affected_flows:[[:space:]]*\[(.*)\][[:space:]]*$/\1/ip' | head -n1)"
UPDATED_RAW="$(printf '%s\n' "$PR_BODY" | sed -nE 's/^[[:space:]]*updated_docs:[[:space:]]*\[(.*)\][[:space:]]*$/\1/ip' | head -n1)"
JUSTIFICATION="$(printf '%s\n' "$PR_BODY" | sed -nE 's/^[[:space:]]*justification:[[:space:]]*(.*)$/\1/ip' | head -n1)"

if [[ -z "$IMPACT" ]]; then
  fail "impact must be one of: none, minor, major"
fi

IFS=',' read -ra DECLARED_FLOWS <<< "$AFFECTED_RAW"
PARSED_DECLARED_FLOWS=("${DECLARED_FLOWS[@]-}")
DECLARED_FLOWS=()
for raw in "${PARSED_DECLARED_FLOWS[@]}"; do
  flow="$(echo "$raw" | tr -d "[]'\" " | tr '[:lower:]' '[:upper:]')"
  if [[ -n "$flow" ]] && ! contains "$flow" "${DECLARED_FLOWS[@]-}"; then
    DECLARED_FLOWS+=("$flow")
  fi
done

IFS=',' read -ra DECLARED_DOCS <<< "$UPDATED_RAW"
PARSED_DECLARED_DOCS=("${DECLARED_DOCS[@]-}")
DECLARED_DOCS=()
for raw in "${PARSED_DECLARED_DOCS[@]}"; do
  doc="$(echo "$raw" | tr -d "[]'\"")"
  doc="$(echo "$doc" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')"
  if [[ -n "$doc" ]] && ! contains "$doc" "${DECLARED_DOCS[@]-}"; then
    DECLARED_DOCS+=("$doc")
  fi
done

if [[ "$IMPACT" == "none" ]]; then
  normalized_justification="$(echo "$JUSTIFICATION" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')"
  if [[ -z "$normalized_justification" || "$normalized_justification" == "n/a" || "$normalized_justification" == "na" || "$normalized_justification" == "none" || "$normalized_justification" == "-" ]]; then
    fail "impact:none requires explicit non-empty justification."
  fi

  fail "impact:none is not allowed when mapped critical flows changed. Required flows: ${REQUIRED_FLOWS[*]}. Use impact: minor or impact: major."
fi

MISSING_AFFECTED=()
MISSING_FLOW_DOCS=()
MISSING_UPDATED_DOC_DECLARATIONS=()
INVALID_DECLARED_DOCS=()

for flow in "${REQUIRED_FLOWS[@]}"; do
  if ! contains "$flow" "${DECLARED_FLOWS[@]-}"; then
    MISSING_AFFECTED+=("$flow")
  fi

  if ! contains "$flow" "${CHANGED_FLOW_DOCS[@]-}"; then
    MISSING_FLOW_DOCS+=("$flow")
  fi

  shopt -s nullglob
  FLOW_DOC_MATCHES=("${FLOW_DOC_DIR}/${flow}-"*.md)
  shopt -u nullglob

  if [[ "${#FLOW_DOC_MATCHES[@]}" -gt 0 ]]; then
    expected_doc="${FLOW_DOC_MATCHES[0]}"
    if ! contains "$expected_doc" "${DECLARED_DOCS[@]-}"; then
      MISSING_UPDATED_DOC_DECLARATIONS+=("$expected_doc")
    fi
  fi
done

for declared_doc in "${DECLARED_DOCS[@]-}"; do
  if ! contains "$declared_doc" "${CHANGED_FILES[@]-}"; then
    INVALID_DECLARED_DOCS+=("$declared_doc")
  fi
done

if [[ "${#MISSING_AFFECTED[@]}" -gt 0 ]]; then
  fail "affected_flows is missing required IDs: ${MISSING_AFFECTED[*]}"
fi

if [[ "${#MISSING_FLOW_DOCS[@]}" -gt 0 ]]; then
  fail "impacted flows require matching flow doc updates in this PR: ${MISSING_FLOW_DOCS[*]}"
fi

if [[ "${#MISSING_UPDATED_DOC_DECLARATIONS[@]}" -gt 0 ]]; then
  fail "updated_docs must include changed flow docs: ${MISSING_UPDATED_DOC_DECLARATIONS[*]}"
fi

if [[ "${#INVALID_DECLARED_DOCS[@]}" -gt 0 ]]; then
  fail "updated_docs includes files not changed in this PR: ${INVALID_DECLARED_DOCS[*]}"
fi

echo "Diagram impact check passed."
echo "Required flows: ${REQUIRED_FLOWS[*]}"
