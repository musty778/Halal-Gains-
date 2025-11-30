# Coach View Quick Setup (2 Minutes)

## What's New? 🎉

Coaches can now see their clients':
- ✅ Weight progress and tracking
- ✅ Completed workout weeks
- ✅ Exercise performance details
- ✅ Workout ratings and notes

## Setup Steps

### Step 1: Run SQL Migration (1 minute)

1. Open **Supabase Dashboard** → https://supabase.com/dashboard
2. Go to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy ALL contents from: `ENABLE_COACH_VIEW_PROGRESS.sql`
5. Paste into SQL Editor
6. Click **Run**
7. Wait for "Success. No rows returned"

### Step 2: Test Coach View (1 minute)

1. **Build and Run** your app:
   ```bash
   npm run dev
   ```

2. **Login as a Coach**

3. **Go to Progress Tab**
   - You'll see "📊 Client Progress" at the top
   - Client selector dropdown will appear

4. **Select a Client**
   - Choose a client from the dropdown
   - Their data loads automatically

5. **What You'll See**:
   - **Weight Progress Section**:
     - Current weight, starting weight, total change
     - Weekly weight history with changes
   - **Workout Weeks**:
     - Completed weeks with green checkmarks
     - Completion percentage for each day
     - Exercise details with sets, reps, weights
     - Client notes and ratings

## Expected Behavior

### As a Coach:
- ✅ See dropdown to select clients
- ✅ View client weight progress
- ✅ See completed workouts
- ✅ View exercise performance
- ❌ No "Add Weight" button (view only)
- ❌ No "Log Workout" buttons (view only)

### As a Client:
- ✅ See "My Progress" (no dropdown)
- ✅ "Add Weight" button visible
- ✅ "Log Workout" buttons visible
- ✅ Can add and edit own data

## Troubleshooting

### "No Clients Yet" Message
**Cause**: No clients assigned to this coach
**Fix**:
- Assign clients to the coach in the database
- Verify `client_profiles.coach_id` points to this coach

### Can't See Client Weight
**Cause**: Migration not run or client has no weight data
**Fix**:
1. Verify migration ran successfully
2. Ask client to add weight using "Add Weight" button
3. Check browser console (F12) for errors

### Can't See Completed Workouts
**Cause**: Client hasn't completed any workouts
**Fix**:
- Client needs to log workouts first
- Verify client has workout plans assigned

## Quick Test

1. **As Client**:
   - Login
   - Go to Progress → Click "Add Weight"
   - Enter Week 1, Weight 75 kg → Save
   - Complete a workout day

2. **As Coach**:
   - Login
   - Go to Progress
   - Select the client
   - You should see:
     - Weight: 75 kg
     - Completed workout with green checkmark

## Files Created

- `ENABLE_COACH_VIEW_PROGRESS.sql` - SQL to run in Supabase
- `supabase/migrations/20251130180946_enable_coach_view_progress.sql` - Migration file
- `COACH_PROGRESS_VIEW_SETUP.md` - Detailed documentation
- Updated `src/pages/Progress.tsx` - Full coach view implementation

## Summary of Changes

### Database (SQL):
- Updated RLS policies for `client_weight_tracking`
- Updated RLS policies for `workout_day_completions`
- Updated RLS policies for `exercise_completions`
- Coaches can now view (read-only) their clients' data

### Frontend (React):
- Added client selector for coaches
- Fetch client list for coaches
- Display selected client's weight progress
- Show selected client's workout completions
- Hide edit buttons for coaches (view-only mode)
- Auto-refresh data when switching clients

That's it! Your coaches can now monitor client progress! 🎊
