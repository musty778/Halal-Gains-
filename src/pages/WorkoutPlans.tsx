import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  client_name?: string
  client_photo?: string
  completed_weeks?: number
  total_weeks?: number
}

interface Client {
  id: string
  name: string
  photo?: string
}

const WorkoutPlans = () => {
  const navigate = useNavigate()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isCoach, setIsCoach] = useState(false)
  const [coachProfileId, setCoachProfileId] = useState<string | null>(null)
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState<WorkoutPlan | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showClientDropdown, setShowClientDropdown] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    duration: '',
    goal: 'weight_loss' as 'weight_loss' | 'muscle_gain',
    difficulty: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    client_id: ''
  })

  // Get current user and check if coach
  useEffect(() => {
    const getCurrentUser = async () => {
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

      if (coachData) {
        setIsCoach(true)
        setCoachProfileId(coachData.id)
      }
    }

    getCurrentUser()
  }, [navigate])

  // Fetch workout plans
  useEffect(() => {
    const fetchWorkoutPlans = async () => {
      if (!currentUserId) return

      const { data, error } = await supabase
        .from('workout_plans')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        // Get all unique client IDs
        const clientIds = [...new Set(data.map(plan => plan.client_id).filter(Boolean))]
        const planIds = data.map(plan => plan.id)

        // Batch fetch all client data, weeks, and completions in parallel
        const [clientsResult, weeksResult, completionsResult] = await Promise.all([
          // Fetch all client profiles at once
          clientIds.length > 0
            ? supabase
                .from('client_profiles')
                .select('user_id, full_name, profile_photo')
                .in('user_id', clientIds)
            : Promise.resolve({ data: [] }),

          // Fetch all weeks for all plans at once (only for client view)
          !isCoach && planIds.length > 0
            ? supabase
                .from('workout_weeks')
                .select('workout_plan_id, week_number')
                .in('workout_plan_id', planIds)
            : Promise.resolve({ data: [] }),

          // Fetch all completions for current user at once (only for client view)
          !isCoach && planIds.length > 0
            ? supabase
                .from('workout_week_completions')
                .select('workout_plan_id, week_number')
                .in('workout_plan_id', planIds)
                .eq('user_id', currentUserId)
            : Promise.resolve({ data: [] })
        ])

        // Create lookup maps for fast access
        const clientsMap = new Map(
          (clientsResult.data || []).map(c => [c.user_id, c])
        )

        const weeksMap = new Map<string, number>()
        const completionsMap = new Map<string, number>()

        // Count weeks per plan
        if (weeksResult.data) {
          weeksResult.data.forEach(week => {
            const count = weeksMap.get(week.workout_plan_id) || 0
            weeksMap.set(week.workout_plan_id, count + 1)
          })
        }

        // Count completions per plan
        if (completionsResult.data) {
          completionsResult.data.forEach(completion => {
            const count = completionsMap.get(completion.workout_plan_id) || 0
            completionsMap.set(completion.workout_plan_id, count + 1)
          })
        }

        // Map the data
        const plansWithClientInfo = data.map(plan => {
          const clientData = plan.client_id ? clientsMap.get(plan.client_id) : undefined

          return {
            ...plan,
            client_name: clientData?.full_name || (plan.client_id ? 'Unknown Client' : undefined),
            client_photo: clientData?.profile_photo,
            completed_weeks: !isCoach && plan.client_id === currentUserId
              ? completionsMap.get(plan.id) || 0
              : 0,
            total_weeks: !isCoach && plan.client_id === currentUserId
              ? weeksMap.get(plan.id) || 0
              : 0
          }
        })

        setWorkoutPlans(plansWithClientInfo)
      }

      setLoading(false)
    }

    fetchWorkoutPlans()
  }, [currentUserId, coachProfileId, isCoach])

  // Fetch clients (from conversations)
  useEffect(() => {
    const fetchClients = async () => {
      if (!coachProfileId) return

      // Get unique clients from conversations
      const { data: conversations } = await supabase
        .from('conversations')
        .select('client_id')
        .eq('coach_id', coachProfileId)

      if (conversations) {
        const uniqueClientIds = [...new Set(conversations.map(c => c.client_id))]

        const clientList = await Promise.all(
          uniqueClientIds.map(async (clientId) => {
            const { data: clientData } = await supabase
              .from('client_profiles')
              .select('full_name, profile_photo')
              .eq('user_id', clientId)
              .single()

            return {
              id: clientId,
              name: clientData?.full_name || 'Unknown Client',
              photo: clientData?.profile_photo
            }
          })
        )

        setClients(clientList)
      }
    }

    fetchClients()
  }, [coachProfileId])

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!coachProfileId || saving) return

    setSaving(true)

    const planData = {
      coach_id: coachProfileId,
      name: formData.name,
      duration: formData.duration,
      goal: formData.goal,
      difficulty: formData.difficulty,
      client_id: formData.client_id || null,
      updated_at: new Date().toISOString()
    }

    if (editingPlan) {
      // Update existing plan
      const { error } = await supabase
        .from('workout_plans')
        .update(planData)
        .eq('id', editingPlan.id)

      if (!error) {
        // Update local state
        const client = formData.client_id
          ? clients.find(c => c.id === formData.client_id)
          : undefined

        setWorkoutPlans(prev =>
          prev.map(p =>
            p.id === editingPlan.id
              ? { ...p, ...planData, client_name: client?.name, client_photo: client?.photo }
              : p
          )
        )
        closeModal()
      }
    } else {
      // Create new plan
      const { data, error } = await supabase
        .from('workout_plans')
        .insert(planData)
        .select()
        .single()

      if (!error && data) {
        const client = formData.client_id
          ? clients.find(c => c.id === formData.client_id)
          : undefined

        setWorkoutPlans(prev => [{ ...data, client_name: client?.name, client_photo: client?.photo }, ...prev])
        closeModal()
      }
    }

    setSaving(false)
  }

  // Handle delete
  const handleDelete = async (planId: string) => {
    if (deleting) return

    setDeleting(planId)

    const { error } = await supabase
      .from('workout_plans')
      .delete()
      .eq('id', planId)

    if (!error) {
      setWorkoutPlans(prev => prev.filter(p => p.id !== planId))
    }

    setDeleting(null)
  }

  // Open modal for editing
  const openEditModal = (plan: WorkoutPlan) => {
    setEditingPlan(plan)
    setFormData({
      name: plan.name,
      duration: plan.duration,
      goal: plan.goal,
      difficulty: plan.difficulty,
      client_id: plan.client_id || ''
    })
    setShowModal(true)
  }

  // Open modal for creating
  const openCreateModal = () => {
    setEditingPlan(null)
    setFormData({
      name: '',
      duration: '',
      goal: 'weight_loss',
      difficulty: 'beginner',
      client_id: ''
    })
    setShowModal(true)
  }

  // Close modal
  const closeModal = () => {
    setShowModal(false)
    setEditingPlan(null)
    setShowClientDropdown(false)
    setFormData({
      name: '',
      duration: '',
      goal: 'weight_loss',
      difficulty: 'beginner',
      client_id: ''
    })
  }

  // Get goal emoji and label
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

  // Get difficulty info
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

  // Client view
  if (!isCoach) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">💪 My Workout Plans</h1>

          {workoutPlans.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="text-4xl mb-3">🏋️</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Workout Plans Yet</h3>
              <p className="text-gray-600">
                Your coach hasn't assigned you any workout plans yet. Check back later!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workoutPlans.map((plan) => {
                const goalInfo = getGoalInfo(plan.goal)
                const difficultyInfo = getDifficultyInfo(plan.difficulty)

                return (
                  <div
                    key={plan.id}
                    onClick={() => navigate(`/workout-plan/${plan.id}`)}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 flex-1">{plan.name}</h3>
                      {plan.total_weeks && plan.total_weeks > 0 && (
                        <div className="ml-2">
                          {plan.completed_weeks === plan.total_weeks ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              ✓ Complete
                            </span>
                          ) : plan.completed_weeks && plan.completed_weeks > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              {plan.completed_weeks}/{plan.total_weeks} weeks
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <span>⏱️</span>
                        <span>{plan.duration}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <span>{goalInfo.emoji}</span>
                        <span>{goalInfo.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${difficultyInfo.color}`}>
                          {difficultyInfo.emoji} {difficultyInfo.label}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Coach view
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">🏋️ Workout Plans</h1>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Plan
          </button>
        </div>

        {workoutPlans.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-4xl mb-3">📋</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Workout Plans Yet</h3>
            <p className="text-gray-600 mb-4">
              Create your first workout plan and assign it to a client.
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Your First Plan
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workoutPlans.map((plan) => {
              const goalInfo = getGoalInfo(plan.goal)
              const difficultyInfo = getDifficultyInfo(plan.difficulty)

              return (
                <div
                  key={plan.id}
                  onClick={() => navigate(`/workout-plan/${plan.id}`)}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 flex-1 pr-2">{plan.name}</h3>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openEditModal(plan)
                        }}
                        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Edit plan"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(plan.id)
                        }}
                        disabled={deleting === plan.id}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete plan"
                      >
                        {deleting === plan.id ? (
                          <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <span>⏱️</span>
                      <span>{plan.duration}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <span>{goalInfo.emoji}</span>
                      <span>{goalInfo.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${difficultyInfo.color}`}>
                        {difficultyInfo.emoji} {difficultyInfo.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 pt-2 border-t border-gray-100 mt-2">
                      {plan.client_id ? (
                        <>
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {plan.client_photo ? (
                              <img
                                src={plan.client_photo}
                                alt={plan.client_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xs">👤</span>
                            )}
                          </div>
                          <span className="text-gray-900 truncate">{plan.client_name}</span>
                        </>
                      ) : (
                        <>
                          <span>👤</span>
                          <span className="text-gray-400 italic">Not assigned</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeModal}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {editingPlan ? '✏️ Edit Workout Plan' : '➕ Create Workout Plan'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Plan Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plan Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., 12-Week Strength Program"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration
                  </label>
                  <input
                    type="text"
                    value={formData.duration}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                    placeholder="e.g., 8 weeks, 30 days"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Goal */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Goal
                  </label>
                  <select
                    value={formData.goal}
                    onChange={(e) => setFormData(prev => ({ ...prev, goal: e.target.value as 'weight_loss' | 'muscle_gain' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="weight_loss">🔥 Weight Loss</option>
                    <option value="muscle_gain">💪 Muscle Gain</option>
                  </select>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Difficulty Level
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value as 'beginner' | 'intermediate' | 'advanced' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="beginner">🌱 Beginner</option>
                    <option value="intermediate">⚡ Intermediate</option>
                    <option value="advanced">🚀 Advanced</option>
                  </select>
                </div>

                {/* Assign to Client */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assign to Client
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowClientDropdown(!showClientDropdown)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-left flex items-center justify-between bg-white"
                    >
                      {formData.client_id ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {clients.find(c => c.id === formData.client_id)?.photo ? (
                              <img
                                src={clients.find(c => c.id === formData.client_id)?.photo}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xs">👤</span>
                            )}
                          </div>
                          <span className="truncate">{clients.find(c => c.id === formData.client_id)?.name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500">Not assigned</span>
                      )}
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {showClientDropdown && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, client_id: '' }))
                            setShowClientDropdown(false)
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-500"
                        >
                          <span>Not assigned</span>
                        </button>
                        {clients.map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, client_id: client.id }))
                              setShowClientDropdown(false)
                            }}
                            className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 ${
                              formData.client_id === client.id ? 'bg-primary-50' : ''
                            }`}
                          >
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {client.photo ? (
                                <img
                                  src={client.photo}
                                  alt={client.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-xs">👤</span>
                              )}
                            </div>
                            <span className="truncate">{client.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {clients.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      No clients yet. Start a conversation with clients to assign plans.
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !formData.name || !formData.duration}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : editingPlan ? (
                      'Update Plan'
                    ) : (
                      'Create Plan'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WorkoutPlans
