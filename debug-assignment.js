import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dukpetyemyhszdcnkmug.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1a3BldHllbXloc3pkY25rbXVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM3MDU0OSwiZXhwIjoyMDc4OTQ2NTQ5fQ._CV8ER3i64QB7jOHq11KW3Tv38Kfm78Py7np3Xc7ASE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugAssignment() {
  console.log('🔍 Debugging coach assignment...\n')

  // 1. Check if coach_id column exists
  console.log('1. Checking if coach_id column exists...')
  const { data: clientProfiles, error: columnError } = await supabase
    .from('client_profiles')
    .select('*')
    .limit(1)

  if (columnError) {
    console.log('❌ Error fetching client_profiles:', columnError.message)
    return
  }

  if (clientProfiles && clientProfiles.length > 0) {
    const columns = Object.keys(clientProfiles[0])
    console.log('   Columns in client_profiles:', columns)

    if (columns.includes('coach_id')) {
      console.log('   ✅ coach_id column EXISTS\n')
    } else {
      console.log('   ❌ coach_id column DOES NOT EXIST')
      console.log('   You need to run this SQL:\n')
      console.log('   ALTER TABLE client_profiles')
      console.log('   ADD COLUMN coach_id UUID REFERENCES coach_profiles(id) ON DELETE SET NULL;\n')
      return
    }
  }

  // 2. Get a sample client and coach
  console.log('2. Getting sample client and coach...')

  const { data: clients } = await supabase
    .from('client_profiles')
    .select('id, user_id, full_name, coach_id')
    .limit(1)

  const { data: coaches } = await supabase
    .from('coach_profiles')
    .select('id, user_id, full_name')
    .limit(1)

  if (!clients || clients.length === 0) {
    console.log('   ❌ No clients found')
    return
  }

  if (!coaches || coaches.length === 0) {
    console.log('   ❌ No coaches found')
    return
  }

  const client = clients[0]
  const coach = coaches[0]

  console.log(`   Client: ${client.full_name} (user_id: ${client.user_id})`)
  console.log(`   Coach: ${coach.full_name} (coach_id: ${coach.id})`)
  console.log(`   Current coach_id: ${client.coach_id || 'None'}\n`)

  // 3. Try to assign coach to client
  console.log('3. Testing assignment...')
  const { data: updateData, error: updateError } = await supabase
    .from('client_profiles')
    .update({ coach_id: coach.id })
    .eq('user_id', client.user_id)
    .select()

  if (updateError) {
    console.log('   ❌ Assignment FAILED')
    console.log('   Error:', updateError.message)
    console.log('   Code:', updateError.code)
    console.log('   Details:', updateError.details)
    console.log('   Hint:', updateError.hint)
  } else {
    console.log('   ✅ Assignment SUCCESSFUL')
    console.log('   Updated data:', updateData)
  }

  // 4. Verify the assignment
  console.log('\n4. Verifying assignment...')
  const { data: verifyData } = await supabase
    .from('client_profiles')
    .select('coach_id')
    .eq('user_id', client.user_id)
    .single()

  if (verifyData && verifyData.coach_id === coach.id) {
    console.log('   ✅ Verification SUCCESSFUL')
    console.log(`   Client is now assigned to coach: ${coach.id}`)
  } else {
    console.log('   ❌ Verification FAILED')
    console.log('   Current coach_id:', verifyData?.coach_id)
  }

  console.log('\n✅ Debug complete!')
}

debugAssignment()
