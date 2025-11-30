import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dukpetyemyhszdcnkmug.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1a3BldHllbXloc3pkY25rbXVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM3MDU0OSwiZXhwIjoyMDc4OTQ2NTQ5fQ._CV8ER3i64QB7jOHq11KW3Tv38Kfm78Py7np3Xc7ASE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkRelationship() {
  console.log('🔍 Checking database structure...\n')

  // Check client_profiles columns
  const { data: clientProfiles, error: clientError } = await supabase
    .from('client_profiles')
    .select('*')
    .limit(1)

  if (clientError) {
    console.log('❌ Error fetching client_profiles:', clientError.message)
  } else {
    console.log('✅ client_profiles columns:', clientProfiles.length > 0 ? Object.keys(clientProfiles[0]) : 'No data')
    console.log('Sample:', clientProfiles[0])
  }

  console.log('\n')

  // Check if there's a client_coach table
  const { data: clientCoach, error: ccError } = await supabase
    .from('client_coach')
    .select('*')
    .limit(1)

  if (ccError) {
    console.log('❌ No client_coach table:', ccError.message)
  } else {
    console.log('✅ client_coach table exists with columns:', Object.keys(clientCoach[0] || {}))
  }

  console.log('\n')

  // Check for coach_clients table
  const { data: coachClients, error: coachClientsError } = await supabase
    .from('coach_clients')
    .select('*')
    .limit(1)

  if (coachClientsError) {
    console.log('❌ No coach_clients table:', coachClientsError.message)
  } else {
    console.log('✅ coach_clients table exists with columns:', Object.keys(coachClients[0] || {}))
  }
}

checkRelationship()
