import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'

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

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const WorkoutPlanDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null)
  const [coachInfo, setCoachInfo] = useState<CoachInfo | null>(null)
  const [workoutWeeks, setWorkoutWeeks] = useState<WorkoutWeek[]>([])
  const [loading, setLoading] = useState(true)
  const [isCoach, setIsCoach] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Modal states
  const [showWeekModal, setShowWeekModal] = useState(false)
  const [showDayModal, setShowDayModal] = useState(false)
  const [showExerciseModal, setShowExerciseModal] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState<WorkoutWeek | null>(null)
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null)
  const [saving, setSaving] = useState(false)

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!workoutPlan) {
    return null
  }

  const goalInfo = getGoalInfo(workoutPlan.goal)
  const difficultyInfo = getDifficultyInfo(workoutPlan.difficulty)

  return (
    <div className="min-h-screen bg-gray-50">
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-6 text-white">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{workoutPlan.name}</h1>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                  ⏱️ {workoutPlan.duration}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                  {goalInfo.emoji} {goalInfo.label}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${difficultyInfo.color}`}>
                  {difficultyInfo.emoji} {difficultyInfo.label}
                </span>
              </div>
            </div>

            {/* Coach Section */}
            {coachInfo && (
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Your Coach
                </h2>
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
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
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">
                      {coachInfo.full_name}
                    </h3>
                    {coachInfo.years_of_experience && (
                      <p className="text-sm text-gray-600 mb-2">
                        📅 {coachInfo.years_of_experience} years of experience
                      </p>
                    )}
                    {coachInfo.bio && (
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {coachInfo.bio}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Weekly Breakdown Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">📅 Weekly Breakdown</h2>
              {isCoach && coachInfo?.user_id === currentUserId && (
                <button
                  onClick={openAddWeekModal}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
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
                  {workoutWeeks.map((week) => (
                    <div key={week.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Week Header */}
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">Week {week.week_number}</h3>
                        <div className="flex items-center gap-2">
                          {isCoach && coachInfo?.user_id === currentUserId && (
                            <>
                              <button
                                onClick={() => openAddDayModal(week)}
                                className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                              >
                                Add Day
                              </button>
                              <button
                                onClick={() => handleDeleteWeek(week.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Days */}
                      {week.days.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          No days added yet
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-200">
                          {week.days.map((day) => {
                            const typeInfo = getWorkoutTypeInfo(day.workout_type)
                            return (
                              <div key={day.id} className="p-4">
                                {/* Day Header */}
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${typeInfo.color}`}>
                                      {typeInfo.emoji} {DAYS_OF_WEEK[day.day_of_week]}
                                    </span>
                                    <span className="text-sm text-gray-600">{typeInfo.label}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {isCoach && coachInfo?.user_id === currentUserId && (
                                      <>
                                        {day.workout_type !== 'rest' && (
                                          <button
                                            onClick={() => openAddExerciseModal(day)}
                                            className="px-3 py-1 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                                          >
                                            Add Exercise
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleDeleteDay(day.id)}
                                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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
                                  <div className="mb-3 flex items-start gap-2 text-sm text-gray-600 bg-blue-50 p-2 rounded">
                                    <span>🕌</span>
                                    <span>{day.prayer_time_notes}</span>
                                  </div>
                                )}

                                {/* Exercises */}
                                {day.workout_type !== 'rest' && (
                                  <div className="space-y-2">
                                    {day.exercises.length === 0 ? (
                                      <p className="text-sm text-gray-500 italic">No exercises added</p>
                                    ) : (
                                      day.exercises.map((exercise, idx) => (
                                        <div key={exercise.id} className="bg-gray-50 rounded-lg p-3">
                                          <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-gray-900">{idx + 1}.</span>
                                                <span className="font-medium text-gray-900">{exercise.exercise_name}</span>
                                              </div>
                                              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                                                {exercise.sets && <span>🔄 {exercise.sets} sets</span>}
                                                {exercise.reps && <span>🔢 {exercise.reps} reps</span>}
                                                {exercise.rest_period_seconds && (
                                                  <span>⏱️ {exercise.rest_period_seconds}s rest</span>
                                                )}
                                              </div>
                                              {exercise.notes && (
                                                <p className="text-sm text-gray-600 mt-1">📝 {exercise.notes}</p>
                                              )}
                                            </div>
                                            {isCoach && coachInfo?.user_id === currentUserId && (
                                              <button
                                                onClick={() => handleDeleteExercise(exercise.id)}
                                                className="ml-2 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                              >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ))}
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
    </div>
  )
}

export default WorkoutPlanDetail
