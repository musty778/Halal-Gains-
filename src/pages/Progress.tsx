import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import LoadingSpinner from '../components/LoadingSpinner'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

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

interface WeightTracking {
  id: string
  client_user_id: string
  workout_plan_id: string | null
  meal_plan_id: string | null
  week_number: number
  weight_kg: number
  weight_lost_kg: number | null
  measurement_date: string
  created_at: string
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
  const [weightTracking, setWeightTracking] = useState<WeightTracking[]>([])
  const [showAddWeightModal, setShowAddWeightModal] = useState(false)
  const [manualWeight, setManualWeight] = useState('')
  const [manualWeekNumber, setManualWeekNumber] = useState(1)
  const [submittingWeight, setSubmittingWeight] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set())
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false)

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
    if (currentUserId && isCoach) {
      fetchClients()
    } else if (currentUserId && !isCoach) {
      fetchWorkoutPlans()
    }
  }, [currentUserId, isCoach])

  useEffect(() => {
    if (isCoach && selectedClientId) {
      fetchWorkoutPlans()
    }
  }, [selectedClientId])

  useEffect(() => {
    if (selectedPlanId) {
      fetchWorkoutWeeks()
    }
  }, [selectedPlanId])

  useEffect(() => {
    if (currentUserId || (isCoach && selectedClientId)) {
      fetchWeightTracking()
    }
  }, [currentUserId, selectedClientId, isCoach])

  const fetchClients = async () => {
    if (!currentUserId) return

    const { data: coachProfile } = await supabase
      .from('coach_profiles')
      .select('id')
      .eq('user_id', currentUserId)
      .single()

    if (!coachProfile) return

    const { data: clientsData, error } = await supabase
      .from('client_profiles')
      .select('id, user_id, full_name')
      .eq('coach_id', coachProfile.id)
      .order('full_name', { ascending: true })

    if (!error && clientsData && clientsData.length > 0) {
      setClients(clientsData)
      setSelectedClientId(clientsData[0].user_id)
    }

    setLoading(false)
  }

  const fetchWorkoutPlans = async () => {
    const targetUserId = isCoach ? selectedClientId : currentUserId
    if (!targetUserId) return

    // Reset state to prevent flash of old content
    setWorkoutPlans([])
    setSelectedPlanId(null)
    setWorkoutWeeks([])
    setLoading(true)

    const { data, error } = await supabase
      .from('workout_plans')
      .select('id, name, goal, difficulty')
      .eq('client_id', targetUserId)
      .order('created_at', { ascending: false })

    if (!error && data && data.length > 0) {
      setWorkoutPlans(data)
      setSelectedPlanId(data[0].id)
    } else {
      setWorkoutPlans([])
      setSelectedPlanId(null)
    }

    setLoading(false)
  }

  const fetchWorkoutWeeks = async () => {
    if (!selectedPlanId) return

    const targetUserId = isCoach ? selectedClientId : currentUserId
    if (!targetUserId) return

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
                .eq('user_id', targetUserId)
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

  const fetchWeightTracking = async () => {
    const targetUserId = isCoach ? selectedClientId : currentUserId
    if (!targetUserId) return

    console.log('Fetching weight tracking for:', { targetUserId, isCoach })

    // Fetch ALL weight tracking data for this user (from both workout and meal plans)
    const { data, error } = await supabase
      .from('client_weight_tracking')
      .select('*')
      .eq('client_user_id', targetUserId)
      .order('measurement_date', { ascending: true })

    if (error) {
      console.error('Error fetching weight tracking:', error)
      setWeightTracking([])
    } else {
      console.log('Weight tracking data:', data)
      setWeightTracking(data || [])
    }
  }

  const handleAddWeight = async () => {
    if (!selectedPlanId || !manualWeight || submittingWeight) return

    const weightValue = parseFloat(manualWeight)
    if (isNaN(weightValue) || weightValue <= 0) {
      alert('Please enter a valid weight')
      return
    }

    setSubmittingWeight(true)

    try {
      const { data: result, error } = await supabase
        .rpc('record_weekly_weight', {
          p_workout_plan_id: selectedPlanId,
          p_week_number: manualWeekNumber,
          p_weight_kg: weightValue
        })

      if (error) {
        console.error('Error recording weight:', error)
        alert('Failed to record weight. Please try again.')
        return
      }

      if (result && result.success) {
        setShowAddWeightModal(false)
        setManualWeight('')
        setManualWeekNumber(manualWeekNumber + 1)

        // Refresh weight data
        await fetchWeightTracking()

        // Show success message
        if (result.weight_lost_kg !== null) {
          const lostOrGained = result.weight_lost_kg >= 0 ? 'lost' : 'gained'
          const amount = Math.abs(result.weight_lost_kg)
          alert(`Great! You ${lostOrGained} ${amount.toFixed(1)} kg from last week!`)
        } else {
          alert('Weight recorded successfully!')
        }
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to record weight. Please try again.')
    } finally {
      setSubmittingWeight(false)
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
        completed: existingCompletion?.completed ?? true, // Default to checked
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
    // If no completion record, the day is not completed
    if (!day.completion) return 0

    // Rest days or days with no exercises are 100% complete if they have a completion record
    if (day.exercises.length === 0 || day.workout_type === 'rest') return 100

    const completedCount = day.completion.exercise_completions.filter(ec => ec.completed).length
    return Math.round((completedCount / day.exercises.length) * 100)
  }

  const toggleWeekExpanded = (weekId: string) => {
    setExpandedWeeks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(weekId)) {
        newSet.delete(weekId)
      } else {
        newSet.add(weekId)
      }
      return newSet
    })
  }

  const getWeekCompletionSummary = (week: WorkoutWeek) => {
    const totalDays = week.days.length
    const completedDays = week.days.filter(day => {
      const percentage = getCompletionPercentage(day)
      console.log(`Week ${week.week_number}, Day ${day.day_of_week}:`, {
        workout_type: day.workout_type,
        has_completion: !!day.completion,
        exercises_count: day.exercises.length,
        exercise_completions: day.completion?.exercise_completions.length || 0,
        completed_exercises: day.completion?.exercise_completions.filter(ec => ec.completed).length || 0,
        percentage: percentage
      })
      return percentage === 100
    }).length
    console.log(`Week ${week.week_number} Summary: ${completedDays}/${totalDays} days completed`)
    return { totalDays, completedDays }
  }

  const getWeekWeights = useCallback((weekNumber: number) => {
    return weightTracking.filter(w => w.week_number === weekNumber)
  }, [weightTracking])

  // Memoize chart data calculation
  const chartData = useMemo(() => {
    if (weightTracking.length === 0) return null

    // Sort by date to ensure chronological order
    const sortedWeights = [...weightTracking].sort((a, b) =>
      new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime()
    )

    const labels = sortedWeights.map((weight) => {
      const date = new Date(weight.measurement_date)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    })

    const weights = sortedWeights.map(w => w.weight_kg)

    // Calculate min and max for better Y-axis scaling
    const minWeight = Math.min(...weights)
    const maxWeight = Math.max(...weights)
    const padding = (maxWeight - minWeight) * 0.1 || 5 // 10% padding or 5kg minimum

    return {
      labels,
      datasets: [
        {
          label: 'Weight (kg)',
          data: weights,
          fill: true,
          backgroundColor: (context: any) => {
            const ctx = context.chart.ctx
            const gradient = ctx.createLinearGradient(0, 0, 0, 400)
            gradient.addColorStop(0, 'rgba(99, 102, 241, 0.2)')
            gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)')
            return gradient
          },
          borderColor: 'rgb(99, 102, 241)',
          borderWidth: 3,
          pointBackgroundColor: sortedWeights.map(w =>
            w.workout_plan_id ? 'rgb(168, 85, 247)' : 'rgb(34, 197, 94)'
          ),
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          tension: 0.4,
        }
      ]
    }
  }, [weightTracking])

  // Memoize chart options
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        borderColor: 'rgba(99, 102, 241, 0.5)',
        borderWidth: 1,
        titleFont: {
          size: 14,
          weight: 'bold' as const
        },
        bodyFont: {
          size: 13
        },
        callbacks: {
          label: function(context: any) {
            const weight = weightTracking.find(w =>
              new Date(w.measurement_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) === context.label
            )

            const lines = [`Weight: ${context.parsed.y} kg`]

            if (weight?.weight_lost_kg !== null && weight?.weight_lost_kg !== undefined) {
              const change = weight.weight_lost_kg
              const prefix = change > 0 ? '-' : change < 0 ? '+' : ''
              lines.push(`Change: ${prefix}${Math.abs(change).toFixed(1)} kg`)
            }

            lines.push(`Week ${weight?.week_number || ''}`)
            lines.push(weight?.workout_plan_id ? '🏋️ Workout' : '🍽️ Meal Plan')

            return lines
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false
        },
        ticks: {
          font: {
            size: 12,
            weight: '500' as const
          },
          color: '#6B7280',
          callback: function(value: any) {
            return value + ' kg'
          }
        }
      },
      x: {
        grid: {
          display: false,
          drawBorder: false
        },
        ticks: {
          font: {
            size: 11,
            weight: '500' as const
          },
          color: '#6B7280',
          maxRotation: 45,
          minRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8
        }
      }
    },
    animation: {
      duration: 1500,
      easing: 'easeInOutQuart' as const
    },
    interaction: {
      intersect: false,
      mode: 'index' as const
    }
  }), [weightTracking])

  // Show beautiful loading indicator while fetching to prevent flash of old content
  if (loading) {
    return <LoadingSpinner />
  }

  // Removed old coach view - now coaches see full progress view below

  if (isCoach && clients.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">📊 Client Progress</h1>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-4xl mb-3">👥</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Clients Yet</h3>
            <p className="text-gray-600">
              You don't have any assigned clients yet.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!isCoach && workoutPlans.length === 0) {
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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            {isCoach ? '📊 Client Progress' : '📊 My Progress'}
          </h1>

          {/* Client Selector for Coaches */}
          {isCoach && clients.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Select Client
              </label>

              {/* Custom Client Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                  className="w-full flex items-center gap-3 px-5 py-4 bg-white border-2 border-emerald-300 rounded-2xl shadow-md hover:shadow-lg hover:border-emerald-400 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 group"
                >
                  {/* Selected Client Name */}
                  <span className="flex-1 text-left font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
                    {clients.find(c => c.user_id === selectedClientId)?.full_name || 'Select a client'}
                  </span>

                  {/* Dropdown Arrow */}
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-all duration-300 ${isClientDropdownOpen ? 'rotate-180 text-emerald-500' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {isClientDropdownOpen && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsClientDropdownOpen(false)}
                    />

                    {/* Dropdown Options */}
                    <div className="absolute z-20 w-full mt-2 bg-white border-2 border-emerald-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                      {clients.map((client, index) => (
                        <button
                          key={client.user_id}
                          onClick={() => {
                            setSelectedClientId(client.user_id)
                            setIsClientDropdownOpen(false)
                          }}
                          className={`w-full px-5 py-4 text-left hover:bg-emerald-50 transition-all duration-200 flex items-center gap-3 group ${
                            selectedClientId === client.user_id ? 'bg-emerald-50' : ''
                          } ${index > 0 ? 'border-t border-gray-100' : ''}`}
                          style={{
                            animationDelay: `${index * 50}ms`,
                            animation: 'slideIn 0.3s ease-out forwards'
                          }}
                        >
                          {/* Client Name */}
                          <span className={`font-semibold ${
                            selectedClientId === client.user_id ? 'text-emerald-700' : 'text-gray-700 group-hover:text-emerald-600'
                          }`}>
                            {client.full_name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Plan Selector */}
          {workoutPlans.length > 1 && (
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Select Workout Plan
              </label>

              {/* Custom Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full flex items-center gap-3 px-5 py-4 bg-white border-2 border-emerald-300 rounded-2xl shadow-md hover:shadow-lg hover:border-emerald-400 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 group"
                >
                  {/* Selected Plan Name */}
                  <span className="flex-1 text-left font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
                    {workoutPlans.find(p => p.id === selectedPlanId)?.name || 'Select a plan'}
                  </span>

                  {/* Dropdown Arrow */}
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-all duration-300 ${isDropdownOpen ? 'rotate-180 text-emerald-500' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsDropdownOpen(false)}
                    />

                    {/* Dropdown Options */}
                    <div className="absolute z-20 w-full mt-2 bg-white border-2 border-emerald-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                      {workoutPlans.map((plan, index) => (
                        <button
                          key={plan.id}
                          onClick={() => {
                            setSelectedPlanId(plan.id)
                            setIsDropdownOpen(false)
                          }}
                          className={`w-full px-5 py-4 text-left hover:bg-emerald-50 transition-all duration-200 flex items-center gap-3 group ${
                            selectedPlanId === plan.id ? 'bg-emerald-50' : ''
                          } ${index > 0 ? 'border-t border-gray-100' : ''}`}
                          style={{
                            animationDelay: `${index * 50}ms`,
                            animation: 'slideIn 0.3s ease-out forwards'
                          }}
                        >
                          {/* Plan Name */}
                          <span className={`font-semibold ${
                            selectedPlanId === plan.id ? 'text-emerald-700' : 'text-gray-700 group-hover:text-emerald-600'
                          }`}>
                            {plan.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Weight Tracking Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 md:p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
              Weight Progress
            </h2>
            {!isCoach && (
              <button
                onClick={() => setShowAddWeightModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 text-sm font-bold"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Add Weight
              </button>
            )}
          </div>

          {weightTracking.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">⚖️</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Weight Data Yet</h3>
              <p className="text-gray-600 mb-4">
                Click "Add Weight" above to start tracking your progress!
              </p>
            </div>
          ) : (
            <>
            {/* Weight Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
              {/* Current Weight Card */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-50 border-2 border-blue-200/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300 group">
                {/* Glassy overlay */}
                <div className="absolute inset-0 bg-white/40 backdrop-blur-sm"></div>

                {/* Content */}
                <div className="relative z-10">
                  <div className="text-sm text-blue-700 font-bold mb-2 tracking-wide uppercase">Current Weight</div>
                  <div className="text-3xl font-bold text-blue-900 mb-1">
                    {weightTracking[weightTracking.length - 1].weight_kg} <span className="text-xl text-blue-700">kg</span>
                  </div>
                  <div className="text-xs text-blue-600 font-semibold">
                    Week {weightTracking[weightTracking.length - 1].week_number}
                  </div>
                </div>

                {/* Decorative element */}
                <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-blue-200/30 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-300"></div>
              </div>

              {/* Starting Weight Card */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-200/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300 group">
                {/* Glassy overlay */}
                <div className="absolute inset-0 bg-white/40 backdrop-blur-sm"></div>

                {/* Content */}
                <div className="relative z-10">
                  <div className="text-sm text-emerald-700 font-bold mb-2 tracking-wide uppercase">Starting Weight</div>
                  <div className="text-3xl font-bold text-emerald-900 mb-1">
                    {weightTracking[0].weight_kg} <span className="text-xl text-emerald-700">kg</span>
                  </div>
                  <div className="text-xs text-emerald-600 font-semibold">
                    Week {weightTracking[0].week_number}
                  </div>
                </div>

                {/* Decorative element */}
                <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-emerald-200/30 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-300"></div>
              </div>

              {/* Total Change Card */}
              <div className={`relative overflow-hidden rounded-2xl border-2 p-6 shadow-lg hover:shadow-xl transition-all duration-300 group ${
                weightTracking[0].weight_kg - weightTracking[weightTracking.length - 1].weight_kg > 0
                  ? 'bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 border-purple-200/50'
                  : weightTracking[0].weight_kg - weightTracking[weightTracking.length - 1].weight_kg < 0
                  ? 'bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50 border-orange-200/50'
                  : 'bg-gradient-to-br from-gray-50 via-slate-50 to-gray-50 border-gray-200/50'
              }`}>
                {/* Glassy overlay */}
                <div className="absolute inset-0 bg-white/40 backdrop-blur-sm"></div>

                {/* Content */}
                <div className="relative z-10">
                  <div className={`text-sm font-bold mb-2 tracking-wide uppercase ${
                    weightTracking[0].weight_kg - weightTracking[weightTracking.length - 1].weight_kg > 0
                      ? 'text-purple-700'
                      : weightTracking[0].weight_kg - weightTracking[weightTracking.length - 1].weight_kg < 0
                      ? 'text-orange-700'
                      : 'text-gray-700'
                  }`}>
                    Total Change
                  </div>
                  <div className={`text-3xl font-bold mb-1 ${
                    weightTracking[0].weight_kg - weightTracking[weightTracking.length - 1].weight_kg > 0
                      ? 'text-purple-900'
                      : weightTracking[0].weight_kg - weightTracking[weightTracking.length - 1].weight_kg < 0
                      ? 'text-orange-900'
                      : 'text-gray-900'
                  }`}>
                    {weightTracking[0].weight_kg - weightTracking[weightTracking.length - 1].weight_kg > 0 ? '-' : weightTracking[0].weight_kg - weightTracking[weightTracking.length - 1].weight_kg < 0 ? '+' : ''}
                    {Math.abs(weightTracking[0].weight_kg - weightTracking[weightTracking.length - 1].weight_kg).toFixed(1)} <span className={`text-xl ${
                      weightTracking[0].weight_kg - weightTracking[weightTracking.length - 1].weight_kg > 0
                        ? 'text-purple-700'
                        : weightTracking[0].weight_kg - weightTracking[weightTracking.length - 1].weight_kg < 0
                        ? 'text-orange-700'
                        : 'text-gray-700'
                    }`}>kg</span>
                  </div>
                  <div className={`text-xs font-semibold ${
                    weightTracking[0].weight_kg - weightTracking[weightTracking.length - 1].weight_kg > 0
                      ? 'text-purple-600'
                      : weightTracking[0].weight_kg - weightTracking[weightTracking.length - 1].weight_kg < 0
                      ? 'text-orange-600'
                      : 'text-gray-600'
                  }`}>
                    {weightTracking[0].weight_kg - weightTracking[weightTracking.length - 1].weight_kg > 0
                      ? '📉 Lost'
                      : weightTracking[0].weight_kg - weightTracking[weightTracking.length - 1].weight_kg < 0
                      ? '📈 Gained'
                      : 'No change'}
                  </div>
                </div>

                {/* Decorative element */}
                <div className={`absolute -bottom-2 -right-2 w-20 h-20 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-300 ${
                  weightTracking[0].weight_kg - weightTracking[weightTracking.length - 1].weight_kg > 0
                    ? 'bg-purple-200/30'
                    : weightTracking[0].weight_kg - weightTracking[weightTracking.length - 1].weight_kg < 0
                    ? 'bg-orange-200/30'
                    : 'bg-gray-200/30'
                }`}></div>
              </div>
            </div>

            {/* Weight Progress Chart */}
            {chartData && (
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <h3 className="text-sm font-semibold text-gray-700">📈 Weight Progress Chart</h3>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                      <span className="text-gray-600">Workout</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-gray-600">Meal Plan</span>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-4 sm:p-6 border border-gray-200 shadow-sm">
                  <div className="h-[250px] sm:h-[300px] md:h-[350px]">
                    <Line data={chartData} options={chartOptions} />
                  </div>
                </div>
              </div>
            )}

            </>
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
            {workoutWeeks.map(week => {
              const isExpanded = expandedWeeks.has(week.id)
              const { totalDays, completedDays } = getWeekCompletionSummary(week)
              const weekCompletion = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0

              return (
                <div key={week.id} className="bg-white rounded-2xl shadow-lg border-2 border-emerald-200 overflow-hidden hover:shadow-xl transition-all duration-300">
                  {/* Week Header - Clickable */}
                  <button
                    onClick={() => toggleWeekExpanded(week.id)}
                    className="w-full relative bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 px-5 md:px-6 py-5 hover:shadow-lg transition-all duration-300 group overflow-hidden"
                  >
                    {/* Glassy overlay */}
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>

                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                          Week {week.week_number}
                        </h2>
                        <span className="text-sm text-white font-semibold bg-white/25 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/30 shadow-sm">
                          {completedDays}/{totalDays} days
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Completion Progress */}
                        <div className="hidden sm:flex items-center gap-2 bg-white/25 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/30 shadow-sm">
                          <span className="text-sm text-white font-bold">{weekCompletion}%</span>
                        </div>
                        {/* Dropdown Arrow */}
                        <svg
                          className={`w-6 h-6 text-white transition-all duration-300 ease-in-out group-hover:scale-110 ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </button>

                  {/* Days - Collapsible */}
                  {isExpanded && (
                    <div className="p-4 md:p-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  {week.days.map(day => {
                    const typeInfo = getWorkoutTypeInfo(day.workout_type)
                    const completionPercentage = getCompletionPercentage(day)
                    const isCompleted = completionPercentage === 100

                    return (
                      <div
                        key={day.id}
                        className="border-2 border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300"
                      >
                        <div className={`p-5 ${isCompleted ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50' : 'bg-white'}`}>
                          {/* Day Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                            <div className="flex items-center gap-3">
                              <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border-2 shadow-sm ${typeInfo.color}`}>
                                {typeInfo.emoji} {DAYS_OF_WEEK[day.day_of_week]}
                              </span>
                              {isCompleted && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold border border-emerald-300">
                                  ✅ Completed
                                </span>
                              )}
                            </div>
                            {!isCoach && (
                              <button
                                onClick={() => openLogModal(week, day)}
                                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 text-sm font-bold"
                              >
                                {day.completion ? '✏️ Update Log' : '➕ Log Workout'}
                              </button>
                            )}
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

                      {/* Weekly History for this Week */}
                      {getWeekWeights(week.week_number).length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">⚖️ Weight History - Week {week.week_number}</h4>
                          <div className="space-y-2">
                            {getWeekWeights(week.week_number).map((weight) => (
                              <div
                                key={weight.id}
                                className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
                              >
                                <div className="flex-shrink-0 w-12 text-center">
                                  <div className="text-xl">
                                    {weight.workout_plan_id ? '🏋️' : '🍽️'}
                                  </div>
                                </div>

                                <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  <div>
                                    <div className="text-xs text-gray-500 font-medium">Weight</div>
                                    <div className="text-sm font-bold text-gray-900">{weight.weight_kg} kg</div>
                                  </div>

                                  {weight.weight_lost_kg !== null && (
                                    <div>
                                      <div className="text-xs text-gray-500 font-medium">Change</div>
                                      <div className={`text-sm font-bold ${
                                        weight.weight_lost_kg > 0
                                          ? 'text-green-600'
                                          : weight.weight_lost_kg < 0
                                          ? 'text-red-600'
                                          : 'text-gray-600'
                                      }`}>
                                        {weight.weight_lost_kg > 0 ? '-' : weight.weight_lost_kg < 0 ? '+' : ''}
                                        {Math.abs(weight.weight_lost_kg).toFixed(1)} kg
                                      </div>
                                    </div>
                                  )}

                                  <div className="hidden sm:block">
                                    <div className="text-xs text-gray-500 font-medium">Date</div>
                                    <div className="text-sm text-gray-700">
                                      {new Date(weight.measurement_date).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                      })}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex-shrink-0">
                                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                    weight.workout_plan_id
                                      ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                      : 'bg-green-100 text-green-700 border border-green-200'
                                  }`}>
                                    {weight.workout_plan_id ? 'Workout' : 'Meal Plan'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
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

      {/* Add Weight Modal */}
      {showAddWeightModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">⚖️ Add Weight Entry</h2>
                <button
                  onClick={() => setShowAddWeightModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Week Number
                  </label>
                  <input
                    type="number"
                    value={manualWeekNumber}
                    onChange={(e) => setManualWeekNumber(parseInt(e.target.value) || 1)}
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the week number for this weight measurement
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Weight (kg)
                  </label>
                  <input
                    type="number"
                    value={manualWeight}
                    onChange={(e) => setManualWeight(e.target.value)}
                    placeholder="Enter your weight"
                    step="0.1"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowAddWeightModal(false)}
                    disabled={submittingWeight}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddWeight}
                    disabled={submittingWeight || !manualWeight}
                    className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submittingWeight ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        ✅ Save Weight
                      </>
                    )}
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

export default Progress
