import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dukpetyemyhszdcnkmug.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1a3BldHllbXloc3pkY25rbXVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM3MDU0OSwiZXhwIjoyMDc4OTQ2NTQ5fQ._CV8ER3i64QB7jOHq11KW3Tv38Kfm78Py7np3Xc7ASE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addCoachIdColumn() {
  console.log('🔧 Adding coach_id column to client_profiles table...\n')

  // This needs to be run via SQL, so let's prepare the SQL
  const sql = `
    -- Add coach_id column to client_profiles
    ALTER TABLE client_profiles
    ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES coach_profiles(id) ON DELETE SET NULL;

    -- Add an index for better query performance
    CREATE INDEX IF NOT EXISTS idx_client_profiles_coach_id ON client_profiles(coach_id);
  `

  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

  if (error) {
    console.log('⚠️  Cannot add column via RPC. Here is the SQL to run manually:\n')
    console.log('=====================================')
    console.log(sql)
    console.log('=====================================')
    console.log('\nCopy the above SQL and run it in your Supabase SQL Editor.')
  } else {
    console.log('✅ Successfully added coach_id column!')
  }
}

addCoachIdColumn()
