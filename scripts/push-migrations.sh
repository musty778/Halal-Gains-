#!/bin/bash

# Halal Gains - Automated Database Migration Script
# This script automatically pushes all pending migrations to your Supabase database

set -e

echo "📊 Halal Gains - Database Migration"
echo "===================================="
echo ""

# Note: We don't check for .supabase/config.toml as newer CLI versions
# may store link information differently. Let supabase commands fail if not linked.

echo "📋 Checking migration status..."
echo ""

# Show current migration status
supabase migration list

echo ""
echo "🚀 Pushing migrations to remote database..."
echo ""

# Push all migrations to remote database
supabase db push

echo ""
echo "✅ All migrations applied successfully!"
echo ""
echo "You can verify by checking:"
echo "  - Supabase Dashboard → Database → Tables"
echo "  - Or run: npm run db:status"
echo ""
