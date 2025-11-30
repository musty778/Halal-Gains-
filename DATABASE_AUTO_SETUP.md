# Automated Database Setup - No Manual SQL Required! 🚀

## Overview
I've created automated scripts so you **NEVER** have to manually copy and paste SQL again!

## One-Time Setup (2 Minutes)

### Step 1: Get Your Supabase Project Info

1. Go to your **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **General**
4. Copy your **Project Reference ID** (looks like: `abcdefghijklmnop`)
5. Keep your **Database Password** handy (the one you set when creating the project)

### Step 2: Link Your Project

Run this command in your terminal:

```bash
npm run db:setup
```

This will:
- ✅ Check if Supabase CLI is installed
- ✅ Install it if missing
- ✅ Link your local project to your Supabase database
- ✅ Ask for your Project Reference ID and Password

**Example:**
```bash
$ npm run db:setup

🚀 Halal Gains - Supabase Setup
================================

✅ Supabase CLI is installed

📋 To connect to your Supabase project, you need:
   1. Your Project Reference ID (found in Supabase Dashboard → Settings → General)
   2. Your Database Password (the one you set when creating the project)

🔗 Linking to your Supabase project...

When prompted:
  - Enter your Project Reference ID (e.g., abcdefghijklmnop)
  - Enter your Database Password

? Enter your project ref: abcdefghijklmnop
? Enter your database password: ••••••••••

✅ Linked to abcdefghijklmnop
```

### Step 3: Push All Migrations

Run this command to automatically apply **ALL** migrations:

```bash
npm run db:push
```

This will:
- ✅ Show you what migrations are pending
- ✅ Automatically push ALL migrations to your database
- ✅ Create all tables, functions, and policies
- ✅ No manual SQL copying required!

**Example:**
```bash
$ npm run db:push

📊 Halal Gains - Database Migration
====================================

📋 Checking migration status...

        LOCAL      │ REMOTE │ TIME (UTC)
  ─────────────────┼────────┼──────────────────────
   20251129104419 │   ...  │ 2025-11-29 10:44:19
   20251130174908 │   ...  │ 2025-11-30 17:49:08
   20251130180946 │   ...  │ 2025-11-30 18:09:46

🚀 Pushing migrations to remote database...

Applying migration 20251129104419_add_coach_id_to_client_profiles.sql...
Applying migration 20251130174908_create_weight_tracking.sql...
Applying migration 20251130180946_enable_coach_view_progress.sql...

✅ All migrations applied successfully!
```

## That's It! 🎉

Your database is now fully set up with:
- ✅ All tables created
- ✅ Weight tracking enabled
- ✅ Coach progress view enabled
- ✅ All RLS policies configured

## Available Commands

### `npm run db:setup`
**One-time setup** - Links your local project to Supabase
- Run this ONCE when first setting up the project
- Asks for your Project Reference ID and Password

### `npm run db:push`
**Push migrations** - Applies all pending migrations to your database
- Run this ANYTIME you want to update the database
- Automatically applies all new migrations
- Safe to run multiple times (won't duplicate)

### `npm run db:status`
**Check status** - Shows which migrations are applied
- See what's applied locally vs remotely
- Useful for debugging

### `npm run db:reset`
**Reset database** - Resets your remote database to match local migrations
- ⚠️ WARNING: Deletes all data!
- Only use for testing/development
- Re-applies all migrations from scratch

## Example Workflow

### First Time Setup:
```bash
# 1. Link to Supabase (one time only)
npm run db:setup

# 2. Push all migrations
npm run db:push

# 3. Start developing!
npm run dev
```

### Adding New Features (Future):
```bash
# When we add new migrations, just run:
npm run db:push

# That's it! No manual SQL needed.
```

## What Gets Automated

All these migrations are automatically applied:

### ✅ Migration 1: Coach Assignment
- File: `20251129104419_add_coach_id_to_client_profiles.sql`
- Adds coach_id column to client_profiles
- Links clients to coaches

### ✅ Migration 2: Weight Tracking
- File: `20251130174908_create_weight_tracking.sql`
- Creates client_weight_tracking table
- Creates record_weekly_weight() function
- Sets up RLS policies

### ✅ Migration 3: Coach Progress View
- File: `20251130180946_enable_coach_view_progress.sql`
- Updates RLS policies for coaches
- Allows coaches to view client data
- Maintains security and privacy

## Troubleshooting

### "Project is not linked"
**Error:** `❌ Project is not linked to Supabase`
**Fix:** Run `npm run db:setup` first

### "Permission denied"
**Error:** Scripts won't execute
**Fix:**
```bash
chmod +x scripts/setup-supabase.sh
chmod +x scripts/push-migrations.sh
```

### "Invalid credentials"
**Error:** Can't connect to Supabase
**Fix:**
1. Double-check your Project Reference ID
2. Verify your Database Password
3. Try `npm run db:setup` again

### "Migration already applied"
**This is OK!** The system automatically skips already-applied migrations.

### Need to start fresh?
```bash
# Reset everything (WARNING: Deletes all data!)
npm run db:reset
```

## Benefits of Automation

### Before (Manual):
1. ❌ Open Supabase Dashboard
2. ❌ Navigate to SQL Editor
3. ❌ Copy SQL from files
4. ❌ Paste into editor
5. ❌ Click Run
6. ❌ Repeat for each migration
7. ❌ Hope you didn't miss any

### After (Automated):
1. ✅ Run `npm run db:push`
2. ✅ Done!

## Security Notes

- ✅ Your credentials are stored locally in `.supabase/config.toml`
- ✅ This file is in `.gitignore` and won't be committed
- ✅ Each team member needs to run `npm run db:setup` once
- ✅ Migrations are version-controlled and tracked

## Future Migrations

When we add new features requiring database changes:
1. I'll create a new migration file in `supabase/migrations/`
2. You just run: `npm run db:push`
3. That's it! Automatic!

## Verification

After running `npm run db:push`, verify everything worked:

### Check in Supabase Dashboard:
1. Go to **Database** → **Tables**
2. You should see:
   - `client_weight_tracking` table
   - `client_profiles` table with `coach_id` column
   - All your existing tables

3. Go to **Database** → **Functions**
4. You should see:
   - `record_weekly_weight` function

### Test in Your App:
1. Run `npm run dev`
2. Login as a client
3. Go to Progress → Click "Add Weight"
4. Add weight → Should save successfully
5. Login as a coach
6. Go to Progress → Should see client selector
7. Select a client → Should see their weight and workouts

## Need Help?

If you encounter any issues:
1. Share the error message
2. Run `npm run db:status` and share the output
3. Check browser console (F12) for any errors

## Summary

You now have a fully automated database migration system:
- ✅ No more manual SQL copying
- ✅ One command to apply all migrations
- ✅ Version-controlled migration history
- ✅ Easy to share with team members
- ✅ Safe and repeatable

Just remember: **`npm run db:push`** is all you need! 🚀
