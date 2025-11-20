import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'

interface WorkoutPlan {
  id: string
  name: string
  goal: string
  difficulty: string
}

interface WorkoutWeek {
  id: string
  week_number: number
  days: WorkoutDay[]
}

interface WorkoutDay {
  id: string
  day_of_week: number
  workout_type: string
  prayer_time_notes: string | null
  exercises: WorkoutExercise[]
  completion?: WorkoutDayCompletion
}

interface WorkoutExercise {
  id: string
  exercise_name: string
  sets: number | null
  reps: number | null
  rest_period_seconds: number | null
  notes: string | null
}

interface WorkoutDayCompletion {
  id: string
  completed_at: string
  notes: string | null
  rating: number | null
  exercise_completions: ExerciseCompletion[]
}

interface ExerciseCompletion {
  id: string
  workout_exercise_id: string
  completed: boolean
  actual_sets: number | null
  actual_reps: number | null
  weight_used_kg: number | null
  notes: string | null
}

interface LogExerciseData {
  completed: boolean
  actual_sets: number | string
  actual_reps: number | string
  weight_used_kg: number | string
  notes: string
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const Progress = () => {
  const navigate = useNavigate()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isCoach, setIsCoach] = useState(false)
  const [loading, setLoading] = useState(true)
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [workoutWeeks, setWorkoutWeeks] = useState<WorkoutWeek[]>([])
  const [selectedWeek, setSelectedWeek] = useState<WorkoutWeek | null>(null)
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null)
  const [showLogModal, setShowLogModal] = useState(false)
  const [dayNotes, setDayNotes] = useState('')
  const [dayRating, setDayRating] = useState<number>(0)
  const [saving, setSaving] = useState(false)

  const [exerciseData, setExerciseData] = useState<{ [key: string]: LogExerciseData }>({})

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }
      setCurrentUserId(user.id)

      // Check if user is a coach
      const { data: coachData } = await supabase
        .from('coach_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      setIsCoach(!!coachData)
    }

    checkUser()
  }, [navigate])

  useEffect(() => {
    if (currentUserId) {
      fetchWorkoutPlans()
    }
  }, [currentUserId])

  useEffect(() => {
    if (selectedPlanId) {
      fetchWorkoutWeeks()
    }
  }, [selectedPlanId])

  const fetchWorkoutPlans = async () => {
    if (!currentUserId) return

    const { data, error } = await supabase
      .from('workout_plans')
      .select('id, name, goal, difficulty')
      .eq('client_id', currentUserId)
      .order('created_at', { ascending: false })

    if (!error && data && data.length > 0) {
      setWorkoutPlans(data)
      setSelectedPlanId(data[0].id)
    }

    setLoading(false)
  }

  const fetchWorkoutWeeks = async () => {
    if (!selectedPlanId) return

    const { data: weeksData } = await supabase
      .from('workout_weeks')
      .select('*')
      .eq('workout_plan_id', selectedPlanId)
      .order('week_number', { ascending: true })

    if (weeksData) {
      const weeksWithDays = await Promise.all(
        weeksData.map(async (week) => {
          const { data: daysData } = await supabase
            .from('workout_days')
            .select('*')
            .eq('workout_week_id', week.id)
            .order('day_of_week', { ascending: true })

          const daysWithExercisesAndCompletion = await Promise.all(
            (daysData || []).map(async (day) => {
              // Get exercises
              const { data: exercisesData } = await supabase
                .from('workout_exercises')
                .select('*')
                .eq('workout_day_id', day.id)
                .order('exercise_order', { ascending: true })

              // Get completion data
              const { data: completionData } = await supabase
                .from('workout_day_completions')
                .select('*')
                .eq('workout_day_id', day.id)
                .eq('user_id', currentUserId)
                .order('completed_at', { ascending: false })
                .limit(1)
                .single()

              let completion = undefined
              if (completionData) {
                // Get exercise completions
                const { data: exerciseCompletions } = await supabase
                  .from('exercise_completions')
                  .select('*')
                  .eq('workout_day_completion_id', completionData.id)

                completion = {
                  ...completionData,
                  exercise_completions: exerciseCompletions || []
                }
              }

              return {
                ...day,
                exercises: exercisesData || [],
                completion
              }
            })
          )

          return {
            ...week,
            days: daysWithExercisesAndCompletion
          }
        })
      )

      setWorkoutWeeks(weeksWithDays)
    }
  }

  const openLogModal = (week: WorkoutWeek, day: WorkoutDay) => {
    setSelectedWeek(week)
    setSelectedDay(day)

    // Initialize exercise data
    const initialData: { [key: string]: LogExerciseData } = {}
    day.exercises.forEach(exercise => {
      const existingCompletion = day.completion?.exercise_completions.find(
        ec => ec.workout_exercise_id === exercise.id
      )

      initialData[exercise.id] = {
        completed: existingCompletion?.completed || false,
        actual_sets: existingCompletion?.actual_sets || exercise.sets || '',
        actual_reps: existingCompletion?.actual_reps || exercise.reps || '',
        weight_used_kg: existingCompletion?.weight_used_kg || '',
        notes: existingCompletion?.notes || ''
      }
    })

    setExerciseData(initialData)
    setDayNotes(day.completion?.notes || '')
    setDayRating(day.completion?.rating || 0)
    setShowLogModal(true)
  }

  const closeLogModal = () => {
    setShowLogModal(false)
    setSelectedWeek(null)
    setSelectedDay(null)
    setExerciseData({})
    setDayNotes('')
    setDayRating(0)
  }

  const handleLogWorkout = async () => {
    if (!selectedDay || !currentUserId || saving) return

    setSaving(true)

    try {
      // Create or update workout day completion
      let completionId = selectedDay.completion?.id

      if (!completionId) {
        const { data, error } = await supabase
          .from('workout_day_completions')
          .insert({
            workout_day_id: selectedDay.id,
            user_id: currentUserId,
            notes: dayNotes || null,
            rating: dayRating || null
          })
          .select()
          .single()

        if (error) throw error
        completionId = data.id
      } else {
        await supabase
          .from('workout_day_completions')
          .update({
            notes: dayNotes || null,
            rating: dayRating || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', completionId)
      }

      // Delete existing exercise completions
      await supabase
        .from('exercise_completions')
        .delete()
        .eq('workout_day_completion_id', completionId)

      // Insert exercise completions
      const exerciseCompletions = Object.entries(exerciseData).map(([exerciseId, data]) => ({
        workout_day_completion_id: completionId,
        workout_exercise_id: exerciseId,
        completed: data.completed,
        actual_sets: data.actual_sets ? Number(data.actual_sets) : null,
        actual_reps: data.actual_reps ? Number(data.actual_reps) : null,
        weight_used_kg: data.weight_used_kg ? Number(data.weight_used_kg) : null,
        notes: data.notes || null
      }))

      if (exerciseCompletions.length > 0) {
        await supabase
          .from('exercise_completions')
          .insert(exerciseCompletions)
      }

      // Refresh data
      await fetchWorkoutWeeks()
      closeLogModal()
    } catch (error) {
      console.error('Error logging workout:', error)
    } finally {
      setSaving(false)
    }
  }

  const updateExerciseData = (exerciseId: string, field: keyof LogExerciseData, value: any) => {
    setExerciseData(prev => ({
      ...prev,
      [exerciseId]: {
        ...prev[exerciseId],
        [field]: value
      }
    }))
  }

  const getWorkoutTypeInfo = (type: string) => {
    switch (type) {
      case 'cardio':
        return { emoji: '🏃', label: 'Cardio', color: 'bg-blue-50 text-blue-700 border-blue-200' }
      case 'strength':
        return { emoji: '💪', label: 'Strength', color: 'bg-purple-50 text-purple-700 border-purple-200' }
      case 'boxing':
        return { emoji: '🥊', label: 'Boxing', color: 'bg-red-50 text-red-700 border-red-200' }
      case 'rest':
        return { emoji: '😴', label: 'Rest', color: 'bg-gray-50 text-gray-700 border-gray-200' }
      default:
        return { emoji: '🏋️', label: type, color: 'bg-gray-50 text-gray-700 border-gray-200' }
    }
  }

  const getCompletionPercentage = (day: WorkoutDay) => {
    if (!day.completion || day.exercises.length === 0) return 0

    const completedCount = day.completion.exercise_completions.filter(ec => ec.completed).length
    return Math.round((completedCount / day.exercises.length) * 100)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (isCoach) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">📊 Progress Tracking</h1>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-4xl mb-3">👨‍🏫</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Coach View Coming Soon</h3>
            <p className="text-gray-600">
              Client progress tracking view for coaches is under development.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (workoutPlans.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">📊 My Progress</h1>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-4xl mb-3">🏋️</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Workout Plans Yet</h3>
            <p className="text-gray-600 mb-4">
              You don't have any assigned workout plans. Contact your coach to get started!
            </p>
            <button
              onClick={() => navigate('/workout-plans')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              View Workout Plans
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">📊 My Progress</h1>

          {/* Plan Selector */}
          {workoutPlans.length > 1 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Workout Plan
              </label>
              <select
                value={selectedPlanId || ''}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {workoutPlans.map(plan => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Weeks */}
        {workoutWeeks.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-4xl mb-3">📅</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Workouts Yet</h3>
            <p className="text-gray-600">
              Your coach is still building your workout program.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {workoutWeeks.map(week => (
              <div key={week.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Week Header */}
                <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-4 md:px-6 py-4">
                  <h2 className="text-xl font-bold text-white">
                    📅 Week {week.week_number}
                  </h2>
                </div>

                {/* Days */}
                <div className="p-4 md:p-6 space-y-4">
                  {week.days.map(day => {
                    const typeInfo = getWorkoutTypeInfo(day.workout_type)
                    const completionPercentage = getCompletionPercentage(day)
                    const isCompleted = completionPercentage === 100

                    return (
                      <div
                        key={day.id}
                        className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                      >
                        <div className={`p-4 ${isCompleted ? 'bg-green-50' : 'bg-gray-50'}`}>
                          {/* Day Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border ${typeInfo.color}`}>
                                {typeInfo.emoji} {DAYS_OF_WEEK[day.day_of_week]}
                              </span>
                              {isCompleted && (
                                <span className="inline-flex items-center gap-1 text-green-600 text-sm font-medium">
                                  ✅ Completed
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => openLogModal(week, day)}
                              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                            >
                              {day.completion ? '✏️ Update Log' : '➕ Log Workout'}
                            </button>
                          </div>

                          {/* Prayer Time Notes */}
                          {day.prayer_time_notes && (
                            <div className="mb-3 flex items-start gap-2 text-sm text-gray-700 bg-blue-50 border border-blue-200 p-3 rounded-lg">
                              <span>🕌</span>
                              <span>{day.prayer_time_notes}</span>
                            </div>
                          )}

                          {/* Progress Bar */}
                          {day.completion && (
                            <div className="mb-3">
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-gray-600">Progress</span>
                                <span className="font-medium text-gray-900">{completionPercentage}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    isCompleted ? 'bg-green-500' : 'bg-primary-500'
                                  }`}
                                  style={{ width: `${completionPercentage}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Rating */}
                          {day.completion?.rating && (
                            <div className="mb-3 flex items-center gap-2 text-sm">
                              <span className="text-gray-600">Rating:</span>
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map(star => (
                                  <svg
                                    key={star}
                                    className={`w-5 h-5 ${star <= (day.completion?.rating || 0) ? 'text-yellow-500' : 'text-gray-300'}`}
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Exercises List */}
                          {day.workout_type !== 'rest' && day.exercises.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold text-gray-700 mb-2">Exercises:</h4>
                              {day.exercises.map((exercise, idx) => {
                                const exerciseCompletion = day.completion?.exercise_completions.find(
                                  ec => ec.workout_exercise_id === exercise.id
                                )
                                const isExerciseCompleted = exerciseCompletion?.completed

                                return (
                                  <div
                                    key={exercise.id}
                                    className={`p-3 rounded-lg ${
                                      isExerciseCompleted ? 'bg-green-50 border border-green-200' : 'bg-white border border-gray-200'
                                    }`}
                                  >
                                    <div className="flex items-start gap-2">
                                      <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                        isExerciseCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                                      }`}>
                                        {isExerciseCompleted ? '✓' : idx + 1}
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium text-gray-900 mb-1">{exercise.exercise_name}</div>
                                        <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                                          {exercise.sets && <span>🔄 {exercise.sets} sets</span>}
                                          {exercise.reps && <span>🔢 {exercise.reps} reps</span>}
                                          {exercise.rest_period_seconds && <span>⏱️ {exercise.rest_period_seconds}s</span>}
                                        </div>
                                        {exerciseCompletion?.weight_used_kg && (
                                          <div className="mt-1 text-sm text-gray-700">
                                            ⚖️ {exerciseCompletion.weight_used_kg}kg
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {/* Day Notes */}
                          {day.completion?.notes && (
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="text-sm text-gray-700">
                                <span className="font-medium">📝 Notes:</span> {day.completion.notes}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Log Workout Modal */}
      {showLogModal && selectedDay && selectedWeek && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 md:px-6 py-4 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  📝 Log Workout - Week {selectedWeek.week_number}, {DAYS_OF_WEEK[selectedDay.day_of_week]}
                </h2>
                <button
                  onClick={closeLogModal}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-4 md:p-6 space-y-6">
              {/* Exercises */}
              {selectedDay.workout_type !== 'rest' && selectedDay.exercises.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Exercises</h3>
                  {selectedDay.exercises.map((exercise, idx) => (
                    <div key={exercise.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                      {/* Exercise Header */}
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={exerciseData[exercise.id]?.completed || false}
                          onChange={(e) => updateExerciseData(exercise.id, 'completed', e.target.checked)}
                          className="mt-1 w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{idx + 1}. {exercise.exercise_name}</h4>
                          <div className="flex flex-wrap gap-2 text-sm text-gray-600 mt-1">
                            {exercise.sets && <span>🔄 {exercise.sets} sets</span>}
                            {exercise.reps && <span>🔢 {exercise.reps} reps</span>}
                            {exercise.rest_period_seconds && <span>⏱️ {exercise.rest_period_seconds}s</span>}
                          </div>
                          {exercise.notes && (
                            <p className="text-sm text-gray-600 mt-1">💡 {exercise.notes}</p>
                          )}
                        </div>
                      </div>

                      {/* Exercise Input Fields */}
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Sets
                          </label>
                          <input
                            type="number"
                            value={exerciseData[exercise.id]?.actual_sets || ''}
                            onChange={(e) => updateExerciseData(exercise.id, 'actual_sets', e.target.value)}
                            placeholder="0"
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Reps
                          </label>
                          <input
                            type="number"
                            value={exerciseData[exercise.id]?.actual_reps || ''}
                            onChange={(e) => updateExerciseData(exercise.id, 'actual_reps', e.target.value)}
                            placeholder="0"
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Weight (kg)
                          </label>
                          <input
                            type="number"
                            value={exerciseData[exercise.id]?.weight_used_kg || ''}
                            onChange={(e) => updateExerciseData(exercise.id, 'weight_used_kg', e.target.value)}
                            placeholder="0"
                            min="0"
                            step="0.5"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                          />
                        </div>
                      </div>

                      {/* Exercise Notes */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Exercise Notes
                        </label>
                        <input
                          type="text"
                          value={exerciseData[exercise.id]?.notes || ''}
                          onChange={(e) => updateExerciseData(exercise.id, 'notes', e.target.value)}
                          placeholder="How did it feel?"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Workout Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rate this workout
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setDayRating(star)}
                      className="transition-transform hover:scale-110 focus:outline-none"
                    >
                      <svg
                        className={`w-10 h-10 ${star <= dayRating ? 'text-yellow-500' : 'text-gray-300'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                </div>
                {dayRating > 0 && (
                  <p className="text-sm text-gray-600 mt-1">
                    {dayRating === 1 && 'Very Difficult 😓'}
                    {dayRating === 2 && 'Challenging 😅'}
                    {dayRating === 3 && 'Moderate 😊'}
                    {dayRating === 4 && 'Good 💪'}
                    {dayRating === 5 && 'Excellent 🔥'}
                  </p>
                )}
              </div>

              {/* Overall Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Overall Workout Notes
                </label>
                <textarea
                  value={dayNotes}
                  onChange={(e) => setDayNotes(e.target.value)}
                  placeholder="How was the overall workout? Any comments?"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={closeLogModal}
                  disabled={saving}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogWorkout}
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      ✅ Save Workout Log
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Progress
