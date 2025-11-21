import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { useRamadan } from '../contexts/RamadanContext'

interface MealPlan {
  id: string
  coach_id: string
  client_id: string | null
  name: string
  description: string | null
  calories_target: number | null
  protein_target_g: number | null
  carbs_target_g: number | null
  fats_target_g: number | null
  ramadan_mode: boolean
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

const MealPlansNew = () => {
  const navigate = useNavigate()
  const { ramadanMode: ramadanModeFilter, setRamadanMode: setRamadanModeFilter } = useRamadan()
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
    calories_target: '' as string | number,
    protein_target_g: '' as string | number,
    carbs_target_g: '' as string | number,
    fats_target_g: '' as string | number,
    ramadan_mode: false,
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

      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        // Get client names and photos for assigned plans
        const plansWithClientInfo = await Promise.all(
          data.map(async (plan) => {
            if (plan.client_id) {
              const { data: clientData } = await supabase
                .from('client_profiles')
                .select('full_name, profile_photo')
                .eq('user_id', plan.client_id)
                .single()

              return {
                ...plan,
                client_name: clientData?.full_name || 'Unknown Client',
                client_photo: clientData?.profile_photo
              }
            }
            return plan
          })
        )

        setMealPlans(plansWithClientInfo)
      }

      setLoading(false)
    }

    fetchMealPlans()
  }, [currentUserId, coachProfileId])

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
      description: formData.description || null,
      calories_target: formData.calories_target ? Number(formData.calories_target) : null,
      protein_target_g: formData.protein_target_g ? Number(formData.protein_target_g) : null,
      carbs_target_g: formData.carbs_target_g ? Number(formData.carbs_target_g) : null,
      fats_target_g: formData.fats_target_g ? Number(formData.fats_target_g) : null,
      ramadan_mode: formData.ramadan_mode,
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
      description: plan.description || '',
      calories_target: plan.calories_target || '',
      protein_target_g: plan.protein_target_g || '',
      carbs_target_g: plan.carbs_target_g || '',
      fats_target_g: plan.fats_target_g || '',
      ramadan_mode: plan.ramadan_mode,
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
      calories_target: '',
      protein_target_g: '',
      carbs_target_g: '',
      fats_target_g: '',
      ramadan_mode: false,
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
      calories_target: '',
      protein_target_g: '',
      carbs_target_g: '',
      fats_target_g: '',
      ramadan_mode: false,
      client_id: ''
    })
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
          <h1 className="text-2xl font-bold text-gray-900 mb-6">🍽️ My Meal Plans</h1>

          {mealPlans.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="text-4xl mb-3">🥗</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Meal Plans Yet</h3>
              <p className="text-gray-600">
                Your coach hasn't assigned you any meal plans yet. Check back later!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mealPlans.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => navigate(`/meal-plan/${plan.id}`)}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 flex-1">{plan.name}</h3>
                    {plan.ramadan_mode && (
                      <span className="text-xl">🌙</span>
                    )}
                  </div>

                  {plan.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{plan.description}</p>
                  )}

                  <div className="space-y-2 text-sm">
                    {plan.calories_target && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <span>🔥</span>
                        <span>{plan.calories_target} calories/day</span>
                      </div>
                    )}
                    {(plan.protein_target_g || plan.carbs_target_g || plan.fats_target_g) && (
                      <div className="flex flex-wrap items-center gap-3 text-gray-600">
                        {plan.protein_target_g && <span>💪 {plan.protein_target_g}g protein</span>}
                        {plan.carbs_target_g && <span>🍞 {plan.carbs_target_g}g carbs</span>}
                        {plan.fats_target_g && <span>🥑 {plan.fats_target_g}g fats</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Filter meal plans based on Ramadan mode
  const filteredMealPlans = ramadanModeFilter
    ? mealPlans.filter(plan => plan.ramadan_mode === true)
    : mealPlans

  // Coach view
  return (
    <div className={`min-h-screen transition-colors duration-300 ${ramadanModeFilter ? 'bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900' : 'bg-gray-50'}`}>
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className={`text-2xl font-bold transition-colors ${ramadanModeFilter ? 'text-yellow-400' : 'text-gray-900'}`}>
            {ramadanModeFilter ? '🌙 Ramadan Meal Plans' : '🍽️ Meal Plans'}
          </h1>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setRamadanModeFilter(!ramadanModeFilter)}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
                ramadanModeFilter
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-gray-900 hover:from-yellow-600 hover:to-yellow-700 shadow-lg shadow-yellow-500/50'
                  : 'bg-gray-800 text-white hover:bg-gray-700 border border-gray-700'
              }`}
            >
              <span className="text-lg">🌙</span>
              <span>{ramadanModeFilter ? 'Exit Ramadan Mode' : 'Ramadan Mode'}</span>
            </button>
            <button
              onClick={openCreateModal}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
                ramadanModeFilter
                  ? 'bg-yellow-500 text-gray-900 hover:bg-yellow-600'
                  : 'bg-primary-600 text-white hover:bg-primary-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Meal Plan
            </button>
          </div>
        </div>

        {filteredMealPlans.length === 0 ? (
          <div className={`rounded-xl shadow-sm p-8 text-center transition-colors ${
            ramadanModeFilter
              ? 'bg-gray-800 border border-yellow-500/30'
              : 'bg-white border border-gray-200'
          }`}>
            <div className="text-4xl mb-3">{ramadanModeFilter ? '🌙' : '📋'}</div>
            <h3 className={`text-lg font-semibold mb-2 ${ramadanModeFilter ? 'text-yellow-400' : 'text-gray-900'}`}>
              {ramadanModeFilter ? 'No Ramadan Meal Plans Yet' : 'No Meal Plans Yet'}
            </h3>
            <p className={`mb-4 ${ramadanModeFilter ? 'text-gray-300' : 'text-gray-600'}`}>
              {ramadanModeFilter
                ? 'Create your first Ramadan meal plan with Suhoor and Iftar meals.'
                : 'Create your first meal plan and assign it to a client.'}
            </p>
            <button
              onClick={openCreateModal}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
                ramadanModeFilter
                  ? 'bg-yellow-500 text-gray-900 hover:bg-yellow-600'
                  : 'bg-primary-600 text-white hover:bg-primary-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Your First {ramadanModeFilter ? 'Ramadan ' : ''}Meal Plan
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMealPlans.map((plan) => (
              <div
                key={plan.id}
                onClick={() => navigate(`/meal-plan/${plan.id}`)}
                className={`rounded-xl shadow-sm p-5 hover:shadow-md transition-all cursor-pointer ${
                  ramadanModeFilter
                    ? 'bg-gray-800 border border-yellow-500/30 hover:border-yellow-500/50'
                    : 'bg-white border border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className={`text-lg font-semibold flex-1 pr-2 ${ramadanModeFilter ? 'text-yellow-400' : 'text-gray-900'}`}>
                    {plan.name}
                  </h3>
                  <div className="flex items-center gap-1">
                    {plan.ramadan_mode && (
                      <span className="text-xl" title="Ramadan Mode">🌙</span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openEditModal(plan)
                      }}
                      className={`p-1.5 rounded-lg transition-colors ${
                        ramadanModeFilter
                          ? 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10'
                          : 'text-gray-400 hover:text-primary-600 hover:bg-primary-50'
                      }`}
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

                {plan.description && (
                  <p className={`text-sm mb-3 line-clamp-2 ${ramadanModeFilter ? 'text-gray-300' : 'text-gray-600'}`}>
                    {plan.description}
                  </p>
                )}

                <div className="space-y-2 text-sm">
                  {plan.calories_target && (
                    <div className={`flex items-center gap-2 ${ramadanModeFilter ? 'text-gray-300' : 'text-gray-600'}`}>
                      <span>🔥</span>
                      <span>{plan.calories_target} calories/day</span>
                    </div>
                  )}
                  {(plan.protein_target_g || plan.carbs_target_g || plan.fats_target_g) && (
                    <div className={`flex flex-wrap items-center gap-3 text-xs ${ramadanModeFilter ? 'text-gray-300' : 'text-gray-600'}`}>
                      {plan.protein_target_g && <span>💪 {plan.protein_target_g}g P</span>}
                      {plan.carbs_target_g && <span>🍞 {plan.carbs_target_g}g C</span>}
                      {plan.fats_target_g && <span>🥑 {plan.fats_target_g}g F</span>}
                    </div>
                  )}
                  <div className={`flex items-center gap-2 pt-2 mt-2 ${
                    ramadanModeFilter
                      ? 'text-gray-300 border-t border-yellow-500/20'
                      : 'text-gray-600 border-t border-gray-100'
                  }`}>
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
                        <span className={`truncate ${ramadanModeFilter ? 'text-yellow-400' : 'text-gray-900'}`}>
                          {plan.client_name}
                        </span>
                      </>
                    ) : (
                      <>
                        <span>👤</span>
                        <span className={`italic ${ramadanModeFilter ? 'text-gray-500' : 'text-gray-400'}`}>
                          Not assigned
                        </span>
                      </>
                    )}
                  </div>
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
                    placeholder="e.g., High Protein Weight Loss"
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
                    placeholder="Brief description of the meal plan..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Calories Target */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    🔥 Daily Calorie Target
                  </label>
                  <input
                    type="number"
                    value={formData.calories_target}
                    onChange={(e) => setFormData(prev => ({ ...prev, calories_target: e.target.value }))}
                    placeholder="e.g., 2000"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Macros Targets */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Macro Targets (grams per day)
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">💪 Protein</label>
                      <input
                        type="number"
                        value={formData.protein_target_g}
                        onChange={(e) => setFormData(prev => ({ ...prev, protein_target_g: e.target.value }))}
                        placeholder="150"
                        min="0"
                        step="0.1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">🍞 Carbs</label>
                      <input
                        type="number"
                        value={formData.carbs_target_g}
                        onChange={(e) => setFormData(prev => ({ ...prev, carbs_target_g: e.target.value }))}
                        placeholder="200"
                        min="0"
                        step="0.1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">🥑 Fats</label>
                      <input
                        type="number"
                        value={formData.fats_target_g}
                        onChange={(e) => setFormData(prev => ({ ...prev, fats_target_g: e.target.value }))}
                        placeholder="60"
                        min="0"
                        step="0.1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Ramadan Mode */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.ramadan_mode}
                      onChange={(e) => setFormData(prev => ({ ...prev, ramadan_mode: e.target.checked }))}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      🌙 Ramadan Mode (includes Suhoor & Iftar)
                    </span>
                  </label>
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
                    disabled={saving || !formData.name}
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

export default MealPlansNew
