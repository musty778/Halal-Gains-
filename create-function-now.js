import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dukpetyemyhszdcnkmug.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1a3BldHllbXloc3pkY25rbXVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM3MDU0OSwiZXhwIjoyMDc4OTQ2NTQ5fQ._CV8ER3i64QB7jOHq11KW3Tv38Kfm78Py7np3Xc7ASE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const functionSQL = `
-- Create a secure function to assign coach to client
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION assign_coach_to_client(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION assign_coach_to_client(UUID, UUID) TO anon;
`.trim()

async function createFunction() {
  console.log('🔧 Creating assign_coach_to_client function...\n')

  try {
    // Execute the SQL using a raw query
    const { data, error } = await supabase.rpc('exec', {
      sql: functionSQL
    })

    if (error) {
      // exec function might not exist, try alternative
      console.log('Trying alternative method...\n')

      // Since we can't directly execute DDL, let's use fetch
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ query: functionSQL })
      })

      if (!response.ok) {
        throw new Error('Could not create function automatically')
      }

      console.log('✅ Function created successfully!\n')
    } else {
      console.log('✅ Function created successfully!\n')
    }

    // Test the function
    console.log('🧪 Testing the function...')

    const { data: testResult, error: testError } = await supabase
      .rpc('assign_coach_to_client', {
        p_coach_user_id: 'test-uuid',
        p_client_user_id: 'test-uuid'
      })

    if (testError && testError.message.includes('invalid input syntax')) {
      // This is expected - invalid UUIDs
      console.log('✅ Function exists and is callable!\n')
    } else if (testError) {
      console.log('⚠️  Function created but got error:', testError.message)
    } else {
      console.log('✅ Function is working!\n')
    }

    console.log('🎉 Setup complete! Now refresh your browser and try again.')

  } catch (error) {
    console.error('❌ Automatic creation failed:', error.message)
    console.log('\n📋 Please run this SQL manually in Supabase SQL Editor:')
    console.log('https://supabase.com/dashboard/project/dukpetyemyhszdcnkmug/sql/new\n')
    console.log('='.repeat(70))
    console.log(functionSQL)
    console.log('='.repeat(70))
  }
}

createFunction()
