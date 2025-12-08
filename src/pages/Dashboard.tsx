import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { Dumbbell, User, Calendar, Weight } from 'lucide-react'

interface WorkoutPlan {
  id: string
  name: string
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

interface MealPlan {
  id: string
  name: string
}

interface MealPlanDay {
  id: string
  day_number: number
  day_name: string | null
  completion?: MealPlanDayCompletion
}

interface MealPlanDayCompletion {
  id: string
  meal_plan_day_id: string
  user_id: string
  completed_at: string
}

// Enhanced Glassy Stat Card
const StatCard = memo(({ title, value, icon, gradient, accentColor }: {
  title: string
  value: string | number
  icon: React.ReactNode
  gradient: string
  accentColor: string
}) => (
  <div className="group relative">
    {/* Glow effect on hover */}
    <div className={`absolute -inset-0.5 bg-gradient-to-r ${gradient} rounded-2xl opacity-0 group-hover:opacity-20 blur transition duration-300`}></div>

    {/* Card */}
    <div className={`relative bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            {title}
          </p>
          <p className={`text-3xl font-bold bg-gradient-to-br ${gradient} bg-clip-text text-transparent`}>
            {value}
          </p>
        </div>
        <div className={`w-12 h-12 ${accentColor} rounded-xl flex items-center justify-center shadow-lg backdrop-blur-sm`}>
          {icon}
        </div>
      </div>
    </div>
  </div>
))
StatCard.displayName = 'StatCard'

// Session Status Pill
const SessionPill = memo(({ status, workoutType }: { status: 'completed' | 'pending' | 'rest', workoutType?: string }) => {
  if (status === 'completed') {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-300/30 backdrop-blur-sm">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
        <span className="text-sm font-semibold text-emerald-700">Completed Today</span>
        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    )
  }

  if (status === 'rest') {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-300/30 backdrop-blur-sm">
        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
        <span className="text-sm font-semibold text-purple-700">Rest Day</span>
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-300/30 backdrop-blur-sm">
      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
      <span className="text-sm font-semibold text-blue-700">{workoutType || 'Workout'}</span>
    </div>
  )
})
SessionPill.displayName = 'SessionPill'

const Dashboard = () => {
  const navigate = useNavigate()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [clientName, setClientName] = useState<string>('')
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null)
  const [weekWorkouts, setWeekWorkouts] = useState<WorkoutDay[]>([])
  const [todayWorkout, setTodayWorkout] = useState<WorkoutDay | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentWeight, setCurrentWeight] = useState<number | null>(null)
  const [workoutsCompleted, setWorkoutsCompleted] = useState<number>(0)
  const [coachName, setCoachName] = useState<string | null>(null)
  const [togglingExercise, setTogglingExercise] = useState<string | null>(null)
  const [togglingWorkoutDay, setTogglingWorkoutDay] = useState<boolean>(false)
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null)
  const [weekMealPlanDays, setWeekMealPlanDays] = useState<MealPlanDay[]>([])
  const [togglingMealDay, setTogglingMealDay] = useState<string | null>(null)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError) {
        console.error('Dashboard: Auth error:', authError)
      }

      if (!user) {
        navigate('/login')
        return
      }

      setCurrentUserId(user.id)

      // Get client profile
      const { data: profile, error: profileError } = await supabase
        .from('client_profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single()

      if (profileError) {
        console.error('Dashboard: Error fetching profile:', profileError)
      }

      if (profile) {
        setClientName(profile.full_name)
      }
    }

    checkUser()
  }, [navigate])

  const fetchWorkoutPlan = useCallback(async () => {
    if (!currentUserId) {
      console.log('Dashboard: No currentUserId, skipping workout plan fetch')
      return
    }

    console.log('Dashboard: Fetching workout plan for user:', currentUserId)
    setLoading(true)

    try {
      const today = new Date().getDay()
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      console.log(`Dashboard: Today is ${days[today]} (day ${today})`)

      // Get workout plan
      const { data: plan, error: planError } = await supabase
        .from('workout_plans')
        .select('id, name, client_id')
        .eq('client_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      console.log('Dashboard: Workout plan query result:', { plan, planError })

      if (planError) {
        console.error('Dashboard: Error fetching workout plan:', planError)
        setLoading(false)
        return
      }

      if (!plan) {
        console.log('Dashboard: No workout plan found for this user')
        setLoading(false)
        return
      }

      console.log('Dashboard: Found workout plan:', plan.name, 'ID:', plan.id)
      setWorkoutPlan(plan)

      // Get workout week
      const { data: weeks, error: weeksError } = await supabase
        .from('workout_weeks')
        .select('id, week_number')
        .eq('workout_plan_id', plan.id)
        .order('week_number', { ascending: true })
        .limit(1)

      console.log('Dashboard: Workout weeks query result:', { weeks, weeksError })

      if (weeksError) {
        console.error('Dashboard: Error fetching workout weeks:', weeksError)
        setLoading(false)
        return
      }

      if (!weeks || weeks.length === 0) {
        console.log('Dashboard: No workout weeks found for this plan')
        setLoading(false)
        return
      }

      const weekId = weeks[0].id
      console.log('Dashboard: Using week ID:', weekId, 'Week number:', weeks[0].week_number)

      // Get ALL workout days for the week with exercises
      const { data: allDays, error: daysError } = await supabase
        .from('workout_days')
        .select(`
          id,
          day_of_week,
          workout_type,
          workout_exercises(
            id,
            exercise_name,
            sets,
            reps,
            exercise_order
          )
        `)
        .eq('workout_week_id', weekId)
        .order('day_of_week', { ascending: true })
        .order('exercise_order', { foreignTable: 'workout_exercises', ascending: true })

      console.log('Dashboard: All workout days query result:', { allDays, daysError })

      if (daysError) {
        console.error('Dashboard: Error fetching workout days:', daysError)
        setLoading(false)
        return
      }

      if (!allDays || allDays.length === 0) {
        console.log('Dashboard: No workout days found for this week')
        setLoading(false)
        return
      }

      console.log('Dashboard: Found', allDays.length, 'workout days for the week')

      // Get completion data for all workout days
      const workoutsWithCompletions = await Promise.all(
        allDays.map(async (day) => {
          const { data: completionData } = await supabase
            .from('workout_day_completions')
            .select(`
              id,
              exercise_completions(
                id,
                workout_exercise_id,
                completed
              )
            `)
            .eq('workout_day_id', day.id)
            .eq('user_id', currentUserId)
            .order('completed_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          return {
            id: day.id,
            day_of_week: day.day_of_week,
            workout_type: day.workout_type,
            exercises: day.workout_exercises || [],
            completion: completionData ? {
              id: completionData.id,
              exercise_completions: completionData.exercise_completions || []
            } : undefined
          }
        })
      )

      console.log('Dashboard: Workouts with completions:', workoutsWithCompletions)

      setWeekWorkouts(workoutsWithCompletions)

      // Also set today's workout for the "Next Session" card
      const todaysWorkout = workoutsWithCompletions.find(w => w.day_of_week === today)
      if (todaysWorkout) {
        setTodayWorkout(todaysWorkout)
      }
    } catch (error) {
      console.error('Dashboard: Error in fetchWorkoutPlan:', error)
    } finally {
      console.log('Dashboard: Finished fetching workout plan')
      setLoading(false)
    }
  }, [currentUserId])

  const fetchDashboardStats = useCallback(async () => {
    if (!currentUserId) return

    try {
      // Run all queries in parallel
      const [weightResult, workoutsResult, profileResult] = await Promise.all([
        // Fetch current weight
        supabase
          .from('client_weight_tracking')
          .select('weight_kg')
          .eq('client_user_id', currentUserId)
          .order('measurement_date', { ascending: false })
          .limit(1)
          .maybeSingle(),

        // Fetch workouts completed count
        supabase
          .from('workout_day_completions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', currentUserId),

        // Fetch client profile
        supabase
          .from('client_profiles')
          .select('coach_id')
          .eq('user_id', currentUserId)
          .maybeSingle()
      ])

      // Update weight
      if (weightResult.data && !weightResult.error) {
        setCurrentWeight(weightResult.data.weight_kg)
      }

      // Update workouts completed
      setWorkoutsCompleted(workoutsResult.count || 0)

      // Fetch coach name if coach_id exists
      if (profileResult.data?.coach_id && !profileResult.error) {
        const { data: coachData } = await supabase
          .from('coach_profiles')
          .select('full_name')
          .eq('id', profileResult.data.coach_id)
          .maybeSingle()

        if (coachData) {
          setCoachName(coachData.full_name)
        }
      }
    } catch (error) {
      console.error('Dashboard: Error fetching dashboard stats:', error)
    }
  }, [currentUserId])

  const fetchMealPlan = useCallback(async () => {
    if (!currentUserId) {
      console.log('Dashboard: No currentUserId, skipping meal plan fetch')
      return
    }

    console.log('Dashboard: Fetching meal plan for user:', currentUserId)

    try {
      // Get meal plan assigned to this client
      const { data: plan, error: planError } = await supabase
        .from('meal_plans')
        .select('id, name')
        .eq('client_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      console.log('Dashboard: Meal plan query result:', { plan, planError })

      if (planError) {
        console.error('Dashboard: Error fetching meal plan:', planError)
        return
      }

      if (!plan) {
        console.log('Dashboard: No meal plan found for this user')
        return
      }

      console.log('Dashboard: Found meal plan:', plan.name, 'ID:', plan.id)
      setMealPlan(plan)

      // Get all days for this meal plan (up to 7 days for the week)
      const { data: days, error: daysError } = await supabase
        .from('meal_plan_days')
        .select('id, day_number, day_name')
        .eq('meal_plan_id', plan.id)
        .order('day_number', { ascending: true })
        .limit(7)

      console.log('Dashboard: Meal plan days query result:', { days, daysError })

      if (daysError) {
        console.error('Dashboard: Error fetching meal plan days:', daysError)
        return
      }

      if (!days || days.length === 0) {
        console.log('Dashboard: No meal plan days found for this plan')
        return
      }

      console.log('Dashboard: Found', days.length, 'meal plan days')

      // Get completion data for all days
      const daysWithCompletions = await Promise.all(
        days.map(async (day) => {
          const { data: completionData } = await supabase
            .from('meal_plan_day_completions')
            .select('*')
            .eq('meal_plan_day_id', day.id)
            .eq('user_id', currentUserId)
            .maybeSingle()

          return {
            id: day.id,
            day_number: day.day_number,
            day_name: day.day_name,
            completion: completionData || undefined
          }
        })
      )

      console.log('Dashboard: Meal plan days with completions:', daysWithCompletions)
      setWeekMealPlanDays(daysWithCompletions)
    } catch (error) {
      console.error('Dashboard: Error in fetchMealPlan:', error)
    }
  }, [currentUserId])

  useEffect(() => {
    if (currentUserId) {
      fetchWorkoutPlan()
      fetchDashboardStats()
      fetchMealPlan()
    }
  }, [currentUserId, fetchWorkoutPlan, fetchDashboardStats, fetchMealPlan])

  const handleToggleExercise = useCallback(async (exerciseId: string, currentlyCompleted: boolean) => {
    if (!currentUserId || togglingExercise || weekWorkouts.length === 0) return

    // Find which workout day this exercise belongs to
    const workoutDay = weekWorkouts.find(w => w.exercises.some(ex => ex.id === exerciseId))
    if (!workoutDay) return

    setTogglingExercise(exerciseId)

    try {
      // Get or create day completion
      let completionId = workoutDay.completion?.id

      if (!completionId) {
        const { data, error } = await supabase
          .from('workout_day_completions')
          .insert({
            workout_day_id: workoutDay.id,
            user_id: currentUserId
          })
          .select()
          .single()

        if (error) throw error
        completionId = data.id
      }

      // Check if exercise completion exists
      const existingCompletion = workoutDay.completion?.exercise_completions.find(
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

      // Update local state for weekWorkouts
      const updatedCompletions = [...(workoutDay.completion?.exercise_completions || [])]
      const existingIndex = updatedCompletions.findIndex(ec => ec.workout_exercise_id === exerciseId)

      if (existingIndex >= 0) {
        updatedCompletions[existingIndex] = {
          ...updatedCompletions[existingIndex],
          completed: !currentlyCompleted
        }
      } else {
        updatedCompletions.push({
          id: `temp-${Date.now()}-${Math.random()}`,
          workout_exercise_id: exerciseId,
          completed: true
        })
      }

      const updatedWeekWorkouts = weekWorkouts.map(w =>
        w.id === workoutDay.id
          ? {
              ...w,
              completion: {
                id: completionId!,
                exercise_completions: updatedCompletions
              }
            }
          : w
      )

      setWeekWorkouts(updatedWeekWorkouts)

      // Also update todayWorkout if this is today's workout
      if (todayWorkout && todayWorkout.id === workoutDay.id) {
        setTodayWorkout({
          ...workoutDay,
          completion: {
            id: completionId!,
            exercise_completions: updatedCompletions
          }
        })
      }

      // Refetch stats if workout just became complete
      const allComplete = workoutDay.exercises.every(ex =>
        ex.id === exerciseId ? !currentlyCompleted : updatedCompletions.find(ec => ec.workout_exercise_id === ex.id)?.completed
      )
      if (allComplete && currentlyCompleted === false) {
        fetchDashboardStats()
      }
    } catch (error) {
      console.error('Error toggling exercise:', error)
      await fetchWorkoutPlan()
    } finally {
      setTogglingExercise(null)
    }
  }, [currentUserId, weekWorkouts, todayWorkout, fetchWorkoutPlan, fetchDashboardStats, togglingExercise])

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

  // Check if all exercises are completed
  const isWorkoutDayCompleted = useMemo(() => {
    if (!todayWorkout || !todayWorkout.exercises || todayWorkout.exercises.length === 0) {
      return false
    }
    return todayWorkout.exercises.every(exercise => isExerciseCompleted(exercise.id))
  }, [todayWorkout, isExerciseCompleted])

  // Get session status for pill
  const getSessionStatus = (): 'completed' | 'pending' | 'rest' => {
    if (!todayWorkout) return 'rest'
    if (todayWorkout.workout_type === 'rest') return 'rest'
    if (isWorkoutDayCompleted) return 'completed'
    return 'pending'
  }

  // Handler to mark all exercises as complete/incomplete
  const handleToggleWorkoutDay = useCallback(async () => {
    if (!currentUserId || !todayWorkout || togglingWorkoutDay || !todayWorkout.exercises || todayWorkout.exercises.length === 0) return

    setTogglingWorkoutDay(true)

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

      const markAsComplete = !isWorkoutDayCompleted

      // Update or insert completion for each exercise
      for (const exercise of todayWorkout.exercises) {
        const existingCompletion = todayWorkout.completion?.exercise_completions.find(
          ec => ec.workout_exercise_id === exercise.id
        )

        if (existingCompletion) {
          await supabase
            .from('exercise_completions')
            .update({ completed: markAsComplete })
            .eq('id', existingCompletion.id)
        } else {
          await supabase
            .from('exercise_completions')
            .insert({
              workout_day_completion_id: completionId,
              workout_exercise_id: exercise.id,
              completed: markAsComplete
            })
        }
      }

      // Update local state
      const updatedCompletions = todayWorkout.exercises.map(exercise => {
        const existing = todayWorkout.completion?.exercise_completions.find(
          ec => ec.workout_exercise_id === exercise.id
        )
        return existing
          ? { ...existing, completed: markAsComplete }
          : {
              id: `temp-${Date.now()}-${Math.random()}-${exercise.id}`,
              workout_exercise_id: exercise.id,
              completed: markAsComplete
            }
      })

      setTodayWorkout({
        ...todayWorkout,
        completion: {
          id: completionId!,
          exercise_completions: updatedCompletions
        }
      })

      // Refetch stats
      fetchDashboardStats()
    } catch (error) {
      console.error('Error toggling workout day:', error)
      await Promise.all([fetchWorkoutPlan(), fetchDashboardStats()])
    } finally {
      setTogglingWorkoutDay(false)
    }
  }, [currentUserId, todayWorkout, isWorkoutDayCompleted, fetchWorkoutPlan, fetchDashboardStats, togglingWorkoutDay])

  const handleToggleMealDay = useCallback(async (dayId: string, currentlyCompleted: boolean) => {
    if (!currentUserId || togglingMealDay) return

    setTogglingMealDay(dayId)

    try {
      if (currentlyCompleted) {
        // Remove completion
        const day = weekMealPlanDays.find(d => d.id === dayId)
        if (day?.completion) {
          await supabase
            .from('meal_plan_day_completions')
            .delete()
            .eq('id', day.completion.id)
        }
      } else {
        // Add completion
        await supabase
          .from('meal_plan_day_completions')
          .insert({
            meal_plan_day_id: dayId,
            user_id: currentUserId
          })
      }

      // Refresh meal plan data
      await fetchMealPlan()
    } catch (error) {
      console.error('Error toggling meal day:', error)
      await fetchMealPlan()
    } finally {
      setTogglingMealDay(null)
    }
  }, [currentUserId, weekMealPlanDays, fetchMealPlan, togglingMealDay])

  // Removed blocking loading screen for faster page transitions

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-cyan-50/20">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header with Greeting */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent mb-2">
            Salamu Alaykum, {clientName || 'there'}!
          </h1>
          <p className="text-gray-600 text-lg">
            Focus on your health, strengthen your deen.
          </p>
        </div>

        {/* Stats Grid with Glassy Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatCard
            title="Current Weight"
            value={currentWeight ? `${currentWeight} kg` : '--'}
            gradient="from-emerald-500 to-teal-600"
            accentColor="bg-gradient-to-br from-emerald-400 to-teal-500"
            icon={<Weight className="w-6 h-6 text-white" />}
          />
          <StatCard
            title="Workouts Done"
            value={workoutsCompleted}
            gradient="from-blue-500 to-cyan-600"
            accentColor="bg-gradient-to-br from-blue-400 to-cyan-500"
            icon={<Dumbbell className="w-6 h-6 text-white" />}
          />
          <StatCard
            title="Assigned Coach"
            value={coachName || 'Unassigned'}
            gradient="from-orange-500 to-amber-600"
            accentColor="bg-gradient-to-br from-orange-400 to-amber-500"
            icon={<User className="w-6 h-6 text-white" />}
          />
          <StatCard
            title="This Week"
            value="Day 3"
            gradient="from-purple-500 to-pink-600"
            accentColor="bg-gradient-to-br from-purple-400 to-pink-500"
            icon={<Calendar className="w-6 h-6 text-white" />}
          />
        </div>

        {/* Today's Workout Card */}
        <div className="mb-8">
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-2xl opacity-0 group-hover:opacity-10 blur transition duration-300"></div>
            <div className="relative bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Dumbbell className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Today's Workout</h3>
                </div>
                <button
                  onClick={() => navigate('/workout-plans')}
                  className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  View All
                </button>
              </div>

              {weekWorkouts.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {weekWorkouts
                    .filter((workout) => {
                      // Filter out rest days and completed workouts
                      if (workout.workout_type === 'rest') return false
                      if (workout.exercises.length === 0) return false

                      // Check if all exercises are completed
                      const allCompleted = workout.exercises.every(ex =>
                        workout.completion?.exercise_completions.find(ec => ec.workout_exercise_id === ex.id)?.completed
                      )

                      // Only show incomplete workouts
                      return !allCompleted
                    })
                    .map((workout) => {
                    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
                    const isToday = workout.day_of_week === new Date().getDay()
                    const workoutCompleted = workout.exercises.every(ex =>
                      workout.completion?.exercise_completions.find(ec => ec.workout_exercise_id === ex.id)?.completed
                    )
                    const isToggling = togglingExercise !== null

                    return (
                      <div
                        key={workout.id}
                        onClick={async () => {
                          if (isToggling || workout.workout_type === 'rest') return

                          // Mark all exercises in this workout as complete/incomplete
                          const markAsComplete = !workoutCompleted
                          for (const exercise of workout.exercises) {
                            const currentlyCompleted = workout.completion?.exercise_completions.find(
                              ec => ec.workout_exercise_id === exercise.id
                            )?.completed || false
                            if (currentlyCompleted !== markAsComplete) {
                              await handleToggleExercise(exercise.id, currentlyCompleted)
                            }
                          }
                        }}
                        className={`group/pill relative px-4 py-3 rounded-full border-2 transition-all duration-200 ${
                          workout.workout_type === 'rest'
                            ? 'cursor-default'
                            : 'cursor-pointer hover:scale-105'
                        } ${
                          isToggling
                            ? 'opacity-60 cursor-wait'
                            : ''
                        } ${
                          workoutCompleted
                            ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-400 shadow-md'
                            : isToday
                            ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-400 shadow-md ring-2 ring-blue-200'
                            : 'bg-white/50 backdrop-blur-sm border-gray-300 hover:border-emerald-400 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Checkbox */}
                          {workout.workout_type !== 'rest' && (
                            <div className={`relative w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all duration-200 ${
                              workoutCompleted
                                ? 'bg-emerald-500 border-emerald-500 scale-110'
                                : 'border-gray-400 group-hover/pill:border-emerald-500'
                            }`}>
                              {workoutCompleted && !isToggling && (
                                <svg
                                  className="w-full h-full text-white p-0.5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          )}

                          {/* Day Name */}
                          <span className={`font-bold text-sm transition-all duration-200 ${
                            workoutCompleted
                              ? 'text-emerald-700'
                              : isToday
                              ? 'text-blue-700'
                              : 'text-gray-700 group-hover/pill:text-gray-900'
                          }`}>
                            {dayNames[workout.day_of_week]}
                          </span>

                          {/* Workout Type Badge */}
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
                            workoutCompleted
                              ? 'bg-emerald-200 text-emerald-800'
                              : workout.workout_type === 'rest'
                              ? 'bg-purple-200 text-purple-800'
                              : isToday
                              ? 'bg-blue-200 text-blue-800'
                              : 'bg-gray-200 text-gray-700'
                          }`}>
                            {workout.workout_type === 'rest'
                              ? '😴 Rest'
                              : workout.workout_type.charAt(0).toUpperCase() + workout.workout_type.slice(1).replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Dumbbell className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 mb-4 font-medium">No workout assigned</p>
                  <button
                    onClick={() => navigate('/workout-plans')}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300"
                  >
                    View Plans
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Week's Workout Card */}
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-2xl opacity-0 group-hover:opacity-10 blur transition duration-300"></div>
            <div className="relative bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-xl h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Dumbbell className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Week's Workout</h3>
                </div>
                <button
                  onClick={() => navigate('/workout-plans')}
                  className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  View All
                </button>
              </div>

              <div className="flex-1">
                {weekWorkouts.length > 0 ? (
                  <div className="w-full">
                    {/* This Week's Workouts */}
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                      {weekWorkouts
                        .filter((workout) => {
                          // Filter out rest days and completed workouts
                          if (workout.workout_type === 'rest') return false
                          if (workout.exercises.length === 0) return false

                          // Check if all exercises are completed
                          const allCompleted = workout.exercises.every(ex =>
                            workout.completion?.exercise_completions.find(ec => ec.workout_exercise_id === ex.id)?.completed
                          )

                          // Only show incomplete workouts
                          return !allCompleted
                        })
                        .map((workout) => {
                        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                        const isToday = workout.day_of_week === new Date().getDay()
                        const workoutCompleted = workout.exercises.every(ex =>
                          workout.completion?.exercise_completions.find(ec => ec.workout_exercise_id === ex.id)?.completed
                        )

                        return (
                          <div key={workout.id} className={`${isToday ? 'ring-2 ring-blue-400' : ''} rounded-xl`}>
                            {/* Day Header */}
                            <div className="mb-2 pb-2 border-b border-gray-200/50">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                    isToday
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {dayNames[workout.day_of_week]}
                                  </span>
                                  <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                                    {workout.workout_type === 'rest' ? 'Rest Day' : workout.workout_type.charAt(0).toUpperCase() + workout.workout_type.slice(1).replace('_', ' ')}
                                  </h4>
                                </div>
                                {workout.workout_type !== 'rest' && (
                                  <span className="text-xs text-gray-500 font-medium">
                                    {workout.exercises.filter(ex =>
                                      workout.completion?.exercise_completions.find(ec => ec.workout_exercise_id === ex.id)?.completed
                                    ).length} / {workout.exercises.length}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Exercise Pills */}
                            {workout.workout_type !== 'rest' && workout.exercises.length > 0 ? (
                              <div className="space-y-2">
                                {workout.exercises.map((exercise) => {
                                  const completed = workout.completion?.exercise_completions.find(
                                    ec => ec.workout_exercise_id === exercise.id
                                  )?.completed || false
                                  const isToggling = togglingExercise === exercise.id

                                  return (
                                    <div
                                      key={exercise.id}
                                      onClick={() => !isToggling && handleToggleExercise(exercise.id, completed)}
                                      className={`group/pill relative px-4 py-2.5 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                                        isToggling
                                          ? 'opacity-60 cursor-wait'
                                          : 'hover:scale-[1.01]'
                                      } ${
                                        completed
                                          ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300/50 shadow-sm'
                                          : 'bg-white/50 backdrop-blur-sm border-gray-200 hover:border-emerald-300 hover:shadow-md'
                                      }`}
                                    >
                                      {isToggling && (
                                        <div className="absolute inset-0 bg-white/60 rounded-lg flex items-center justify-center backdrop-blur-sm">
                                          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                      )}

                                      <div className="flex items-center gap-3">
                                        {/* Checkbox */}
                                        <div className={`relative w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all duration-200 ${
                                          completed
                                            ? 'bg-emerald-500 border-emerald-500 scale-110'
                                            : 'border-gray-300 group-hover/pill:border-emerald-400'
                                        }`}>
                                          {completed && !isToggling && (
                                            <svg
                                              className="w-full h-full text-white p-0.5"
                                              fill="none"
                                              stroke="currentColor"
                                              viewBox="0 0 24 24"
                                            >
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                          )}
                                        </div>

                                        {/* Exercise Name */}
                                        <span className={`font-semibold text-xs flex-1 min-w-0 truncate transition-all duration-200 ${
                                          completed
                                            ? 'text-emerald-700'
                                            : 'text-gray-800 group-hover/pill:text-gray-900'
                                        }`}>
                                          {exercise.exercise_name}
                                        </span>

                                        {/* Sets x Reps Badge */}
                                        {(exercise.sets || exercise.reps) && (
                                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                                            completed
                                              ? 'bg-emerald-200/70 text-emerald-800'
                                              : 'bg-gray-200/70 text-gray-700'
                                          }`}>
                                            {exercise.sets}×{exercise.reps}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            ) : workout.workout_type === 'rest' && (
                              <div className="text-center py-4">
                                <p className="text-sm text-gray-500">😴 Recovery day</p>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Dumbbell className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 mb-4 font-medium">No workouts for this week</p>
                    <button
                      onClick={() => navigate('/workout-plans')}
                      className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300 text-sm"
                    >
                      View Plans
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Nutrition Card */}
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-400 to-pink-400 rounded-2xl opacity-0 group-hover:opacity-10 blur transition duration-300"></div>
            <div className="relative bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-xl h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Nutrition</h3>
                </div>
                <button
                  onClick={() => navigate('/meal-plans-new')}
                  className="text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors"
                >
                  View All
                </button>
              </div>

              <div className="flex-1">
                {(() => {
                  // Filter out completed days and limit to 4
                  const incompleteDays = weekMealPlanDays.filter(day => !day.completion).slice(0, 4)

                  return incompleteDays.length > 0 ? (
                    <div className="w-full">
                      {/* This Week's Meal Plan */}
                      <div className="space-y-3">
                        {incompleteDays.map((day) => {
                          const completed = !!day.completion
                          const isToggling = togglingMealDay === day.id

                          return (
                            <div
                              key={day.id}
                              onClick={() => !isToggling && handleToggleMealDay(day.id, completed)}
                              className={`group/pill relative px-4 py-2.5 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                                isToggling
                                  ? 'opacity-60 cursor-wait'
                                  : 'hover:scale-[1.01]'
                              } ${
                                completed
                                  ? 'bg-gradient-to-r from-orange-50 to-pink-50 border-orange-300/50 shadow-sm'
                                  : 'bg-white/50 backdrop-blur-sm border-gray-200 hover:border-orange-300 hover:shadow-md'
                              }`}
                            >
                              {isToggling && (
                                <div className="absolute inset-0 bg-white/60 rounded-lg flex items-center justify-center backdrop-blur-sm">
                                  <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                              )}

                              <div className="flex items-center gap-3">
                                {/* Checkbox */}
                                <div className={`relative w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all duration-200 ${
                                  completed
                                    ? 'bg-orange-500 border-orange-500 scale-110'
                                    : 'border-gray-300 group-hover/pill:border-orange-400'
                                }`}>
                                  {completed && !isToggling && (
                                    <svg
                                      className="w-full h-full text-white p-0.5"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>

                                {/* Day Name */}
                                <span className={`font-semibold text-xs flex-1 min-w-0 truncate transition-all duration-200 ${
                                  completed
                                    ? 'text-orange-700'
                                    : 'text-gray-800 group-hover/pill:text-gray-900'
                                }`}>
                                  {day.day_name || `Day ${day.day_number}`}
                                </span>

                                {/* Day Number Badge */}
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                                  completed
                                    ? 'bg-orange-200/70 text-orange-800'
                                    : 'bg-gray-200/70 text-gray-700'
                                }`}>
                                  Day {day.day_number}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Show message if all days are completed */}
                      {weekMealPlanDays.length > 0 && incompleteDays.length === 0 && (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <p className="text-orange-700 mb-2 font-semibold">All caught up! 🎉</p>
                          <p className="text-gray-500 text-sm">You've completed all your meal days</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <p className="text-gray-500 mb-4 font-medium">No meal plan assigned yet</p>
                      <button
                        onClick={() => navigate('/meal-plans-new')}
                        className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300 text-sm"
                      >
                        Explore Meals
                      </button>
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* No Workout Plan Message */}
        {!workoutPlan && (
          <div className="mt-8">
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-400 to-purple-400 rounded-2xl opacity-5 blur"></div>
              <div className="relative bg-white/60 backdrop-blur-xl rounded-2xl p-10 border border-white/20 shadow-xl text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Dumbbell className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">No Workout Plan Yet</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  You don't have an assigned workout plan. Contact your coach or explore available coaches to get started on your fitness journey!
                </p>
                <button
                  onClick={() => navigate('/coaches')}
                  className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all duration-300"
                >
                  Find a Coach
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
