import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dukpetyemyhszdcnkmug.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1a3BldHllbXloc3pkY25rbXVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM3MDU0OSwiZXhwIjoyMDc4OTQ2NTQ5fQ._CV8ER3i64QB7jOHq11KW3Tv38Kfm78Py7np3Xc7ASE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixWorkoutPlanClientIds() {
  console.log('🔧 Fixing workout plan client IDs...\n')

  // Get all workout plans with client_id
  const { data: plans } = await supabase
    .from('workout_plans')
    .select('id, name, client_id')
    .not('client_id', 'is', null)

  for (const plan of plans) {
    console.log(`\nPlan: ${plan.name}`)
    console.log(`  Current client_id: ${plan.client_id}`)

    // Check if this is a valid client_profiles.id
    const { data: clientByProfileId } = await supabase
      .from('client_profiles')
      .select('id, full_name, user_id')
      .eq('id', plan.client_id)
      .single()

    if (clientByProfileId) {
      console.log(`  ✅ Already correct - points to ${clientByProfileId.full_name}`)
      continue
    }

    // It might be a user_id instead, let's check
    const { data: clientByUserId } = await supabase
      .from('client_profiles')
      .select('id, full_name, user_id')
      .eq('user_id', plan.client_id)
      .single()

    if (clientByUserId) {
      console.log(`  ⚠️  Wrong ID type - using user_id instead of profile id`)
      console.log(`  Client: ${clientByUserId.full_name}`)
      console.log(`  Correct profile ID: ${clientByUserId.id}`)

      // Fix it
      const { error } = await supabase
        .from('workout_plans')
        .update({ client_id: clientByUserId.id })
        .eq('id', plan.id)

      if (error) {
        console.log(`  ❌ Error fixing: ${error.message}`)
      } else {
        console.log(`  ✅ Fixed!`)
      }
    } else {
      console.log(`  ❌ Cannot find client with this ID`)
    }
  }

  console.log('\n✅ Done!')
}

fixWorkoutPlanClientIds()
