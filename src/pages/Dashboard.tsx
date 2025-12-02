import { useState, useEffect, useCallback, useMemo, memo } from 'react'
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

// Memoized stat card component
const StatCard = memo(({ title, value, icon, gradient }: {
  title: string
  value: string | number
  icon: React.ReactNode
  gradient: string
}) => (
  <div className="relative group">
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity`}></div>
    <div className={`relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-${gradient.split('/')[0].split('-')[1]}-500/20 shadow-lg hover:shadow-xl transition-all`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{title}</p>
        <div className={`w-12 h-12 bg-gradient-to-br ${gradient.replace('/20', '')} rounded-xl flex items-center justify-center shadow-md`}>
          {icon}
        </div>
      </div>
      <p className={`text-3xl font-bold bg-gradient-to-br ${gradient.replace('/20', '').replace('400', '600').replace('600', '800')} bg-clip-text text-transparent`}>
        {value}
      </p>
    </div>
  </div>
))
StatCard.displayName = 'StatCard'

// Memoized exercise item component
const ExerciseItem = memo(({ 
  exercise, 
  completed, 
  isToggling, 
  onToggle 
}: {
  exercise: WorkoutExercise
  completed: boolean
  isToggling: boolean
  onToggle: () => void
}) => (
  <div
    onClick={onToggle}
    className={`group/pill relative px-5 py-3.5 rounded-full border-2 transition-all duration-300 transform ${
      isToggling
        ? 'opacity-70 cursor-wait scale-[0.98]'
        : 'cursor-pointer hover:scale-[1.02]'
    } ${
      completed
        ? 'bg-gradient-to-r from-emerald-50 to-emerald-100/50 border-emerald-300 shadow-sm'
        : 'bg-white/60 border-gray-200 hover:border-emerald-300 hover:shadow-md'
    }`}
  >
    {isToggling && (
      <div className="absolute inset-0 bg-white/50 rounded-full flex items-center justify-center">
        <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )}
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`relative w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all duration-300 ${
          completed
            ? 'bg-emerald-500 border-emerald-500 scale-110'
            : 'border-gray-300 group-hover/pill:border-emerald-400'
        }`}>
          {completed && !isToggling && (
            <svg
              className="w-full h-full text-white p-0.5 animate-in zoom-in duration-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>
        <span className={`font-medium text-sm truncate transition-all duration-300 ${
          completed
            ? 'text-emerald-700'
            : 'text-gray-700 group-hover/pill:text-gray-900'
        }`}>
          {exercise.exercise_name}
        </span>
      </div>
      {(exercise.sets || exercise.reps) && (
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${
          completed
            ? 'bg-emerald-200/50 text-emerald-700'
            : 'bg-gray-100 text-gray-600'
        }`}>
          {exercise.sets}×{exercise.reps}
        </span>
      )}
    </div>
  </div>
))
ExerciseItem.displayName = 'ExerciseItem'

