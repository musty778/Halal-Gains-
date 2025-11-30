-- Create table for tracking workout exercise completions
CREATE TABLE IF NOT EXISTS workout_exercise_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
  client_user_id UUID NOT NULL,
  completion_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(exercise_id, client_user_id, completion_date)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_exercise_completions_client
  ON workout_exercise_completions(client_user_id, completion_date);

CREATE INDEX IF NOT EXISTS idx_exercise_completions_exercise
  ON workout_exercise_completions(exercise_id);

-- Enable RLS
ALTER TABLE workout_exercise_completions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own completions
CREATE POLICY "Users can view own completions"
  ON workout_exercise_completions
  FOR SELECT
  USING (auth.uid() = client_user_id);

-- Policy: Users can insert their own completions
CREATE POLICY "Users can insert own completions"
  ON workout_exercise_completions
  FOR INSERT
  WITH CHECK (auth.uid() = client_user_id);

-- Policy: Users can delete their own completions
CREATE POLICY "Users can delete own completions"
  ON workout_exercise_completions
  FOR DELETE
  USING (auth.uid() = client_user_id);

-- Function to toggle exercise completion
CREATE OR REPLACE FUNCTION toggle_exercise_completion(
  p_exercise_id UUID,
  p_completion_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_user_id UUID;
  v_existing_id UUID;
BEGIN
  -- Get the current user's ID
  v_client_user_id := auth.uid();

  IF v_client_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  -- Check if completion already exists
  SELECT id INTO v_existing_id
  FROM workout_exercise_completions
  WHERE exercise_id = p_exercise_id
    AND client_user_id = v_client_user_id
    AND completion_date = p_completion_date;

  IF v_existing_id IS NOT NULL THEN
    -- Completion exists, remove it (uncheck)
    DELETE FROM workout_exercise_completions
    WHERE id = v_existing_id;

    RETURN json_build_object(
      'success', true,
      'completed', false,
      'message', 'Exercise marked as incomplete'
    );
  ELSE
    -- Completion doesn't exist, add it (check)
    INSERT INTO workout_exercise_completions (exercise_id, client_user_id, completion_date)
    VALUES (p_exercise_id, v_client_user_id, p_completion_date);

    RETURN json_build_object(
      'success', true,
      'completed', true,
      'message', 'Exercise marked as complete'
    );
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION toggle_exercise_completion(UUID, DATE) TO authenticated;
