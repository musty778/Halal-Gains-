CREATE OR REPLACE FUNCTION assign_workout_plan_to_client(
  p_workout_plan_id UUID,
  p_client_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_profile_id UUID;
BEGIN
  SELECT id INTO v_client_profile_id
  FROM client_profiles
  WHERE user_id = p_client_user_id;

  IF v_client_profile_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Client profile not found'
    );
  END IF;

  UPDATE workout_plans
  SET client_id = v_client_profile_id,
      updated_at = NOW()
  WHERE id = p_workout_plan_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Workout plan not found'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'client_id', v_client_profile_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION assign_workout_plan_to_client(UUID, UUID) TO authenticated;
