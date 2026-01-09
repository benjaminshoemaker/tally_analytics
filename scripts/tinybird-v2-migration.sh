#!/bin/bash
# Tinybird V2 Metrics Migration Script
# This script adds new nullable columns to the events datasource for V2 metrics.
#
# IMPORTANT: Tinybird column additions are non-reversible. Test in staging first.
#
# Prerequisites:
# - Tinybird CLI installed (npm install -g @tinybird/cli)
# - Authenticated (tb auth)
#
# Usage:
#   ./scripts/tinybird-v2-migration.sh
#
# To run in dry-run mode (shows commands without executing):
#   DRY_RUN=1 ./scripts/tinybird-v2-migration.sh

set -e

DATASOURCE="events"

# Check if tb CLI is available
if ! command -v tb &> /dev/null; then
    echo "Error: Tinybird CLI (tb) is not installed."
    echo "Install with: npm install -g @tinybird/cli"
    exit 1
fi

# Check if authenticated
if ! tb auth whoami &> /dev/null; then
    echo "Error: Not authenticated with Tinybird."
    echo "Run: tb auth"
    exit 1
fi

echo "Starting Tinybird V2 migration for datasource: $DATASOURCE"
echo ""

# Define new columns
declare -a COLUMNS=(
    "engagement_time_ms Nullable(UInt32) \`json:\$.engagement_time_ms\`"
    "scroll_depth Nullable(UInt8) \`json:\$.scroll_depth\`"
    "visitor_id Nullable(String) \`json:\$.visitor_id\`"
    "is_returning Nullable(UInt8) \`json:\$.is_returning\`"
    "utm_source Nullable(String) \`json:\$.utm_source\`"
    "utm_medium Nullable(String) \`json:\$.utm_medium\`"
    "utm_campaign Nullable(String) \`json:\$.utm_campaign\`"
    "utm_term Nullable(String) \`json:\$.utm_term\`"
    "utm_content Nullable(String) \`json:\$.utm_content\`"
    "cta_clicks Nullable(String) \`json:\$.cta_clicks\`"
)

# Add each column
for column in "${COLUMNS[@]}"; do
    echo "Adding column: $column"

    if [ -n "$DRY_RUN" ]; then
        echo "  [DRY RUN] Would execute: tb datasource alter $DATASOURCE --add-column \"$column\""
    else
        tb datasource alter "$DATASOURCE" --add-column "$column"
        echo "  Done."
    fi
    echo ""
done

echo "Migration complete!"
echo ""

# Verify schema
if [ -z "$DRY_RUN" ]; then
    echo "Verifying schema with sample query..."
    tb sql "SELECT
        engagement_time_ms,
        scroll_depth,
        visitor_id,
        is_returning,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content,
        cta_clicks
    FROM $DATASOURCE
    LIMIT 1"
fi

echo ""
echo "V2 migration complete. New columns added to $DATASOURCE:"
echo "  - engagement_time_ms (Nullable UInt32)"
echo "  - scroll_depth (Nullable UInt8)"
echo "  - visitor_id (Nullable String)"
echo "  - is_returning (Nullable UInt8)"
echo "  - utm_source (Nullable String)"
echo "  - utm_medium (Nullable String)"
echo "  - utm_campaign (Nullable String)"
echo "  - utm_term (Nullable String)"
echo "  - utm_content (Nullable String)"
echo "  - cta_clicks (Nullable String - JSON array)"
