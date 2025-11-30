-- Run this query to check if you have any weight data
-- This will show you all weight tracking records in your database

SELECT
  cwt.id,
  cwt.client_user_id,
  cwt.week_number,
  cwt.weight_kg,
  cwt.weight_lost_kg,
  cwt.measurement_date,
  wp.name as workout_plan_name,
  cp.full_name as client_name
FROM client_weight_tracking cwt
LEFT JOIN workout_plans wp ON cwt.workout_plan_id = wp.id
LEFT JOIN client_profiles cp ON cwt.client_user_id = cp.user_id
ORDER BY cwt.created_at DESC;

-- If this returns no rows, it means you haven't added any weight data yet
-- You need to complete a workout week first, then the weight modal will appear
