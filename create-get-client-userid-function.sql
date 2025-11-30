CREATE OR REPLACE FUNCTION get_client_user_id_from_profile(
  p_client_profile_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT user_id INTO v_user_id
  FROM client_profiles
  WHERE id = p_client_profile_id;

  RETURN v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_client_user_id_from_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_client_user_id_from_profile(UUID) TO anon;
