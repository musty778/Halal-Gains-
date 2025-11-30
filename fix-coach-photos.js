import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dukpetyemyhszdcnkmug.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1a3BldHllbXloc3pkY25rbXVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzNzA1NDksImV4cCI6MjA3ODk0NjU0OX0.jlUFy_UzoYuprcj62C8vt10YklvjUrXU0injcK-x65U'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Male fitness coach photos from Unsplash (verified male coaches)
const maleCoachPhotos = [
  'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=800&q=80', // Athletic male trainer
  'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80', // Male fitness coach
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', // Muscular male coach
  'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&q=80', // Male personal trainer
  'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=80', // Professional male coach
  'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=800&q=80', // Male fitness instructor
]

async function fixCoachPhotos() {
  console.log('🔄 Fetching all coaches...\n')

  const { data: coaches, error: fetchError } = await supabase
    .from('coach_profiles')
    .select('id, full_name, profile_photos')

  if (fetchError) {
    console.error('❌ Error:', fetchError)
    return
  }

  console.log(`Found ${coaches.length} coaches\n`)

  // Update each coach
  for (let i = 0; i < coaches.length; i++) {
    const coach = coaches[i]
    const photoIndex = i % maleCoachPhotos.length
    const newPhotos = [maleCoachPhotos[photoIndex]]

    console.log(`🔄 Updating ${coach.full_name}...`)
    console.log(`   Old: ${coach.profile_photos?.[0] || 'None'}`)
    console.log(`   New: ${newPhotos[0]}`)

    const { error: updateError } = await supabase
      .from('coach_profiles')
      .update({
        profile_photos: newPhotos
      })
      .eq('id', coach.id)

    if (updateError) {
      console.error(`❌ Failed to update ${coach.full_name}:`, updateError)
    } else {
      console.log(`✅ Successfully updated ${coach.full_name}\n`)
    }
  }

  console.log('🎉 All coach photos updated to male coaches!')
  console.log('🔄 Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R) to see changes')
}

fixCoachPhotos()
