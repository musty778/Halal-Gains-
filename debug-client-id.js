import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dukpetyemyhszdcnkmug.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1a3BldHllbXloc3pkY25rbXVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM3MDU0OSwiZXhwIjoyMDc4OTQ2NTQ5fQ._CV8ER3i64QB7jOHq11KW3Tv38Kfm78Py7np3Xc7ASE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugClientId() {
  const clientIdFromConsole = '7c7a7d64-f612-42f1-aee2-98a7c26f6b8e'

  console.log('🔍 Debugging client ID:', clientIdFromConsole)
  console.log('')

  // Check if this ID exists in client_profiles
  const { data: clientProfile, error } = await supabase
    .from('client_profiles')
    .select('*')
    .eq('id', clientIdFromConsole)
    .single()

  console.log('Client Profile with this ID:')
  console.log(clientProfile)
  console.log('Error:', error)
  console.log('')

  // List all client profiles to see their IDs
  const { data: allClients } = await supabase
    .from('client_profiles')
    .select('id, user_id, full_name, coach_id')

  console.log('All client profiles:')
  allClients.forEach(client => {
    console.log(`  ${client.full_name}`)
    console.log(`    ID: ${client.id}`)
    console.log(`    User ID: ${client.user_id}`)
    console.log(`    Coach ID: ${client.coach_id || 'None'}`)
    console.log('')
  })

  // Check workout plans
  const { data: plans } = await supabase
    .from('workout_plans')
    .select('id, name, coach_id, client_id')

  console.log('All workout plans:')
  plans.forEach(plan => {
    console.log(`  ${plan.name}`)
    console.log(`    Plan ID: ${plan.id}`)
    console.log(`    Coach ID: ${plan.coach_id}`)
    console.log(`    Client ID: ${plan.client_id || 'None'}`)
    console.log('')
  })
}

debugClientId()
