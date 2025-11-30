import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dukpetyemyhszdcnkmug.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1a3BldHllbXloc3pkY25rbXVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM3MDU0OSwiZXhwIjoyMDc4OTQ2NTQ5fQ._CV8ER3i64QB7jOHq11KW3Tv38Kfm78Py7np3Xc7ASE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addCoachColumn() {
  console.log('🔧 Adding coach_id column via SQL query...\n')

  try {
    // Try using raw SQL query via the REST API
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES coach_profiles(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_client_profiles_coach_id ON client_profiles(coach_id);
      `
    })

    if (error) {
      console.log('⚠️  RPC method not available.')
      console.log('Trying alternative method...\n')

      // Alternative: Use postgres schema to add column
      const result = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'POST',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        }
      })

      throw new Error('Cannot add column automatically. Manual SQL required.')
    }

    console.log('✅ Column added successfully!')
    await assignCoaches()

  } catch (err) {
    console.log('❌ Automatic method failed.\n')
    console.log('📋 Please run this SQL manually in Supabase SQL Editor:')
    console.log('=' .repeat(70))
    console.log(`
-- Go to: https://supabase.com/dashboard/project/dukpetyemyhszdcnkmug/sql/new
-- Then paste and run this:

ALTER TABLE client_profiles
ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES coach_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_client_profiles_coach_id ON client_profiles(coach_id);

UPDATE client_profiles
SET coach_id = 'a9685dd4-d2f3-4c4f-9f34-8a04ea0e0f09'
WHERE coach_id IS NULL;
    `.trim())
    console.log('=' .repeat(70))
    console.log('\nAfter running the SQL, your Coaches page will work!')
  }
}

async function assignCoaches() {
  console.log('🔄 Assigning coaches to clients...\n')

  // Get first coach
  const { data: coaches } = await supabase
    .from('coach_profiles')
    .select('id, full_name')
    .limit(1)

  if (!coaches || coaches.length === 0) {
    console.log('❌ No coaches found')
    return
  }

  const coach = coaches[0]
  console.log(`📌 Using coach: ${coach.full_name}`)

  // Update all clients
  const { error: updateError } = await supabase
    .from('client_profiles')
    .update({ coach_id: coach.id })
    .is('coach_id', null)

  if (updateError) {
    console.log('❌ Error assigning coaches:', updateError.message)
  } else {
    console.log('✅ All clients assigned to coach!')
    console.log('\n🎉 Setup complete! Refresh your browser.')
  }
}

addCoachColumn()
