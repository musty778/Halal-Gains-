ALTER TABLE workout_plans
DROP CONSTRAINT IF EXISTS workout_plans_client_id_fkey;

ALTER TABLE workout_plans
ADD CONSTRAINT workout_plans_client_id_fkey
FOREIGN KEY (client_id)
REFERENCES client_profiles(id)
ON DELETE SET NULL;
