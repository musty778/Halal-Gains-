# 🚀 Database Automation - Quick Start (1 Minute!)

## No More Manual SQL!

I've automated your entire database setup. Here's how:

## Step 1: Get Your Info (30 seconds)

1. Go to https://supabase.com/dashboard
2. Click your project
3. Go to **Settings** → **General**
4. Copy these two things:
   - **Project Reference ID** (looks like: `abcdefghijklmnop`)
   - **Database Password** (the one you created)

## Step 2: Run Two Commands (30 seconds)

```bash
# Link to your Supabase project (one time only)
npm run db:setup
# Enter your Project Reference ID when asked
# Enter your Database Password when asked

# Push ALL migrations automatically
npm run db:push
```

## Done! 🎉

That's it! Your database now has:
- ✅ Weight tracking tables
- ✅ Coach progress view permissions
- ✅ All RLS policies
- ✅ All functions

## Test It

```bash
# Start your app
npm run dev

# As a client:
# - Go to Progress
# - Click "Add Weight"
# - Enter weight and save
# - ✅ It works!

# As a coach:
# - Go to Progress
# - Select a client from dropdown
# - See their weight and workouts
# - ✅ It works!
```

## Future Updates

When we add new features:
```bash
# Just run this one command:
npm run db:push
```

That's it! No manual SQL ever again! 🎊

## Commands Cheat Sheet

```bash
npm run db:setup   # One-time setup (link to Supabase)
npm run db:push    # Apply all migrations (run anytime)
npm run db:status  # Check what's applied
```

## Need More Info?

See `DATABASE_AUTO_SETUP.md` for the full guide with troubleshooting.
