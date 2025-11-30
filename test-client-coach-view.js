import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dukpetyemyhszdcnkmug.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1a3BldHllbXloc3pkY25rbXVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM3MDU0OSwiZXhwIjoyMDc4OTQ2NTQ5fQ._CV8ER3i64QB7jOHq11KW3Tv38Kfm78Py7np3Xc7ASE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testClientCoachView() {
  console.log('🧪 Testing client coach view...\n')

  // Get all clients
  const { data: clients } = await supabase
    .from('client_profiles')
    .select('id, user_id, full_name, coach_id')

  console.log('📋 Client assignments:\n')

  for (const client of clients) {
    console.log(`Client: ${client.full_name}`)
    console.log(`  User ID: ${client.user_id}`)
    console.log(`  Coach ID: ${client.coach_id || 'Not assigned'}`)

    if (client.coach_id) {
      // Fetch coach details
      const { data: coach } = await supabase
        .from('coach_profiles')
        .select('full_name, profile_photos, bio, hourly_rate, specialisations')
        .eq('id', client.coach_id)
        .single()

      if (coach) {
        console.log(`  ✅ Coach: ${coach.full_name}`)
        console.log(`     Rate: $${coach.hourly_rate || 'N/A'}/hr`)
        console.log(`     Photo: ${coach.profile_photos?.[0] ? 'Yes' : 'No'}`)
      } else {
        console.log(`  ❌ Coach not found!`)
      }
    } else {
      console.log(`  ⚠️  No coach assigned`)
    }
    console.log('')
  }

  console.log('✅ Test complete!\n')
  console.log('💡 When the client logs in and goes to /coaches:')
  console.log('   - If coach_id exists: They will see the coach card')
  console.log('   - If coach_id is null: They will see "No Coach Assigned Yet"')
}

testClientCoachView()
