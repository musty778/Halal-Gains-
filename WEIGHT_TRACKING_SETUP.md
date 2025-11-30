# Weight Tracking Setup Instructions

## Overview
The weight tracking feature allows clients to log their weight after completing each workout week. The weight data will then appear in the Progress tab.

## Database Migration Required

To enable weight tracking, you need to run the migration in your Supabase database.

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of `/supabase/migrations/20251130174908_create_weight_tracking.sql`
5. Paste into the SQL Editor
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. You should see "Success. No rows returned"

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Navigate to your project directory
cd /path/to/Halal-Gains-

# Run migrations
supabase db push
```

## What This Migration Creates

1. **Table: `client_weight_tracking`**
   - Stores weekly weight measurements for each client
   - Tracks weight changes over time
   - Links to workout plans

2. **Function: `record_weekly_weight()`**
   - Automatically calculates weight change from previous week
   - Handles both new entries and updates

3. **Row Level Security (RLS) Policies**
   - Users can only view/edit their own weight data
   - Secure and private

## How to Use

### Method 1: Manual Weight Entry (Quick Testing)
1. Go to the **Progress** tab
2. You'll see a **"⚖️ Weight Progress"** section
3. Click the **"➕ Add Weight"** button in the top right
4. Enter:
   - Week Number (starts at 1, increments automatically)
   - Your current weight in kg
5. Click **"✅ Save Weight"**
6. Your weight will immediately appear in the progress section!

### Method 2: After Completing Workouts
1. Complete all exercises in a workout week
2. Click the **"Complete Week"** button
3. A modal will appear asking for your current weight
4. Enter your weight and click **"Save Weight"**
5. Go to the **Progress** tab to see your weight history

### What You'll See in Progress Tab:
- **Current Weight**: Your most recent weight entry
- **Starting Weight**: Your first weight entry
- **Total Change**: How much weight you've lost or gained
- **Weekly History**: Timeline showing weight for each week with changes

## Troubleshooting

### "No Weight Data Yet" Message
This is normal if you haven't completed any weeks yet. Complete a workout week and log your weight to start seeing data.

### Weight Modal Not Appearing
Make sure you've completed ALL exercises in a week before the "Complete Week" button appears.

### Weight Not Saving
1. Check browser console (F12) for error messages
2. Verify the migration was run successfully in Supabase
3. Check that you're logged in as a client (not coach)

### Still Not Seeing Weight in Progress Tab
1. Open browser console (F12)
2. Go to Progress tab
3. Look for logs that say "Fetching weight tracking for:" and "Weight tracking data:"
4. If you see an error about table not existing, run the migration again
5. If you see empty data `[]`, you need to complete a week and add weight first

## Database Schema

```sql
Table: client_weight_tracking
- id (UUID, primary key)
- client_user_id (UUID, foreign key to users)
- workout_plan_id (UUID, foreign key to workout_plans)
- week_number (INTEGER)
- weight_kg (DECIMAL)
- weight_lost_kg (DECIMAL, can be null)
- measurement_date (DATE)
- created_at (TIMESTAMP)
```

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify migration was applied successfully
3. Ensure you're completing weeks as a client
4. Check that workout plans exist in your database
