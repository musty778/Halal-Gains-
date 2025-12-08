import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import LoadingSpinner from '../components/LoadingSpinner'

interface MealPlan {
  id: string
  coach_id: string
  client_id: string | null
  name: string
  description: string
  daily_calories: number
  protein_target_g: number
  created_at: string
  updated_at: string
  client_name?: string
  client_photo?: string
}

interface Client {
  id: string
  name: string
  photo?: string
}

const MealPlans = () => {
  const navigate = useNavigate()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isCoach, setIsCoach] = useState(false)
  const [coachProfileId, setCoachProfileId] = useState<string | null>(null)
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState<MealPlan | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showClientDropdown, setShowClientDropdown] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    daily_calories: '',
    protein_target_g: '',
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

  // Fetch meal plans
  useEffect(() => {
    const fetchMealPlans = async () => {
      if (!currentUserId) return

      setMealPlans([])
      setLoading(true)

      // Build query based on user type
      let query = supabase
        .from('meal_plans')
        .select('*')
        .order('created_at', { ascending: false })

      // Filter by user type
      if (isCoach && coachProfileId) {
        // Coaches see their own meal plans
        query = query.eq('coach_id', coachProfileId)
      } else if (!isCoach) {
        // Clients see only their assigned meal plans
        query = query.eq('client_id', currentUserId)
      }

      const { data, error } = await query

      if (!error && data) {
        // Get all unique client IDs
        const clientIds = [...new Set(data.map(plan => plan.client_id).filter(Boolean))]

        // Fetch all client data
        const clientsResult = clientIds.length > 0
          ? await supabase
              .from('client_profiles')
              .select('user_id, full_name, profile_photo')
              .in('user_id', clientIds)
          : { data: [] }

        // Create lookup map for fast access
        const clientsMap = new Map(
          (clientsResult.data || []).map(c => [c.user_id, c])
        )

        // Map the data
        const plansWithClientInfo = data.map(plan => {
          const clientData = plan.client_id ? clientsMap.get(plan.client_id) : undefined

          return {
            ...plan,
            client_name: clientData?.full_name || (plan.client_id ? 'Unknown Client' : undefined),
            client_photo: clientData?.profile_photo
          }
        })

        setMealPlans(plansWithClientInfo)
      }

      setLoading(false)
    }

    // Only fetch when we know the user type
    if (currentUserId && (isCoach ? coachProfileId : true)) {
      fetchMealPlans()
    }
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
      description: formData.description,
      daily_calories: parseInt(formData.daily_calories),
      protein_target_g: parseInt(formData.protein_target_g),
      client_id: formData.client_id || null,
      updated_at: new Date().toISOString()
    }

    if (editingPlan) {
      // Update existing plan
      const { error } = await supabase
        .from('meal_plans')
        .update(planData)
        .eq('id', editingPlan.id)

      if (!error) {
        // Update local state
        const client = formData.client_id
          ? clients.find(c => c.id === formData.client_id)
          : undefined

        setMealPlans(prev =>
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
        .from('meal_plans')
        .insert(planData)
        .select()
        .single()

      if (!error && data) {
        const client = formData.client_id
          ? clients.find(c => c.id === formData.client_id)
          : undefined

        setMealPlans(prev => [{ ...data, client_name: client?.name, client_photo: client?.photo }, ...prev])
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
      .from('meal_plans')
      .delete()
      .eq('id', planId)

    if (!error) {
      setMealPlans(prev => prev.filter(p => p.id !== planId))
    }

    setDeleting(null)
  }

  // Open modal for editing
  const openEditModal = (plan: MealPlan) => {
    setEditingPlan(plan)
    setFormData({
      name: plan.name,
      description: plan.description,
      daily_calories: plan.daily_calories.toString(),
      protein_target_g: plan.protein_target_g.toString(),
      client_id: plan.client_id || ''
    })
    setShowModal(true)
  }

  // Open modal for creating
  const openCreateModal = () => {
    setEditingPlan(null)
    setFormData({
      name: '',
      description: '',
      daily_calories: '',
      protein_target_g: '',
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
      description: '',
      daily_calories: '',
      protein_target_g: '',
      client_id: ''
    })
  }

  // Show loading spinner
  if (loading) {
    return <LoadingSpinner />
  }

  // Client view
  if (!isCoach) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-cyan-50/20">
        <div className="container mx-auto px-4 py-6">
          {/* Beautiful Gradient Title */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent mb-2">
              My Meal Plans
            </h1>
            <p className="text-gray-600 text-lg">Your personalized nutrition plans</p>
          </div>

          {mealPlans.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center max-w-md mx-auto">
              <div className="text-4xl mb-3">🍽️</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Meal Plans Yet</h3>
              <p className="text-gray-600">
                Your coach hasn't assigned you any meal plans yet. Check back later!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mealPlans.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => navigate(`/meal-plan/${plan.id}`)}
                  className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer group"
                  style={{ boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
                >
                  {/* Gradient Header */}
                  <div className="relative h-40 bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 overflow-hidden">
                    {/* Glassy overlay */}
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                  </div>

                  {/* Card Content */}
                  <div className="px-6 pb-6 -mt-12">
                    {/* Icon Circle - overlapping the gradient */}
                    <div className="flex justify-center mb-4">
                      <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-xl flex items-center justify-center text-4xl relative z-10">
                        🍽️
                      </div>
                    </div>

                    {/* Plan Name */}
                    <h3 className="text-xl font-bold text-gray-900 text-center mb-3 group-hover:text-emerald-600 transition-colors">
                      {plan.name}
                    </h3>

                    {/* Plan Details */}
                    <div className="space-y-3 mb-4">
                      {/* Calories */}
                      <div className="flex items-center justify-center gap-2 text-gray-700">
                        <span className="text-lg">🔥</span>
                        <span className="font-semibold">{plan.daily_calories} calories/day</span>
                      </div>

                      {/* Protein */}
                      <div className="flex items-center justify-center gap-2 text-gray-700">
                        <span className="text-lg">💪</span>
                        <span className="font-semibold">{plan.protein_target_g}g protein</span>
                      </div>
                    </div>

                    {/* View Button */}
                    <button className="w-full py-3 px-4 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-all text-base shadow-md hover:shadow-lg group-hover:scale-105 transform duration-300">
                      View Plan
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Coach view
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-cyan-50/20">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">🍽️ Meal Plans</h1>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full font-semibold hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Meal Plan
          </button>
        </div>

        {mealPlans.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-4xl mb-3">📋</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Meal Plans Yet</h3>
            <p className="text-gray-600 mb-4">
              Create your first meal plan and assign it to a client.
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full font-semibold hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Your First Meal Plan
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mealPlans.map((plan) => (
              <div
                key={plan.id}
                className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden hover:shadow-3xl transition-all duration-300 cursor-pointer group relative"
                style={{ boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.15)' }}
              >
                {/* Gradient Header - Larger */}
                <div className="relative h-56 bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 overflow-hidden">
                  {/* Glassy overlay */}
                  <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>

                  {/* Edit and Delete buttons in top right */}
                  <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openEditModal(plan)
                      }}
                      className="p-2.5 text-white hover:bg-white/20 rounded-lg transition-colors backdrop-blur-sm"
                      title="Edit plan"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(plan.id)
                      }}
                      disabled={deleting === plan.id}
                      className="p-2.5 text-white hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50 backdrop-blur-sm"
                      title="Delete plan"
                    >
                      {deleting === plan.id ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Card Content */}
                <div className="px-8 pb-8 -mt-16 relative">
                  {/* Icon Circle - Larger and overlapping the gradient */}
                  <div className="flex justify-center mb-6">
                    <div className="w-28 h-28 rounded-3xl bg-white border-4 border-white shadow-2xl flex items-center justify-center text-5xl relative z-10">
                      🍽️
                    </div>
                  </div>

                  {/* Plan Name - Larger */}
                  <h3 className="text-2xl font-bold text-gray-900 text-center mb-2 group-hover:text-emerald-600 transition-colors">
                    {plan.name}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-500 text-center mb-6 text-sm">
                    {plan.description || 'Custom meal plan'}
                  </p>

                  {/* Plan Details - Larger spacing */}
                  <div className="space-y-4 mb-6">
                    {/* Calories */}
                    <div className="flex items-center justify-center gap-3 text-gray-800">
                      <span className="text-2xl">🔥</span>
                      <span className="font-bold text-lg">{plan.daily_calories} calories/day</span>
                    </div>

                    {/* Protein - with background pill */}
                    <div className="flex justify-center">
                      <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-50 rounded-full">
                        <span className="text-xl">💪</span>
                        <span className="font-bold text-emerald-700">{plan.protein_target_g}g protein</span>
                      </div>
                    </div>

                    {/* Client Assignment */}
                    {plan.client_id && (
                      <div className="flex items-center justify-center gap-2 text-gray-700 pt-2">
                        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {plan.client_photo ? (
                            <img
                              src={plan.client_photo}
                              alt={plan.client_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-sm">👤</span>
                          )}
                        </div>
                        <span className="text-gray-900 font-semibold">{plan.client_name}</span>
                      </div>
                    )}
                  </div>

                  {/* View Button - Larger */}
                  <button
                    onClick={() => navigate(`/meal-plan/${plan.id}`)}
                    className="w-full py-4 px-6 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all text-lg shadow-lg hover:shadow-xl group-hover:scale-[1.02] transform duration-300"
                  >
                    View Plan
                  </button>
                </div>
              </div>
            ))}
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
                {editingPlan ? '✏️ Edit Meal Plan' : '➕ Create Meal Plan'}
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
                    placeholder="e.g., Keto Diet Plan"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of the meal plan"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Daily Calories */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Daily Calories
                  </label>
                  <input
                    type="number"
                    value={formData.daily_calories}
                    onChange={(e) => setFormData(prev => ({ ...prev, daily_calories: e.target.value }))}
                    placeholder="e.g., 2000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Protein Target */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Protein Target (grams)
                  </label>
                  <input
                    type="number"
                    value={formData.protein_target_g}
                    onChange={(e) => setFormData(prev => ({ ...prev, protein_target_g: e.target.value }))}
                    placeholder="e.g., 100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
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
                    disabled={saving || !formData.name || !formData.description || !formData.daily_calories || !formData.protein_target_g}
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

export default MealPlans