const Dashboard = () => {
  const navigate = useNavigate()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [clientName, setClientName] = useState<string>('')
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null)
  const [todayWorkout, setTodayWorkout] = useState<WorkoutDay | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentWeek, setCurrentWeek] = useState<WorkoutWeek | null>(null)
  const [currentWeight, setCurrentWeight] = useState<number | null>(null)
  const [workoutsCompleted, setWorkoutsCompleted] = useState<number>(0)
  const [coachName, setCoachName] = useState<string | null>(null)
  const [togglingExercise, setTogglingExercise] = useState<string | null>(null)

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

  const fetchWorkoutPlan = useCallback(async () => {
    if (!currentUserId) return

    setLoading(true)

    try {
      // Get the client's workout plan (only needed fields)
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

      // Get current week (only needed fields)
      const { data: weeks } = await supabase
        .from('workout_weeks')
        .select('id, week_number')
        .eq('workout_plan_id', plans[0].id)
        .order('week_number', { ascending: true })
        .limit(1)

      if (weeks && weeks.length > 0) {
        setCurrentWeek(weeks[0])

        // Get today's day of week (0 = Sunday, 6 = Saturday)
        const today = new Date().getDay()

        // Get today's workout (only needed fields)
        const { data: days } = await supabase
          .from('workout_days')
          .select('id, day_of_week, workout_type')
          .eq('workout_week_id', weeks[0].id)
          .eq('day_of_week', today)
          .single()

        if (days) {
          // Get exercises for this day (only needed fields)
          const { data: exercises } = await supabase
            .from('workout_exercises')
            .select('id, exercise_name, sets, reps, exercise_order')
            .eq('workout_day_id', days.id)
            .order('exercise_order', { ascending: true })

          // Get completion data (only needed fields)
          const { data: completionData } = await supabase
            .from('workout_day_completions')
            .select('id')
            .eq('workout_day_id', days.id)
            .eq('user_id', currentUserId)
            .order('completed_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          let completion = undefined
          if (completionData) {
            const { data: exerciseCompletions } = await supabase
              .from('exercise_completions')
              .select('id, workout_exercise_id, completed')
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
    } catch (error) {
      console.error('Error fetching workout plan:', error)
    } finally {
      setLoading(false)
    }
  }, [currentUserId])

  const fetchDashboardStats = useCallback(async () => {
    if (!currentUserId) return

    // Fetch current weight from client_weight_tracking table
    const { data: weightData, error: weightError } = await supabase
      .from('client_weight_tracking')
      .select('weight_kg')
      .eq('client_user_id', currentUserId)
      .order('measurement_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    console.log('Weight fetch:', { weightData, weightError })

    if (weightData && !weightError) {
      setCurrentWeight(weightData.weight_kg)
    }

    // Fetch workouts completed count
    const { count } = await supabase
      .from('workout_day_completions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', currentUserId)

    setWorkoutsCompleted(count || 0)

    // Fetch coach name from client_profiles
    const { data: clientProfile, error: clientError } = await supabase
      .from('client_profiles')
      .select('coach_id')
      .eq('user_id', currentUserId)
      .single()

    if (clientProfile?.coach_id && !clientError) {
      const { data: coachData } = await supabase
        .from('coach_profiles')
        .select('full_name')
        .eq('id', clientProfile.coach_id)
        .single()

      if (coachData) {
        setCoachName(coachData.full_name)
      }
    }
  }, [currentUserId])

  useEffect(() => {
    if (currentUserId) {
      fetchWorkoutPlan()
      fetchDashboardStats()
    }
  }, [currentUserId, fetchWorkoutPlan, fetchDashboardStats])

  const handleToggleExercise = useCallback(async (exerciseId: string, currentlyCompleted: boolean) => {
    if (!currentUserId || !todayWorkout || togglingExercise) return

    setTogglingExercise(exerciseId)

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
    } finally {
      setTogglingExercise(null)
    }
  }, [currentUserId, todayWorkout, fetchWorkoutPlan, togglingExercise])

  // Memoize exercise completion status map
  const exerciseCompletionMap = useMemo(() => {
    const map = new Map<string, boolean>()
    if (todayWorkout?.completion) {
      todayWorkout.completion.exercise_completions.forEach(ec => {
        map.set(ec.workout_exercise_id, ec.completed)
      })
    }
    return map
  }, [todayWorkout?.completion])

  const isExerciseCompleted = useCallback((exerciseId: string): boolean => {
    return exerciseCompletionMap.get(exerciseId) || false
  }, [exerciseCompletionMap])

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
            Focus on your health, strengthen your deen.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Current Weight"
            value={currentWeight ? `${currentWeight} kg` : '--'}
            gradient="from-emerald-400/20 to-emerald-600/20"
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            }
          />
          <StatCard
            title="Workouts Done"
            value={workoutsCompleted}
            gradient="from-blue-400/20 to-blue-600/20"
            icon={<Dumbbell className="w-6 h-6 text-white" />}
          />
          <StatCard
            title="Next Session"
            value={todayWorkout ? todayWorkout.workout_type.charAt(0).toUpperCase() + todayWorkout.workout_type.slice(1).replace('_', ' ') : 'Rest'}
            gradient="from-purple-400/20 to-purple-600/20"
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          />
          <StatCard
            title="Coach"
            value={coachName || 'Unassigned'}
            gradient="from-orange-400/20 to-orange-600/20"
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
          />
        </div>

        {/* Today's Workout and Nutrition Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Today's Workout Card */}
          <div className="relative group h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-400/10 to-gray-600/10 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-lg hover:shadow-xl transition-all h-full flex flex-col min-h-[280px]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Today's Workout</h3>
                <button
                  onClick={() => navigate('/workout-plans')}
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  View Full Plan
                </button>
              </div>

              <div className="flex-1 flex items-center justify-center">
                {todayWorkout && todayWorkout.workout_type !== 'rest' ? (
                  <div className="space-y-3 w-full">
                    {todayWorkout.exercises.slice(0, 5).map((exercise) => {
                      const completed = isExerciseCompleted(exercise.id)
                      const isToggling = togglingExercise === exercise.id
                      return (
                        <ExerciseItem
                          key={exercise.id}
                          exercise={exercise}
                          completed={completed}
                          isToggling={isToggling}
                          onToggle={() => !isToggling && handleToggleExercise(exercise.id, completed)}
                        />
                      )
                    })}
                    {todayWorkout.exercises.length === 0 && (
                      <div className="px-5 py-3.5 rounded-full border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 to-emerald-100/50">
                        <div className="flex items-center justify-center gap-2">
                          <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-medium text-sm text-emerald-700">Workouts completed</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-5xl mb-3 opacity-30">
                      <Dumbbell className="w-16 h-16 mx-auto text-gray-400" />
                    </div>
                    <p className="text-gray-500 mb-4">No active plan assigned.</p>
                    <button className="px-4 py-2 border border-emerald-500 text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors text-sm font-medium inline-flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Get AI Daily Suggestion
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Nutrition Card */}
          <div className="relative group h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-400/10 to-gray-600/10 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-lg hover:shadow-xl transition-all h-full flex flex-col min-h-[280px]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Nutrition</h3>
                <button
                  onClick={() => navigate('/meal-plans-new')}
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  View Full Plan
                </button>
              </div>

              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-5xl mb-3 opacity-30">
                    <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 mb-4">No meal plan assigned.</p>
                  <button className="px-4 py-2 border border-emerald-500 text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors text-sm font-medium inline-flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Get AI Halal Meal Idea
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Workout Card */}
        {todayWorkout && todayWorkout.workout_type !== 'rest' && false && (
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
