import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dukpetyemyhszdcnkmug.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1a3BldHllbXloc3pkY25rbXVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM3MDU0OSwiZXhwIjoyMDc4OTQ2NTQ5fQ._CV8ER3i64QB7jOHq11KW3Tv38Kfm78Py7np3Xc7ASE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugProfile() {
  console.log('🔍 Debugging profile issues...\n')

  // Check all client profiles
  const { data: clients, error: clientError } = await supabase
    .from('client_profiles')
    .select('*')

  if (clientError) {
    console.log('❌ Error fetching client profiles:', clientError.message)
    console.log('Full error:', clientError)
    return
  }

  console.log(`✅ Found ${clients.length} client profile(s):\n`)
  clients.forEach((client, index) => {
    console.log(`${index + 1}. ${client.full_name}`)
    console.log(`   User ID: ${client.user_id}`)
    console.log(`   Coach ID: ${client.coach_id || 'None'}`)
    console.log(`   Columns:`, Object.keys(client))
    console.log('')
  })

  // Check if coach_id column exists
  console.log('\n🔍 Checking if coach_id column exists...')
  const firstClient = clients[0]
  if (firstClient && 'coach_id' in firstClient) {
    console.log('✅ coach_id column exists!')
  } else {
    console.log('❌ coach_id column does NOT exist!')
    console.log('   You need to run the SQL from SETUP_COACH_FEATURE.sql')
  }

  // Check coaches
  const { data: coaches, error: coachError } = await supabase
    .from('coach_profiles')
    .select('id, full_name')

  if (coachError) {
    console.log('\n❌ Error fetching coaches:', coachError.message)
  } else {
    console.log(`\n✅ Found ${coaches.length} coach(es)`)
    coaches.forEach(coach => {
      console.log(`   - ${coach.full_name} (${coach.id})`)
    })
  }
}

debugProfile()
