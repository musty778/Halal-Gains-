import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dukpetyemyhszdcnkmug.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1a3BldHllbXloc3pkY25rbXVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM3MDU0OSwiZXhwIjoyMDc4OTQ2NTQ5fQ._CV8ER3i64QB7jOHq11KW3Tv38Kfm78Py7np3Xc7ASE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('🚀 FINAL ATTEMPT - Using direct SQL function creation...\n')

  console.log('Creating temporary migration function...')

  // Step 1: Create a PostgreSQL function that will run our migration
  const createFunctionSQL = `
CREATE OR REPLACE FUNCTION run_coach_id_migration()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Add the column
  ALTER TABLE client_profiles
  ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES coach_profiles(id) ON DELETE SET NULL;

  -- Add index
  CREATE INDEX IF NOT EXISTS idx_client_profiles_coach_id ON client_profiles(coach_id);

  -- Assign coaches
  UPDATE client_profiles
  SET coach_id = (SELECT id FROM coach_profiles ORDER BY created_at LIMIT 1)
  WHERE coach_id IS NULL;

  RETURN 'Migration completed successfully!';
END;
$$;
  `.trim()

  // Step 2: Try to create the function
  try {
    const { data, error } = await supabase.rpc('run_coach_id_migration')

    if (error && error.message.includes('does not exist')) {
      console.log("Function doesn't exist yet. Creating it...\n")

      // Since we can't create functions via RPC, we need to inform the user
      console.log('⚠️  Unable to create functions automatically.\n')
      console.log('📋 SIMPLEST SOLUTION:')
      console.log('=' .repeat(70))
      console.log('\n1. Click this link to open Supabase SQL Editor:')
      console.log('   https://supabase.com/dashboard/project/dukpetyemyhszdcnkmug/sql/new\n')
      console.log('2. Paste this simple SQL and click "Run":\n')
      console.log(`
ALTER TABLE client_profiles
ADD COLUMN coach_id UUID REFERENCES coach_profiles(id) ON DELETE SET NULL;

CREATE INDEX idx_client_profiles_coach_id ON client_profiles(coach_id);

UPDATE client_profiles
SET coach_id = (SELECT id FROM coach_profiles ORDER BY created_at LIMIT 1)
WHERE coach_id IS NULL;
      `.trim())
      console.log('\n' + '='.repeat(70))
      console.log("\n3. That's it! Refresh your browser and go to Coaches menu.\n")

    } else if (error) {
      console.log('❌ Error:', error.message)
    } else {
      console.log('✅ Success:', data)

      // Verify
      const { data: clients } = await supabase
        .from('client_profiles')
        .select('full_name, coach_id')

      console.log('\n✅ Migration complete!')
      console.log('\n👥 Client assignments:')
      clients.forEach(c => {
        console.log(`   - ${c.full_name}: ${c.coach_id ? 'Assigned ✅' : 'Not assigned'}`)
      })
      console.log('\n🎉 Refresh your browser to see your coach!')
    }
  } catch (err) {
    console.log('❌ Error:', err.message)
  }
}

runMigration()
