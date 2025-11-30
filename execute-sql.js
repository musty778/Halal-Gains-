import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dukpetyemyhszdcnkmug.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1a3BldHllbXloc3pkY25rbXVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM3MDU0OSwiZXhwIjoyMDc4OTQ2NTQ5fQ._CV8ER3i64QB7jOHq11KW3Tv38Kfm78Py7np3Xc7ASE'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' }
})

async function executeSQL() {
  console.log('🔧 Attempting to add coach_id column...\n')

  try {
    // Try using the PostgreSQL REST API endpoint
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({
        query: `
          ALTER TABLE client_profiles
          ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES coach_profiles(id) ON DELETE SET NULL;

          CREATE INDEX IF NOT EXISTS idx_client_profiles_coach_id ON client_profiles(coach_id);
        `
      })
    })

    const result = await response.json()
    console.log('Response:', result)

  } catch (error) {
    console.error('❌ Error:', error.message)
  }

  console.log('\n📋 Please run the SQL manually:')
  console.log('1. Go to https://supabase.com/dashboard')
  console.log('2. Select your project')
  console.log('3. Go to SQL Editor')
  console.log('4. Run the SQL from setup-coach-assignment.sql file')
}

executeSQL()
