import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dukpetyemyhszdcnkmug.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1a3BldHllbXloc3pkY25rbXVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzNzA1NDksImV4cCI6MjA3ODk0NjU0OX0.jlUFy_UzoYuprcj62C8vt10YklvjUrXU0injcK-x65U'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function verifyPhotos() {
  console.log('🔍 Checking current coach photos in database...\n')

  const { data: coaches, error } = await supabase
    .from('coach_profiles')
    .select('id, full_name, profile_photos')

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  coaches.forEach((coach, index) => {
    console.log(`${index + 1}. ${coach.full_name}`)
    console.log(`   Photos: ${JSON.stringify(coach.profile_photos)}\n`)
  })
}

verifyPhotos()
