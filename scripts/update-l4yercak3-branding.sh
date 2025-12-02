#!/bin/bash

# Update l4yercak3 Branding in Database
# This script UPDATES existing translations that contain "L4YERCAK3" to use lowercase "l4yercak3"
# Unlike seed scripts, this actually modifies existing records

set -e  # Exit on error

echo "🔄 Starting l4yercak3 branding update..."
echo "========================================"
echo ""
echo "This will update existing translations from 'L4YERCAK3' to 'l4yercak3'"
echo ""

# Update any other L4YERCAK3 references (this handles all cases including Shop and .exe)
echo "📝 Updating all 'L4YERCAK3' references to 'l4yercak3'..."
if npx convex run translations/updateBranding:updateAllUppercaseReferences; then
  echo ""
  echo "========================================"
  echo "✅ SUCCESS! Branding updated in database"
  echo "🔄 Refresh your browser to see changes"
  echo "========================================"
else
  echo ""
  echo "========================================"
  echo "❌ ERROR: Update failed"
  echo "   Check that convex/translations/updateBranding.ts exists"
  echo "========================================"
  exit 1
fi
