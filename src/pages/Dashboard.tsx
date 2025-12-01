import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { Dumbbell } from 'lucide-react'

interface WorkoutPlan {
  id: string
  name: string
}

interface WorkoutWeek {
  id: string
  week_number: number
}

interface WorkoutDay {
  id: string
  day_of_week: number
  workout_type: string
  exercises: WorkoutExercise[]
  completion?: WorkoutDayCompletion
}

interface WorkoutExercise {
  id: string
  exercise_name: string
  sets: number | null
  reps: number | null
  exercise_order: number
}

interface WorkoutDayCompletion {
  id: string
  exercise_completions: ExerciseCompletion[]
}

interface ExerciseCompletion {
  id: string
  workout_exercise_id: string
  completed: boolean
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const Dashboard = () => {
  const navigate = useNavigate()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [clientName, setClientName] = useState<string>('')
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null)
  const [todayWorkout, setTodayWorkout] = useState<WorkoutDay | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentWeek, setCurrentWeek] = useState<WorkoutWeek | null>(null)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }
      setCurrentUserId(user.id)

      // Get client profile
      const { data: profile } = await supabase
        .from('client_profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single()

      if (profile) {
        setClientName(profile.full_name)
      }
    }

    checkUser()
  }, [navigate])

  useEffect(() => {
    if (currentUserId) {
      fetchWorkoutPlan()
    }
  }, [currentUserId])

  const fetchWorkoutPlan = async () => {
    if (!currentUserId) return

    setLoading(true)

    // Get the client's workout plan
    const { data: plans } = await supabase
      .from('workout_plans')
      .select('id, name')
      .eq('client_id', currentUserId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (!plans || plans.length === 0) {
      setLoading(false)
      return
    }

    setWorkoutPlan(plans[0])

    // Get current week
    const { data: weeks } = await supabase
      .from('workout_weeks')
      .select('*')
      .eq('workout_plan_id', plans[0].id)
      .order('week_number', { ascending: true })
      .limit(1)

    if (weeks && weeks.length > 0) {
      setCurrentWeek(weeks[0])

      // Get today's day of week (0 = Sunday, 6 = Saturday)
      const today = new Date().getDay()

      // Get today's workout
      const { data: days } = await supabase
        .from('workout_days')
        .select('*')
        .eq('workout_week_id', weeks[0].id)
        .eq('day_of_week', today)
        .single()

      if (days) {
        // Get exercises for this day
        const { data: exercises } = await supabase
          .from('workout_exercises')
          .select('*')
          .eq('workout_day_id', days.id)
          .order('exercise_order', { ascending: true })

        // Get completion data
        const { data: completionData } = await supabase
          .from('workout_day_completions')
          .select('*')
          .eq('workout_day_id', days.id)
          .eq('user_id', currentUserId)
          .order('completed_at', { ascending: false })
          .limit(1)
          .single()

        let completion = undefined
        if (completionData) {
          const { data: exerciseCompletions } = await supabase
            .from('exercise_completions')
            .select('*')
            .eq('workout_day_completion_id', completionData.id)

          completion = {
            ...completionData,
            exercise_completions: exerciseCompletions || []
          }
        }

        setTodayWorkout({
          ...days,
          exercises: exercises || [],
          completion
        })
      }
    }

    setLoading(false)
  }

  const handleToggleExercise = async (exerciseId: string, currentlyCompleted: boolean) => {
    if (!currentUserId || !todayWorkout) return

    try {
      // Get or create day completion
      let completionId = todayWorkout.completion?.id

      if (!completionId) {
        const { data, error } = await supabase
          .from('workout_day_completions')
          .insert({
            workout_day_id: todayWorkout.id,
            user_id: currentUserId
          })
          .select()
          .single()

        if (error) throw error
        completionId = data.id
      }

      // Check if exercise completion exists
      const existingCompletion = todayWorkout.completion?.exercise_completions.find(
        ec => ec.workout_exercise_id === exerciseId
      )

      if (existingCompletion) {
        // Update existing
        await supabase
          .from('exercise_completions')
          .update({ completed: !currentlyCompleted })
          .eq('id', existingCompletion.id)
      } else {
        // Create new
        await supabase
          .from('exercise_completions')
          .insert({
            workout_day_completion_id: completionId,
            workout_exercise_id: exerciseId,
            completed: true
          })
      }

      // Refresh workout data
      await fetchWorkoutPlan()
    } catch (error) {
      console.error('Error toggling exercise:', error)
    }
  }

  const isExerciseCompleted = (exerciseId: string): boolean => {
    if (!todayWorkout?.completion) return false
    const completion = todayWorkout.completion.exercise_completions.find(
      ec => ec.workout_exercise_id === exerciseId
    )
    return completion?.completed || false
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Salaam, {clientName || 'there'}
          </h1>
          <p className="text-gray-600">
            {todayWorkout ? `You have ${todayWorkout.exercises.length} exercises today.` : 'No workout scheduled for today.'}
          </p>
        </div>

        {/* Today's Workout Card */}
        {todayWorkout && todayWorkout.workout_type !== 'rest' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Dumbbell className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Today's Workout</h2>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                {todayWorkout.workout_type.charAt(0).toUpperCase() + todayWorkout.workout_type.slice(1)}
              </span>
            </div>

            {/* Exercise List */}
            <div className="space-y-4 mb-6">
              {todayWorkout.exercises.map((exercise) => {
                const completed = isExerciseCompleted(exercise.id)
                return (
                  <div
                    key={exercise.id}
                    className="flex items-center gap-4 group cursor-pointer"
                    onClick={() => handleToggleExercise(exercise.id, completed)}
                  >
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        completed
                          ? 'bg-green-500 border-green-500'
                          : 'border-gray-300 group-hover:border-green-400'
                      }`}
                    >
                      {completed && (
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <span
                      className={`text-base transition-all ${
                        completed
                          ? 'text-gray-400 line-through'
                          : 'text-gray-900 group-hover:text-gray-600'
                      }`}
                    >
                      {exercise.exercise_name} - {exercise.sets}x{exercise.reps}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* View Full Plan Button */}
            <button
              onClick={() => navigate('/workout-plans')}
              className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              View Full Plan
            </button>
          </div>
        )}

        {/* Rest Day Message */}
        {todayWorkout && todayWorkout.workout_type === 'rest' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-4xl mb-3">😴</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Rest Day</h3>
            <p className="text-gray-600 mb-4">
              Today is your rest day. Take time to recover and come back stronger!
            </p>
            <button
              onClick={() => navigate('/workout-plans')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              View Full Plan
            </button>
          </div>
        )}

        {/* No Workout Plan Message */}
        {!workoutPlan && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-4xl mb-3">🏋️</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Workout Plan Yet</h3>
            <p className="text-gray-600 mb-4">
              You don't have an assigned workout plan. Contact your coach to get started!
            </p>
            <button
              onClick={() => navigate('/coaches')}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              Find a Coach
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
