import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dukpetyemyhszdcnkmug.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1a3BldHllbXloc3pkY25rbXVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM3MDU0OSwiZXhwIjoyMDc4OTQ2NTQ5fQ._CV8ER3i64QB7jOHq11KW3Tv38Kfm78Py7np3Xc7ASE'

// Use service role key for full permissions
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Male fitness coach photos from Unsplash
const maleCoachPhotos = [
  'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=800&q=80', // Athletic male trainer
  'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80', // Male fitness coach
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', // Muscular male coach
  'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&q=80', // Male personal trainer
  'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=80', // Professional male coach
  'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=800&q=80', // Male fitness instructor
]

async function updateAllPhotos() {
  console.log('🔄 Fetching all coaches with service role key...\n')

  const { data: coaches, error: fetchError } = await supabase
    .from('coach_profiles')
    .select('id, full_name, profile_photos')

  if (fetchError) {
    console.error('❌ Error fetching coaches:', fetchError)
    return
  }

  console.log(`✅ Found ${coaches.length} coaches\n`)

  // Update each coach
  for (let i = 0; i < coaches.length; i++) {
    const coach = coaches[i]
    const photoIndex = i % maleCoachPhotos.length
    const newPhotos = [maleCoachPhotos[photoIndex]]

    console.log(`🔄 Updating ${coach.full_name}...`)
    console.log(`   Old photo: ${coach.profile_photos?.[0] || 'None'}`)
    console.log(`   New photo: ${newPhotos[0]}`)

    const { data, error: updateError } = await supabase
      .from('coach_profiles')
      .update({ profile_photos: newPhotos })
      .eq('id', coach.id)
      .select()

    if (updateError) {
      console.error(`   ❌ FAILED: ${updateError.message}\n`)
    } else {
      console.log(`   ✅ SUCCESS!\n`)
    }
  }

  // Verify the updates
  console.log('🔍 Verifying all updates...\n')
  const { data: updatedCoaches, error: verifyError } = await supabase
    .from('coach_profiles')
    .select('full_name, profile_photos')
    .order('full_name')

  if (verifyError) {
    console.error('❌ Error verifying:', verifyError)
  } else {
    updatedCoaches.forEach((coach, index) => {
      console.log(`${index + 1}. ${coach.full_name}`)
      console.log(`   Photo: ${coach.profile_photos[0]}\n`)
    })
  }

  console.log('🎉 All coach photos have been updated to male coaches!')
  console.log('🔄 Refresh your browser to see the changes!')
}

updateAllPhotos()
