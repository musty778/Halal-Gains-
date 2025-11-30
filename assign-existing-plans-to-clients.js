import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dukpetyemyhszdcnkmug.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1a3BldHllbXloc3pkY25rbXVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM3MDU0OSwiZXhwIjoyMDc4OTQ2NTQ5fQ._CV8ER3i64QB7jOHq11KW3Tv38Kfm78Py7np3Xc7ASE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function assignWorkoutPlansToClients() {
  console.log('📋 Assigning workout plans to clients...\n')

  // Get all coaches and their assigned clients
  const { data: coaches } = await supabase
    .from('coach_profiles')
    .select('id, user_id, full_name')

  for (const coach of coaches) {
    console.log(`\n👤 Coach: ${coach.full_name}`)

    // Find clients assigned to this coach
    const { data: clients } = await supabase
      .from('client_profiles')
      .select('id, user_id, full_name')
      .eq('coach_id', coach.id)

    if (!clients || clients.length === 0) {
      console.log('   No clients assigned')
      continue
    }

    console.log(`   Clients: ${clients.map(c => c.full_name).join(', ')}`)

    // Get workout plans created by this coach
    const { data: workoutPlans } = await supabase
      .from('workout_plans')
      .select('id, name, client_id')
      .eq('coach_id', coach.id)

    if (!workoutPlans || workoutPlans.length === 0) {
      console.log('   No workout plans found')
      continue
    }

    console.log(`   Workout plans: ${workoutPlans.length}`)

    // If coach has exactly 1 client, assign all plans to that client
    if (clients.length === 1) {
      const client = clients[0]

      for (const plan of workoutPlans) {
        if (!plan.client_id) {
          console.log(`   Assigning "${plan.name}" to ${client.full_name}`)

          const { error } = await supabase
            .from('workout_plans')
            .update({ client_id: client.id })
            .eq('id', plan.id)

          if (error) {
            console.log(`   ❌ Error: ${error.message}`)
          } else {
            console.log(`   ✅ Assigned successfully`)
          }
        } else {
          console.log(`   "${plan.name}" already assigned`)
        }
      }
    } else {
      console.log(`   ⚠️  Multiple clients - skipping auto-assignment`)
    }
  }

  console.log('\n✅ Done!')
}

assignWorkoutPlansToClients()
