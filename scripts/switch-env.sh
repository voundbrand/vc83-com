#!/bin/bash

# Quick environment switcher for development
# Usage: source ./scripts/switch-env.sh dev
# Usage: source ./scripts/switch-env.sh prod
#
# IMPORTANT: Use 'source' to export CONVEX_DEPLOYMENT to your shell:
#   source ./scripts/switch-env.sh prod
#
# This sets both .env.local (for Next.js) and CONVEX_DEPLOYMENT (for Convex CLI)

set -e

ENV=$1

if [ -z "$ENV" ]; then
  echo "❌ Error: Please specify environment (dev or prod)"
  echo "Usage: source ./scripts/switch-env.sh dev"
  echo "Usage: source ./scripts/switch-env.sh prod"
  return 1 2>/dev/null || exit 1
fi

if [ "$ENV" = "dev" ]; then
  echo "🔄 Switching to DEVELOPMENT environment..."
  cp .env.dev .env.local
  export CONVEX_DEPLOYMENT="dev:aromatic-akita-723"
  echo "✅ Switched to development"
  echo "📍 URL: https://aromatic-akita-723.convex.cloud"
  echo "🔧 CONVEX_DEPLOYMENT=$CONVEX_DEPLOYMENT"
elif [ "$ENV" = "prod" ]; then
  echo "🔄 Switching to PRODUCTION environment..."
  echo "⚠️  WARNING: You are about to switch to PRODUCTION!"
  read -p "Are you sure? (yes/no): " confirm
  if [ "$confirm" = "yes" ]; then
    cp .env.prod .env.local
    export CONVEX_DEPLOYMENT="prod:agreeable-lion-828"
    echo "✅ Switched to production"
    echo "📍 URL: https://agreeable-lion-828.convex.cloud"
    echo "🔧 CONVEX_DEPLOYMENT=$CONVEX_DEPLOYMENT"
  else
    echo "❌ Cancelled"
    return 1 2>/dev/null || exit 1
  fi
else
  echo "❌ Error: Unknown environment '$ENV'"
  echo "Valid options: dev, prod"
  return 1 2>/dev/null || exit 1
fi

echo ""
echo "Current environment:"
grep "NEXT_PUBLIC_CONVEX_URL" .env.local
echo ""
echo "💡 Tip: CONVEX_DEPLOYMENT is now exported in your current shell"
echo "   You can run: npx convex run <function>"
