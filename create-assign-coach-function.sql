-- Create a secure function to assign coach to client
-- This function runs with elevated permissions and can be called from the frontend

CREATE OR REPLACE FUNCTION assign_coach_to_client(
  p_coach_user_id UUID,
  p_client_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coach_profile_id UUID;
  v_result JSON;
BEGIN
  -- Get the coach's profile ID
  SELECT id INTO v_coach_profile_id
  FROM coach_profiles
  WHERE user_id = p_coach_user_id;

  -- Check if coach profile exists
  IF v_coach_profile_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Coach profile not found'
    );
  END IF;

  -- Update the client's coach_id
  UPDATE client_profiles
  SET coach_id = v_coach_profile_id,
      updated_at = NOW()
  WHERE user_id = p_client_user_id;

  -- Check if update was successful
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Client profile not found'
    );
  END IF;

  -- Return success
  RETURN json_build_object(
    'success', true,
    'coach_id', v_coach_profile_id
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION assign_coach_to_client(UUID, UUID) TO authenticated;

-- Also grant to anon for testing (you can remove this later if needed)
GRANT EXECUTE ON FUNCTION assign_coach_to_client(UUID, UUID) TO anon;
