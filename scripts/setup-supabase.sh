#!/bin/bash

# Halal Gains - Automated Supabase Setup Script
# This script will help you connect your local project to your Supabase database

set -e

echo "🚀 Halal Gains - Supabase Setup"
echo "================================"
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed"
    echo "📦 Installing Supabase CLI..."
    brew install supabase/tap/supabase
else
    echo "✅ Supabase CLI is installed"
fi

echo ""
echo "📋 To connect to your Supabase project, you need:"
echo "   1. Your Project Reference ID (found in Supabase Dashboard → Settings → General)"
echo "   2. Your Database Password (the one you set when creating the project)"
echo ""

# Check if already linked (by checking if supabase/config.toml has project_id)
if grep -q "project_id" ./supabase/config.toml 2>/dev/null; then
    PROJECT_REF=$(grep "project_id" ./supabase/config.toml | head -1 | cut -d'"' -f2)
    if [ ! -z "$PROJECT_REF" ] && [ "$PROJECT_REF" != "Halal-Gains-" ]; then
        echo "✅ Project appears to be already linked to: $PROJECT_REF"
        echo ""
        read -p "Do you want to re-link? (y/n): " relink
        if [ "$relink" != "y" ]; then
            echo "Skipping linking step"
            exit 0
        fi
    fi
fi

echo ""
echo "🔗 Linking to your Supabase project..."
echo ""
echo "When prompted:"
echo "  - Enter your Project Reference ID (e.g., abcdefghijklmnop)"
echo "  - Enter your Database Password"
echo ""

# Link to Supabase project (or update existing link)
supabase link --overwrite

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Run: npm run db:push      # Push all migrations to your database"
echo "  2. Run: npm run db:status    # Check migration status"
echo ""
