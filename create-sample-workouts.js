import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Read .env file
const envFile = readFileSync('.env', 'utf-8')
const envVars = {}
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim()
  }
})

const supabaseUrl = envVars.VITE_SUPABASE_URL
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createSampleWorkouts() {
  try {
    console.log('🏋️ Creating sample workout plan...\n')

    // Get a client profile (we'll use the first one or one with "John" in the name)
    let { data: clients, error: clientError } = await supabase
      .from('client_profiles')
      .select('user_id, full_name')
      .ilike('full_name', '%John%')
      .limit(1)

    if (!clients || clients.length === 0) {
      // Try to get any client
      const result = await supabase
        .from('client_profiles')
        .select('user_id, full_name')
        .limit(1)

      clients = result.data
      clientError = result.error
    }

    if (clientError || !clients || clients.length === 0) {
      console.error('Error: No client profiles found')
      console.log('Please create a client profile first by signing up')
      return
    }

    const client = clients[0]
    console.log('✅ Found client:', client.full_name, '(ID:', client.user_id, ')')

    // Get or create a coach profile (we'll use the first coach or create one)
    let { data: coaches } = await supabase
      .from('coach_profiles')
      .select('id, user_id')
      .limit(1)

    let coachId
    if (coaches && coaches.length > 0) {
      coachId = coaches[0].id
      console.log('✅ Found existing coach:', coachId)
    } else {
      console.log('ℹ️  No coach found, you can assign one later')
      coachId = null
    }

    // Create workout plan
    const { data: workoutPlan, error: planError } = await supabase
      .from('workout_plans')
      .insert({
        client_id: client.user_id,
        coach_id: coachId,
        name: 'Beginner Full Body Program',
        description: 'A balanced full body workout plan for beginners'
      })
      .select()
      .single()

    if (planError) {
      console.error('Error creating workout plan:', planError)
      return
    }

    console.log('✅ Created workout plan:', workoutPlan.name)

    // Create a workout week
    const { data: workoutWeek, error: weekError } = await supabase
      .from('workout_weeks')
      .insert({
        workout_plan_id: workoutPlan.id,
        week_number: 1
      })
      .select()
      .single()

    if (weekError) {
      console.error('Error creating workout week:', weekError)
      return
    }

    console.log('✅ Created workout week 1')

    // Define workout days for the week
    const workoutDays = [
      {
        day_of_week: 0, // Sunday
        workout_type: 'rest',
        exercises: []
      },
      {
        day_of_week: 1, // Monday
        workout_type: 'upper_body',
        exercises: [
          { exercise_name: 'Push-ups', sets: 3, reps: 12, exercise_order: 1 },
          { exercise_name: 'Dumbbell Rows', sets: 3, reps: 10, exercise_order: 2 },
          { exercise_name: 'Shoulder Press', sets: 3, reps: 10, exercise_order: 3 },
          { exercise_name: 'Bicep Curls', sets: 3, reps: 12, exercise_order: 4 }
        ]
      },
      {
        day_of_week: 2, // Tuesday
        workout_type: 'cardio',
        exercises: [
          { exercise_name: 'Running', sets: 1, reps: 30, exercise_order: 1 },
          { exercise_name: 'Jump Rope', sets: 3, reps: 100, exercise_order: 2 }
        ]
      },
      {
        day_of_week: 3, // Wednesday
        workout_type: 'lower_body',
        exercises: [
          { exercise_name: 'Squats', sets: 4, reps: 12, exercise_order: 1 },
          { exercise_name: 'Lunges', sets: 3, reps: 10, exercise_order: 2 },
          { exercise_name: 'Leg Press', sets: 3, reps: 12, exercise_order: 3 },
          { exercise_name: 'Calf Raises', sets: 3, reps: 15, exercise_order: 4 }
        ]
      },
      {
        day_of_week: 4, // Thursday
        workout_type: 'rest',
        exercises: []
      },
      {
        day_of_week: 5, // Friday
        workout_type: 'full_body',
        exercises: [
          { exercise_name: 'Deadlifts', sets: 3, reps: 8, exercise_order: 1 },
          { exercise_name: 'Bench Press', sets: 3, reps: 10, exercise_order: 2 },
          { exercise_name: 'Pull-ups', sets: 3, reps: 8, exercise_order: 3 },
          { exercise_name: 'Plank', sets: 3, reps: 60, exercise_order: 4 }
        ]
      },
      {
        day_of_week: 6, // Saturday
        workout_type: 'cardio',
        exercises: [
          { exercise_name: 'Cycling', sets: 1, reps: 45, exercise_order: 1 },
          { exercise_name: 'HIIT Training', sets: 5, reps: 3, exercise_order: 2 }
        ]
      }
    ]

    // Create workout days and exercises
    for (const day of workoutDays) {
      const { data: workoutDay, error: dayError } = await supabase
        .from('workout_days')
        .insert({
          workout_week_id: workoutWeek.id,
          day_of_week: day.day_of_week,
          workout_type: day.workout_type
        })
        .select()
        .single()

      if (dayError) {
        console.error(`Error creating workout day for day ${day.day_of_week}:`, dayError)
        continue
      }

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      console.log(`✅ Created ${dayNames[day.day_of_week]} - ${day.workout_type}`)

      // Create exercises for this day
      if (day.exercises.length > 0) {
        const exercisesWithDayId = day.exercises.map(ex => ({
          ...ex,
          workout_day_id: workoutDay.id
        }))

        const { error: exercisesError } = await supabase
          .from('workout_exercises')
          .insert(exercisesWithDayId)

        if (exercisesError) {
          console.error(`  ❌ Error creating exercises:`, exercisesError)
        } else {
          console.log(`  ✅ Added ${day.exercises.length} exercises`)
        }
      }
    }

    console.log('\n🎉 Successfully created sample workout plan!')
    console.log('📱 Refresh your dashboard to see the workout pills!')

  } catch (error) {
    console.error('Error:', error)
  }
}

createSampleWorkouts()
