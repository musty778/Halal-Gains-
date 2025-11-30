import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dukpetyemyhszdcnkmug.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1a3BldHllbXloc3pkY25rbXVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM3MDU0OSwiZXhwIjoyMDc4OTQ2NTQ5fQ._CV8ER3i64QB7jOHq11KW3Tv38Kfm78Py7np3Xc7ASE'

async function setupCoachAssignment() {
  console.log('🔧 Setting up coach assignment feature...\n')

  // SQL to add coach_id column
  const sql = `
-- Add coach_id column to client_profiles
ALTER TABLE client_profiles
ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES coach_profiles(id) ON DELETE SET NULL;

-- Add an index for better query performance
CREATE INDEX IF NOT EXISTS idx_client_profiles_coach_id ON client_profiles(coach_id);
  `.trim()

  console.log('📝 SQL to execute:')
  console.log('=' .repeat(60))
  console.log(sql)
  console.log('=' .repeat(60))
  console.log('\n')

  // Try to execute via Management API
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ query: sql })
    })

    if (response.ok) {
      console.log('✅ Column added successfully via API!')
    } else {
      throw new Error('API method failed')
    }
  } catch (error) {
    console.log('⚠️  Could not add column automatically.')
    console.log('\n📋 MANUAL STEPS REQUIRED:')
    console.log('1. Go to: https://supabase.com/dashboard/project/dukpetyemyhszdcnkmug/sql/new')
    console.log('2. Copy and paste the SQL above')
    console.log('3. Click "Run" to execute')
    console.log('4. Come back here and run this script again\n')

    // Check if column already exists
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data: testData, error: testError } = await supabase
      .from('client_profiles')
      .select('coach_id')
      .limit(1)

    if (!testError) {
      console.log('✅ Good news! The column already exists!')
      await assignCoach(supabase)
    } else {
      console.log('❌ Column does not exist yet. Please run the SQL manually.')
      process.exit(1)
    }
  }
}

async function assignCoach(supabase) {
  console.log('\n🔄 Assigning a coach to your account...\n')

  // Get the first coach
  const { data: coaches, error: coachError } = await supabase
    .from('coach_profiles')
    .select('id, full_name')
    .limit(1)

  if (coachError || !coaches || coaches.length === 0) {
    console.log('❌ No coaches found in database')
    return
  }

  const selectedCoach = coaches[0]
  console.log(`✅ Found coach: ${selectedCoach.full_name}`)

  // Get current user's client profile
  const { data: clients, error: clientError } = await supabase
    .from('client_profiles')
    .select('id, user_id, full_name, coach_id')

  if (clientError) {
    console.log('❌ Error fetching clients:', clientError.message)
    return
  }

  if (!clients || clients.length === 0) {
    console.log('ℹ️  No client profiles found')
    return
  }

  console.log(`\nFound ${clients.length} client(s):\n`)

  // Update each client without a coach
  for (const client of clients) {
    if (client.coach_id) {
      console.log(`⏭️  ${client.full_name} already has a coach assigned`)
      continue
    }

    const { error: updateError } = await supabase
      .from('client_profiles')
      .update({ coach_id: selectedCoach.id })
      .eq('id', client.id)

    if (updateError) {
      console.log(`❌ Failed to assign coach to ${client.full_name}:`, updateError.message)
    } else {
      console.log(`✅ Assigned ${selectedCoach.full_name} to ${client.full_name}`)
    }
  }

  console.log('\n🎉 Setup complete!')
  console.log('🔄 Refresh your browser and go to the Coaches menu to see your assigned coach!')
}

setupCoachAssignment()
