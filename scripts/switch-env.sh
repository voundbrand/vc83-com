#!/bin/bash

# Quick environment switcher for development
# Usage: ./scripts/switch-env.sh dev
# Usage: ./scripts/switch-env.sh prod

set -e

ENV=$1

if [ -z "$ENV" ]; then
  echo "❌ Error: Please specify environment (dev or prod)"
  echo "Usage: ./scripts/switch-env.sh dev"
  echo "Usage: ./scripts/switch-env.sh prod"
  exit 1
fi

if [ "$ENV" = "dev" ]; then
  echo "🔄 Switching to DEVELOPMENT environment..."
  cp .env.dev .env.local
  echo "✅ Switched to development"
  echo "📍 URL: https://aromatic-akita-723.convex.cloud"
elif [ "$ENV" = "prod" ]; then
  echo "🔄 Switching to PRODUCTION environment..."
  echo "⚠️  WARNING: You are about to switch to PRODUCTION!"
  read -p "Are you sure? (yes/no): " confirm
  if [ "$confirm" = "yes" ]; then
    cp .env.prod .env.local
    echo "✅ Switched to production"
    echo "📍 URL: https://agreeable-lion-828.convex.cloud"
  else
    echo "❌ Cancelled"
    exit 1
  fi
else
  echo "❌ Error: Unknown environment '$ENV'"
  echo "Valid options: dev, prod"
  exit 1
fi

echo ""
echo "Current environment:"
grep "NEXT_PUBLIC_CONVEX_URL" .env.local
