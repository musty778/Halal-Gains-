import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dukpetyemyhszdcnkmug.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1a3BldHllbXloc3pkY25rbXVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzNzA1NDksImV4cCI6MjA3ODk0NjU0OX0.jlUFy_UzoYuprcj62C8vt10YklvjUrXU0injcK-x65U'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Male fitness coach stock photos from Unsplash
const maleCoachPhotos = [
  'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=800&q=80', // Male coach with dumbbells
  'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=80', // Male coach portrait
  'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80', // Male trainer
  'https://images.unsplash.com/photo-1623874514711-0f321325f318?w=800&q=80', // Fitness coach
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', // Bodybuilding coach
]

async function updateCoachPhotos() {
  console.log('🔄 Fetching coaches from database...')

  // Fetch all coaches
  const { data: coaches, error: fetchError } = await supabase
    .from('coach_profiles')
    .select('id, full_name, profile_photos')

  if (fetchError) {
    console.error('❌ Error fetching coaches:', fetchError)
    return
  }

  if (!coaches || coaches.length === 0) {
    console.log('ℹ️  No coaches found in the database')
    return
  }

  console.log(`✅ Found ${coaches.length} coach(es)`)

  // Update each coach with a different male photo
  for (let i = 0; i < coaches.length; i++) {
    const coach = coaches[i]
    const photoIndex = i % maleCoachPhotos.length
    const newPhoto = [maleCoachPhotos[photoIndex]]

    console.log(`🔄 Updating ${coach.full_name}...`)

    const { error: updateError } = await supabase
      .from('coach_profiles')
      .update({ profile_photos: newPhoto })
      .eq('id', coach.id)

    if (updateError) {
      console.error(`❌ Error updating ${coach.full_name}:`, updateError)
    } else {
      console.log(`✅ Updated ${coach.full_name} with photo ${photoIndex + 1}`)
    }
  }

  console.log('\n🎉 All coach photos have been updated to male coaches!')
  console.log('🔄 Refresh your browser to see the changes')
}

updateCoachPhotos()
