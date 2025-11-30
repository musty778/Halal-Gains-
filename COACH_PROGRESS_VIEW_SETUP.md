# Coach Progress View - Complete Setup Guide

## Overview
Coaches can now view their clients' weight progress and completed workouts in the Progress tab!

## Features Implemented

### For Coaches:
✅ **Client Selector** - Dropdown to select which client to view
✅ **Weight Progress** - See client's weight history and changes
✅ **Workout Completions** - View which weeks and exercises clients completed
✅ **Progress Tracking** - See completion percentages for each workout day
✅ **Exercise Details** - View sets, reps, and weights used by clients
✅ **View-Only Mode** - Coaches can view but not edit client data

### UI Features:
- Client dropdown selector at the top
- Full weight tracking statistics (current, starting, total change)
- Weekly weight timeline with changes
- Completed workout weeks with green checkmarks
- Exercise completion details with actual performance
- Prayer time notes visible to coaches

## Required SQL Migration

To enable coaches to view client progress, run this SQL in Supabase:

### Step 1: Run the Migration

1. Go to **Supabase Dashboard** → https://supabase.com/dashboard
2. Click **SQL Editor** (left sidebar)
3. Click **New Query**
4. Open the file: `ENABLE_COACH_VIEW_PROGRESS.sql`
5. Copy ALL contents and paste into Supabase SQL Editor
6. Click **Run**
7. Wait for "Success. No rows returned"

### What This Migration Does:

1. **Updates weight tracking policies**:
   - Clients can view/insert/update their own weight
   - Coaches can view their assigned clients' weight data

2. **Updates workout completion policies**:
   - Coaches can view their clients' workout day completions
   - Coaches can view their clients' exercise completions

3. **Maintains security**:
   - Coaches can ONLY view clients assigned to them
   - Coaches cannot edit client data
   - Clients' data remains private from other coaches

## How to Use (Coach View)

### 1. Login as a Coach
- Use your coach account credentials
- Navigate to the **Progress** tab

### 2. Select a Client
- You'll see a dropdown labeled "Select Client"
- Choose the client whose progress you want to view
- The page will automatically load their data

### 3. View Weight Progress
You'll see:
- **Current Weight**: Client's most recent weight entry
- **Starting Weight**: Client's first weight entry
- **Total Change**: How much weight lost/gained
- **Weekly History**: Timeline of all weight entries with week-by-week changes

Example display:
```
Current Weight: 74.5 kg (Week 3)
Starting Weight: 76 kg (Week 1)
Total Change: -1.5 kg (Lost)

Weekly History:
Week 3: 74.5 kg | Change: -0.5 kg
Week 2: 75 kg   | Change: -1 kg
Week 1: 76 kg   | Change: --
```

### 4. View Workout Progress
For each week, you can see:
- Which days the client completed
- Completion percentage for each day
- Green checkmarks for fully completed workouts
- Exercise details: sets, reps, weights used
- Client's workout ratings and notes

### 5. Multiple Clients
- Use the client dropdown to switch between clients
- Data updates automatically when you select a different client
- Each client's workout plans are shown separately

## What Coaches CAN Do:
✅ View all assigned clients' progress
✅ See weight tracking history
✅ View completed workouts
✅ See exercise performance details
✅ View client notes and ratings
✅ Switch between multiple clients

## What Coaches CANNOT Do:
❌ Add weight for clients (only clients can add their own weight)
❌ Edit client workout logs
❌ Delete client data
❌ View clients not assigned to them

## Troubleshooting

### Coach Can't See Clients
**Issue**: Dropdown shows "No Clients Yet"
**Solution**:
- Ensure clients are assigned to this coach in the database
- Check `client_profiles` table has `coach_id` set correctly
- Run this SQL to verify:
  ```sql
  SELECT cp.full_name, coach.user_id as coach_user_id
  FROM client_profiles cp
  JOIN coach_profiles coach ON cp.coach_id = coach.id
  WHERE coach.user_id = 'YOUR_COACH_USER_ID';
  ```

### Coach Can't See Weight Data
**Issue**: Shows "No Weight Data Yet" but client has logged weight
**Solution**:
1. Verify the SQL migration `ENABLE_COACH_VIEW_PROGRESS.sql` was run
2. Check browser console for errors (F12)
3. Verify RLS policies exist:
   ```sql
   SELECT * FROM pg_policies
   WHERE tablename = 'client_weight_tracking';
   ```

### Coach Can't See Completed Workouts
**Issue**: Workouts don't show completion status
**Solution**:
1. Ensure migration was run successfully
2. Check that client actually completed workouts
3. Verify policies for `workout_day_completions` table:
   ```sql
   SELECT * FROM pg_policies
   WHERE tablename = 'workout_day_completions';
   ```

### Wrong Client Data Showing
**Issue**: Seeing another client's data
**Solution**:
- Hard refresh the page (Cmd/Ctrl + Shift + R)
- Clear browser cache
- Re-select the client from dropdown

## Database Verification

### Check if Coach-Client Assignment is Correct:
```sql
SELECT
  cp.full_name as client_name,
  coach.id as coach_profile_id,
  u.email as coach_email
FROM client_profiles cp
JOIN coach_profiles coach ON cp.coach_id = coach.id
JOIN auth.users u ON coach.user_id = u.id;
```

### Check Client Weight Data:
```sql
SELECT
  cp.full_name,
  cwt.week_number,
  cwt.weight_kg,
  cwt.weight_lost_kg,
  cwt.measurement_date
FROM client_weight_tracking cwt
JOIN client_profiles cp ON cwt.client_user_id = cp.user_id
ORDER BY cwt.created_at DESC;
```

### Check Client Workout Completions:
```sql
SELECT
  cp.full_name,
  ww.week_number,
  wd.day_of_week,
  wdc.completed_at,
  wdc.rating
FROM workout_day_completions wdc
JOIN workout_days wd ON wdc.workout_day_id = wd.id
JOIN workout_weeks ww ON wd.workout_week_id = ww.id
JOIN workout_plans wp ON ww.workout_plan_id = wp.id
JOIN client_profiles cp ON wp.client_id = cp.user_id
ORDER BY wdc.completed_at DESC;
```

## Testing the Feature

### Test as a Coach:
1. Login with coach account
2. Go to Progress tab
3. Select a client from dropdown
4. Verify you can see:
   - Client's weight progress (if they've logged weight)
   - Completed workout weeks
   - Exercise completion details
5. Try switching to another client
6. Verify data updates correctly

### Test as a Client:
1. Login with client account
2. Go to Progress tab
3. Add weight using "Add Weight" button
4. Complete some exercises
5. Logout and login as coach
6. Verify coach can see your updates

## Security Features

The implementation includes:
- **Row Level Security (RLS)**: Enforced at database level
- **Coach-Client Relationships**: Coaches only see assigned clients
- **Read-Only Access**: Coaches cannot modify client data
- **Secure Queries**: All queries check proper authentication
- **Privacy**: Clients' data is not visible to other coaches

## Next Steps

After setup, coaches should:
1. Verify they can see all assigned clients
2. Check that weight progress displays correctly
3. Confirm workout completions are visible
4. Test switching between multiple clients
5. Report any missing data or permissions issues

## Support

If issues persist:
1. Share browser console errors (F12 → Console)
2. Confirm migration ran successfully
3. Verify coach-client assignments in database
4. Check that clients have actually logged data
