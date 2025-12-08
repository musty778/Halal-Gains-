import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import LoadingSpinner from '../components/LoadingSpinner'

interface WorkoutPlan {
  id: string
  coach_id: string
  client_id: string | null
  name: string
  duration: string
  goal: 'weight_loss' | 'muscle_gain'
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  created_at: string
  updated_at: string
}

interface CoachInfo {
  id: string
  user_id: string
  full_name: string
  profile_photos: string[]
  bio?: string
  years_of_experience?: number
}

interface WorkoutWeek {
  id: string
  workout_plan_id: string
  week_number: number
  days: WorkoutDay[]
}

interface WorkoutDay {
  id: string
  workout_week_id: string
  day_of_week: number
  workout_type: 'cardio' | 'strength' | 'boxing' | 'rest'
  prayer_time_notes: string | null
  exercises: WorkoutExercise[]
}

interface WorkoutExercise {
  id: string
  workout_day_id: string
  exercise_name: string
  sets: number | null
  reps: number | null
  rest_period_seconds: number | null
  notes: string | null
  exercise_order: number
}

interface WorkoutWeekCompletion {
  id: string
  workout_plan_id: string
  user_id: string
  week_number: number
  completed_at: string
  weight_kg: number | null
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const WorkoutPlanDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null)
  const [coachInfo, setCoachInfo] = useState<CoachInfo | null>(null)
  const [workoutWeeks, setWorkoutWeeks] = useState<WorkoutWeek[]>([])
  const [weekCompletions, setWeekCompletions] = useState<WorkoutWeekCompletion[]>([])
  const [loading, setLoading] = useState(true)
  const [isCoach, setIsCoach] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [exerciseCompletions, setExerciseCompletions] = useState<Set<string>>(new Set())
  const [togglingExercise, setTogglingExercise] = useState<string | null>(null)

  // Modal states
  const [showWeekModal, setShowWeekModal] = useState(false)
  const [showDayModal, setShowDayModal] = useState(false)
  const [showExerciseModal, setShowExerciseModal] = useState(false)
  const [showWeightModal, setShowWeightModal] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState<WorkoutWeek | null>(null)
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null)
  const [selectedWeekForWeight, setSelectedWeekForWeight] = useState<WorkoutWeek | null>(null)
  const [saving, setSaving] = useState(false)
  const [currentWeight, setCurrentWeight] = useState<string>('')
  const [submittingWeight, setSubmittingWeight] = useState(false)

  // Form states
  const [weekNumber, setWeekNumber] = useState(1)
  const [dayOfWeek, setDayOfWeek] = useState(0)
  const [workoutType, setWorkoutType] = useState<'cardio' | 'strength' | 'boxing' | 'rest'>('strength')
  const [prayerTimeNotes, setPrayerTimeNotes] = useState('')
  const [exerciseName, setExerciseName] = useState('')
  const [sets, setSets] = useState<number | ''>('')
  const [reps, setReps] = useState<number | ''>('')
  const [restPeriod, setRestPeriod] = useState<number | ''>('')
  const [exerciseNotes, setExerciseNotes] = useState('')

  useEffect(() => {
    const checkUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }
      setCurrentUserId(user.id)

      const { data: coachData } = await supabase
        .from('coach_profiles')
        .select('id, user_id')
        .eq('user_id', user.id)
        .single()

      setIsCoach(!!coachData)
    }

    checkUserRole()
  }, [navigate])

  useEffect(() => {
    fetchPlanDetails()
  }, [id])

  useEffect(() => {
    if (currentUserId && workoutPlan) {
      fetchExerciseCompletions()
      fetchWeekCompletions()
    }
  }, [currentUserId, isCoach, workoutPlan])

  const fetchPlanDetails = async () => {
    if (!id) return

    // Fetch workout plan
    const { data: planData, error: planError } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('id', id)
      .single()

    if (planError || !planData) {
      navigate('/workout-plans')
      return
    }

    setWorkoutPlan(planData)

    // Fetch coach info
    const { data: coachData } = await supabase
      .from('coach_profiles')
      .select('id, user_id, full_name, profile_photos, bio, years_of_experience')
      .eq('id', planData.coach_id)
      .single()

    if (coachData) {
      setCoachInfo(coachData)
    }

    // Fetch workout weeks with days and exercises
    await fetchWorkoutWeeks()

    setLoading(false)
  }

  const fetchWorkoutWeeks = async () => {
    if (!id) return

    const { data: weeksData } = await supabase
      .from('workout_weeks')
      .select('*')
      .eq('workout_plan_id', id)
      .order('week_number', { ascending: true })

    if (weeksData) {
      const weeksWithDays = await Promise.all(
        weeksData.map(async (week) => {
          const { data: daysData } = await supabase
            .from('workout_days')
            .select('*')
            .eq('workout_week_id', week.id)
            .order('day_of_week', { ascending: true })

          const daysWithExercises = await Promise.all(
            (daysData || []).map(async (day) => {
              const { data: exercisesData } = await supabase
                .from('workout_exercises')
                .select('*')
                .eq('workout_day_id', day.id)
                .order('exercise_order', { ascending: true })

              return {
                ...day,
                exercises: exercisesData || []
              }
            })
          )

          return {
            ...week,
            days: daysWithExercises
          }
        })
      )

      setWorkoutWeeks(weeksWithDays)
    }
  }

  const fetchExerciseCompletions = async () => {
    if (!currentUserId || !workoutPlan) return

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0]

    // Determine which user's completions to fetch
    let targetUserId = currentUserId

    // If coach is viewing and plan has a client_id, use it directly
    // (client_id in workout_plans table is actually the user_id)
    if (isCoach && workoutPlan.client_id) {
      targetUserId = workoutPlan.client_id
    }

    const { data: completionsData } = await supabase
      .from('workout_exercise_completions')
      .select('exercise_id')
      .eq('client_user_id', targetUserId)
      .eq('completion_date', today)

    if (completionsData) {
      const completedIds = new Set(completionsData.map(c => c.exercise_id))
      setExerciseCompletions(completedIds)
    }
  }

  const fetchWeekCompletions = async () => {
    if (!id || !currentUserId) return

    // Determine which user's completions to fetch
    let targetUserId = currentUserId
    if (isCoach && workoutPlan?.client_id) {
      targetUserId = workoutPlan.client_id
    }

    const { data } = await supabase
      .from('workout_week_completions')
      .select('*')
      .eq('workout_plan_id', id)
      .eq('user_id', targetUserId)

    if (data) {
      setWeekCompletions(data)
    }
  }

  const getWeekCompletion = (weekNumber: number): WorkoutWeekCompletion | undefined => {
    return weekCompletions.find(wc => wc.week_number === weekNumber)
  }

  const handleAddWeek = async () => {
    if (!id || saving) return

    setSaving(true)
    const { error } = await supabase
      .from('workout_weeks')
      .insert({
        workout_plan_id: id,
        week_number: weekNumber
      })

    if (!error) {
      await fetchWorkoutWeeks()
      setShowWeekModal(false)
      setWeekNumber(1)
    }
    setSaving(false)
  }

  const handleAddDay = async () => {
    if (!selectedWeek || saving) return

    setSaving(true)
    const { error } = await supabase
      .from('workout_days')
      .insert({
        workout_week_id: selectedWeek.id,
        day_of_week: dayOfWeek,
        workout_type: workoutType,
        prayer_time_notes: prayerTimeNotes || null
      })

    if (!error) {
      await fetchWorkoutWeeks()
      setShowDayModal(false)
      resetDayForm()
    }
    setSaving(false)
  }

  const handleAddExercise = async () => {
    if (!selectedDay || saving || !exerciseName) return

    setSaving(true)

    // Get the current max order
    const { data: existingExercises } = await supabase
      .from('workout_exercises')
      .select('exercise_order')
      .eq('workout_day_id', selectedDay.id)
      .order('exercise_order', { ascending: false })
      .limit(1)

    const nextOrder = existingExercises && existingExercises.length > 0
      ? existingExercises[0].exercise_order + 1
      : 0

    const { error } = await supabase
      .from('workout_exercises')
      .insert({
        workout_day_id: selectedDay.id,
        exercise_name: exerciseName,
        sets: sets || null,
        reps: reps || null,
        rest_period_seconds: restPeriod || null,
        notes: exerciseNotes || null,
        exercise_order: nextOrder
      })

    if (!error) {
      await fetchWorkoutWeeks()
      setShowExerciseModal(false)
      resetExerciseForm()
    }
    setSaving(false)
  }

  const handleDeleteWeek = async (weekId: string) => {
    if (!confirm('Delete this week? This will remove all days and exercises.')) return

    const { error } = await supabase
      .from('workout_weeks')
      .delete()
      .eq('id', weekId)

    if (!error) {
      await fetchWorkoutWeeks()
    }
  }

  const handleDeleteDay = async (dayId: string) => {
    if (!confirm('Delete this day? This will remove all exercises.')) return

    const { error } = await supabase
      .from('workout_days')
      .delete()
      .eq('id', dayId)

    if (!error) {
      await fetchWorkoutWeeks()
    }
  }

  const handleDeleteExercise = async (exerciseId: string) => {
    const { error } = await supabase
      .from('workout_exercises')
      .delete()
      .eq('id', exerciseId)

    if (!error) {
      await fetchWorkoutWeeks()
    }
  }

  const handleToggleExerciseCompletion = async (exerciseId: string) => {
    if (!currentUserId || isCoach || togglingExercise) return

    setTogglingExercise(exerciseId)

    try {
      const today = new Date().toISOString().split('T')[0]

      const { data: result, error } = await supabase
        .rpc('toggle_exercise_completion', {
          p_exercise_id: exerciseId,
          p_completion_date: today
        })

      if (error) {
        console.error('Error toggling exercise completion:', error)
        alert('Failed to update exercise completion. Please try again.')
        return
      }

      if (result && result.success) {
        // Update local state
        setExerciseCompletions(prev => {
          const newSet = new Set(prev)
          if (result.completed) {
            newSet.add(exerciseId)
          } else {
            newSet.delete(exerciseId)
          }
          return newSet
        })
      }
    } finally {
      setTogglingExercise(null)
    }
  }

  const handleSubmitWeight = async () => {
    if (!selectedWeekForWeight || !currentWeight || submittingWeight || !id) return

    const weightValue = parseFloat(currentWeight)
    if (isNaN(weightValue) || weightValue <= 0) {
      alert('Please enter a valid weight')
      return
    }

    setSubmittingWeight(true)

    try {
      const { data: result, error } = await supabase
        .rpc('record_weekly_weight', {
          p_workout_plan_id: id,
          p_week_number: selectedWeekForWeight.week_number,
          p_weight_kg: weightValue
        })

      if (error) {
        console.error('Error recording weight:', error)
        alert('Failed to record weight. Please try again.')
        return
      }

      if (result && result.success) {
        // Mark the week as completed
        const { error: weekError } = await supabase
          .from('workout_week_completions')
          .insert({
            workout_plan_id: id,
            user_id: currentUserId,
            week_number: selectedWeekForWeight.week_number,
            weight_kg: weightValue
          })

        if (weekError) {
          console.error('Error marking week as completed:', weekError)
          alert('Weight recorded but failed to mark week as completed.')
        }

        // Refresh week completions
        await fetchWeekCompletions()

        setShowWeightModal(false)
        setCurrentWeight('')
        setSelectedWeekForWeight(null)

        // Show success message
        if (result.weight_lost_kg !== null) {
          const lostOrGained = result.weight_lost_kg >= 0 ? 'lost' : 'gained'
          const amount = Math.abs(result.weight_lost_kg)
          alert(`Great! You ${lostOrGained} ${amount.toFixed(1)} kg this week!`)
        } else {
          alert('Weight recorded successfully!')
        }
      }
    } finally {
      setSubmittingWeight(false)
    }
  }

  const resetDayForm = () => {
    setDayOfWeek(0)
    setWorkoutType('strength')
    setPrayerTimeNotes('')
  }

  const resetExerciseForm = () => {
    setExerciseName('')
    setSets('')
    setReps('')
    setRestPeriod('')
    setExerciseNotes('')
  }

  const openAddWeekModal = () => {
    const maxWeek = workoutWeeks.length > 0
      ? Math.max(...workoutWeeks.map(w => w.week_number))
      : 0
    setWeekNumber(maxWeek + 1)
    setShowWeekModal(true)
  }

  const openAddDayModal = (week: WorkoutWeek) => {
    setSelectedWeek(week)
    resetDayForm()
    setShowDayModal(true)
  }

  const openAddExerciseModal = (day: WorkoutDay) => {
    setSelectedDay(day)
    resetExerciseForm()
    setShowExerciseModal(true)
  }

  const getWorkoutTypeInfo = (type: string) => {
    switch (type) {
      case 'cardio':
        return { emoji: '🏃', label: 'Cardio', color: 'bg-blue-50 text-blue-700' }
      case 'strength':
        return { emoji: '💪', label: 'Strength', color: 'bg-purple-50 text-purple-700' }
      case 'boxing':
        return { emoji: '🥊', label: 'Boxing', color: 'bg-red-50 text-red-700' }
      case 'rest':
        return { emoji: '😴', label: 'Rest', color: 'bg-gray-50 text-gray-700' }
      default:
        return { emoji: '🏋️', label: type, color: 'bg-gray-50 text-gray-700' }
    }
  }

  const getGoalInfo = (goal: string) => {
    switch (goal) {
      case 'weight_loss':
        return { emoji: '🔥', label: 'Weight Loss' }
      case 'muscle_gain':
        return { emoji: '💪', label: 'Muscle Gain' }
      default:
        return { emoji: '🎯', label: goal }
    }
  }

  const getDifficultyInfo = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return { emoji: '🌱', label: 'Beginner', color: 'text-green-600 bg-green-50' }
      case 'intermediate':
        return { emoji: '⚡', label: 'Intermediate', color: 'text-yellow-600 bg-yellow-50' }
      case 'advanced':
        return { emoji: '🚀', label: 'Advanced', color: 'text-red-600 bg-red-50' }
      default:
        return { emoji: '📊', label: difficulty, color: 'text-gray-600 bg-gray-50' }
    }
  }

  const isDayCompleted = (day: WorkoutDay): boolean => {
    if (day.workout_type === 'rest') return false
    if (day.exercises.length === 0) return false

    return day.exercises.every(exercise => exerciseCompletions.has(exercise.id))
  }

  const isWeekCompleted = (week: WorkoutWeek): boolean => {
    if (week.days.length === 0) return false

    for (const day of week.days) {
      if (day.workout_type === 'rest') continue
      if (day.exercises.length === 0) continue

      const allDayExercisesCompleted = day.exercises.every(exercise =>
        exerciseCompletions.has(exercise.id)
      )

      if (!allDayExercisesCompleted) return false
    }

    return true
  }

  const handleCompleteWeek = (week: WorkoutWeek) => {
    setSelectedWeekForWeight(week)
    setShowWeightModal(true)
  }

  if (loading) {
    return <LoadingSpinner />
  }

  if (!workoutPlan) {
    return null
  }

  const goalInfo = getGoalInfo(workoutPlan.goal)
  const difficultyInfo = getDifficultyInfo(workoutPlan.difficulty)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-cyan-50/20">
      <div className="container mx-auto px-4 py-6">
        {/* Back Button */}
        <button
          onClick={() => navigate('/workout-plans')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Workout Plans
        </button>

        <div className="max-w-5xl mx-auto">
          {/* Main Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-6">
            {/* Header Section with Glassy Effect */}
            <div className="relative bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 p-8 overflow-hidden">
              {/* Glassy overlay */}
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>

              {/* Content */}
              <div className="relative z-10">
                <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">{workoutPlan.name}</h1>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/25 backdrop-blur-md rounded-full text-sm font-semibold text-white shadow-sm border border-white/30">
                    ⏱️ {workoutPlan.duration}
                  </span>
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/25 backdrop-blur-md rounded-full text-sm font-semibold text-white shadow-sm border border-white/30">
                    {goalInfo.emoji} {goalInfo.label}
                  </span>
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/25 backdrop-blur-md rounded-full text-sm font-semibold text-white shadow-sm border border-white/30">
                    {difficultyInfo.emoji} {difficultyInfo.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Coach Section */}
            {coachInfo && (
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                  YOUR COACH
                </h2>
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                    {coachInfo.profile_photos && coachInfo.profile_photos.length > 0 ? (
                      <img
                        src={coachInfo.profile_photos[0]}
                        alt={coachInfo.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl">👤</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      {coachInfo.full_name}
                    </h3>
                    {coachInfo.years_of_experience && (
                      <p className="text-sm text-gray-600 mb-2">
                        📅 {coachInfo.years_of_experience} years of experience
                      </p>
                    )}
                    {coachInfo.bio && (
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {coachInfo.bio}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Weekly Breakdown Section */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-2xl">📅</span>
                <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Weekly Breakdown</span>
              </h2>
              {isCoach && coachInfo?.user_id === currentUserId && (
                <button
                  onClick={openAddWeekModal}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 text-sm font-semibold"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Week
                </button>
              )}
            </div>

            <div className="p-6">
              {workoutWeeks.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">📋</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Weeks Added Yet</h3>
                  <p className="text-gray-600">
                    {isCoach && coachInfo?.user_id === currentUserId
                      ? 'Start building your workout program by adding weeks.'
                      : 'Your coach is still building this workout program.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {workoutWeeks.map((week) => {
                    const weekCompleted = isWeekCompleted(week)
                    return (
                      <div key={week.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                        {/* Week Header */}
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <h3 className="font-bold text-gray-900 text-lg">Week {week.week_number}</h3>
                          </div>

                          {/* Right side - Completion buttons */}
                          <div>
                            {!isCoach && weekCompleted && !getWeekCompletion(week.week_number) && (
                              <button
                                onClick={() => handleCompleteWeek(week)}
                                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Complete Week
                              </button>
                            )}
                            {!isCoach && getWeekCompletion(week.week_number) && (
                              <div className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold rounded-xl flex items-center gap-2 shadow-lg">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Completed ✓</span>
                                {getWeekCompletion(week.week_number)?.weight_kg && (
                                  <span className="ml-2 text-xs bg-white/30 backdrop-blur-sm px-2.5 py-1 rounded-full font-semibold">
                                    {getWeekCompletion(week.week_number)?.weight_kg}kg
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Coach Controls */}
                          {isCoach && coachInfo?.user_id === currentUserId && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openAddDayModal(week)}
                                className="px-4 py-2 text-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all duration-300"
                              >
                                Add Day
                              </button>
                              <button
                                onClick={() => handleDeleteWeek(week.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 hover:scale-110"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>

                      {/* Days */}
                      {week.days.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          No days added yet
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {week.days.map((day) => {
                            const typeInfo = getWorkoutTypeInfo(day.workout_type)
                            const dayCompleted = isDayCompleted(day)
                            return (
                              <div key={day.id} className="p-5 bg-white hover:bg-gray-50 transition-all duration-200">
                                {/* Day Header */}
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-3 flex-wrap flex-1">
                                    <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold ${typeInfo.color} shadow-sm`}>
                                      {typeInfo.emoji} {DAYS_OF_WEEK[day.day_of_week]}
                                    </span>
                                    <span className="text-sm font-semibold text-gray-600">{typeInfo.label}</span>
                                    {isCoach && dayCompleted && (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-400/60 text-emerald-700 rounded-xl text-xs font-bold shadow-sm">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Completed
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {isCoach && coachInfo?.user_id === currentUserId && (
                                      <>
                                        {day.workout_type !== 'rest' && (
                                          <button
                                            onClick={() => openAddExerciseModal(day)}
                                            className="px-4 py-2 text-xs bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all duration-300"
                                          >
                                            Add Exercise
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleDeleteDay(day.id)}
                                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 hover:scale-110"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Prayer Time Notes */}
                                {day.prayer_time_notes && (
                                  <div className="mb-3 flex items-start gap-2 text-sm text-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 rounded-xl border border-blue-100">
                                    <span className="text-lg">🕌</span>
                                    <span className="font-medium">{day.prayer_time_notes}</span>
                                  </div>
                                )}

                                {/* Exercises */}
                                {day.workout_type !== 'rest' && (
                                  <div className="space-y-2">
                                    {day.exercises.length === 0 ? (
                                      <p className="text-sm text-gray-500 italic">No exercises added</p>
                                    ) : (
                                      day.exercises.map((exercise, idx) => {
                                        const isCompleted = exerciseCompletions.has(exercise.id)
                                        const isToggling = togglingExercise === exercise.id

                                        return (
                                          <div key={exercise.id} className={`rounded-xl p-4 transition-all duration-300 ${isCompleted ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 shadow-sm' : 'bg-gradient-to-r from-gray-50 to-gray-100/50 border border-gray-200 hover:border-emerald-200'}`}>
                                            <div className="flex items-start justify-between gap-3">
                                              {/* Checkbox for clients */}
                                              {!isCoach && (
                                                <button
                                                  onClick={() => handleToggleExerciseCompletion(exercise.id)}
                                                  disabled={isToggling}
                                                  className={`flex-shrink-0 mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${
                                                    isCompleted
                                                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 border-emerald-500 scale-110 shadow-md'
                                                      : 'border-gray-300 hover:border-emerald-400 hover:scale-105'
                                                  } ${isToggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'}`}
                                                >
                                                  {isCompleted && (
                                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                  )}
                                                </button>
                                              )}

                                              <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                  <span className={`font-bold ${isCompleted ? 'text-emerald-700' : 'text-gray-900'}`}>
                                                    {idx + 1}.
                                                  </span>
                                                  <span className={`font-bold text-base ${isCompleted ? 'text-emerald-700 line-through' : 'text-gray-900'}`}>
                                                    {exercise.exercise_name}
                                                  </span>
                                                  {isCompleted && (
                                                    <span className="text-xs text-emerald-600 font-bold px-2 py-0.5 bg-emerald-100 rounded-full">✓ Done</span>
                                                  )}
                                                </div>
                                                <div className={`flex flex-wrap items-center gap-3 text-sm font-semibold ${isCompleted ? 'text-emerald-600' : 'text-gray-600'}`}>
                                                  {exercise.sets && <span>🔄 {exercise.sets} sets</span>}
                                                  {exercise.reps && <span>🔢 {exercise.reps} reps</span>}
                                                  {exercise.rest_period_seconds && (
                                                    <span>⏱️ {exercise.rest_period_seconds}s rest</span>
                                                  )}
                                                </div>
                                                {exercise.notes && (
                                                  <p className={`text-sm mt-2 ${isCompleted ? 'text-emerald-600' : 'text-gray-600'} font-medium`}>
                                                    📝 {exercise.notes}
                                                  </p>
                                                )}
                                              </div>

                                              {isCoach && coachInfo?.user_id === currentUserId && (
                                                <button
                                                  onClick={() => handleDeleteExercise(exercise.id)}
                                                  className="ml-2 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 flex-shrink-0 hover:scale-110"
                                                >
                                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                  </svg>
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        )
                                      })
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Week Modal */}
      {showWeekModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowWeekModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">➕ Add Week</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Week Number
                  </label>
                  <input
                    type="number"
                    value={weekNumber}
                    onChange={(e) => setWeekNumber(parseInt(e.target.value) || 1)}
                    min={1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowWeekModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddWeek}
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Adding...' : 'Add Week'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Day Modal */}
      {showDayModal && selectedWeek && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDayModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">➕ Add Day to Week {selectedWeek.week_number}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Day of Week
                  </label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {DAYS_OF_WEEK.map((day, idx) => (
                      <option key={idx} value={idx}>{day}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Workout Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['cardio', 'strength', 'boxing', 'rest'] as const).map((type) => {
                      const info = getWorkoutTypeInfo(type)
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setWorkoutType(type)}
                          className={`py-2 px-3 rounded-lg border-2 font-medium transition-all text-sm ${
                            workoutType === type
                              ? 'border-primary-500 bg-primary-50 text-primary-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-600'
                          }`}
                        >
                          {info.emoji} {info.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    🕌 Prayer Time Considerations
                  </label>
                  <input
                    type="text"
                    value={prayerTimeNotes}
                    onChange={(e) => setPrayerTimeNotes(e.target.value)}
                    placeholder="e.g., Can be done 30 min before Asr"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowDayModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddDay}
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Adding...' : 'Add Day'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Exercise Modal */}
      {showExerciseModal && selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowExerciseModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">➕ Add Exercise</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Exercise Name
                  </label>
                  <input
                    type="text"
                    value={exerciseName}
                    onChange={(e) => setExerciseName(e.target.value)}
                    placeholder="e.g., Barbell Squat"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      🔄 Sets
                    </label>
                    <input
                      type="number"
                      value={sets}
                      onChange={(e) => setSets(e.target.value ? parseInt(e.target.value) : '')}
                      placeholder="3"
                      min={1}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      🔢 Reps
                    </label>
                    <input
                      type="number"
                      value={reps}
                      onChange={(e) => setReps(e.target.value ? parseInt(e.target.value) : '')}
                      placeholder="12"
                      min={1}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ⏱️ Rest (s)
                    </label>
                    <input
                      type="number"
                      value={restPeriod}
                      onChange={(e) => setRestPeriod(e.target.value ? parseInt(e.target.value) : '')}
                      placeholder="60"
                      min={0}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    📝 Notes
                  </label>
                  <textarea
                    value={exerciseNotes}
                    onChange={(e) => setExerciseNotes(e.target.value)}
                    placeholder="Any special instructions..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowExerciseModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddExercise}
                    disabled={saving || !exerciseName}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Adding...' : 'Add Exercise'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Weight Tracking Modal */}
      {showWeightModal && selectedWeekForWeight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowWeightModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Week {selectedWeekForWeight.week_number} Complete!
                </h2>
                <p className="text-gray-600">
                  Congratulations on completing all exercises for this week!
                </p>
              </div>

              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold text-primary-900 mb-3">
                  ⚖️ How much do you weigh now?
                </h3>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={currentWeight}
                    onChange={(e) => setCurrentWeight(e.target.value)}
                    placeholder="Enter your weight"
                    step="0.1"
                    min="0"
                    className="flex-1 px-4 py-3 border border-primary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
                    autoFocus
                  />
                  <span className="text-gray-600 font-medium">kg</span>
                </div>
                <p className="text-sm text-primary-700 mt-2">
                  Track your progress to stay motivated!
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowWeightModal(false)
                    setCurrentWeight('')
                    setSelectedWeekForWeight(null)
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Skip
                </button>
                <button
                  onClick={handleSubmitWeight}
                  disabled={submittingWeight || !currentWeight}
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 font-medium"
                >
                  {submittingWeight ? 'Saving...' : 'Save Weight'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WorkoutPlanDetail
