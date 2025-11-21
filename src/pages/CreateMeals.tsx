import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'

interface MealPlan {
  id: string
  name: string
  client_name?: string
}

interface Ingredient {
  id: string
  name: string
  serving_size: string
  quantity: string
  calories: string
}

interface Meal {
  id: string
  meal_type: string
  meal_name: string
  description: string
  total_calories: string
  ingredients: Ingredient[]
}

const CreateMeals = () => {
  const navigate = useNavigate()
  const [coachProfileId, setCoachProfileId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Step 1: Select meal plan
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')

  // Step 2: Select/Create day
  const [dayNumber, setDayNumber] = useState<string>('1')
  const [dayName, setDayName] = useState<string>('')

  // Step 3: Create meals
  const [meals, setMeals] = useState<Meal[]>([])
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null)

  const mealTypes = [
    { value: 'breakfast', label: 'Breakfast', emoji: '🍳' },
    { value: 'morning_snack', label: 'Morning Snack', emoji: '🍎' },
    { value: 'lunch', label: 'Lunch', emoji: '🍱' },
    { value: 'afternoon_snack', label: 'Afternoon Snack', emoji: '🥤' },
    { value: 'dinner', label: 'Dinner', emoji: '🍽️' },
    { value: 'evening_snack', label: 'Evening Snack', emoji: '🍪' },
    { value: 'suhoor', label: 'Suhoor', emoji: '🌙' },
    { value: 'iftar', label: 'Iftar', emoji: '🌅' },
    { value: 'post_taraweeh_snack', label: 'Post-Taraweeh Snack', emoji: '🕌' },
  ]

  // Get current user and check if coach
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }

      // Check if user is a coach
      const { data: coachData } = await supabase
        .from('coach_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!coachData) {
        navigate('/')
        return
      }

      setCoachProfileId(coachData.id)
    }

    getCurrentUser()
  }, [navigate])

  // Fetch meal plans
  useEffect(() => {
    const fetchMealPlans = async () => {
      if (!coachProfileId) return

      const { data, error } = await supabase
        .from('meal_plans')
        .select('id, name, client_id')
        .eq('coach_id', coachProfileId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        // Get client names
        const plansWithClientNames = await Promise.all(
          data.map(async (plan) => {
            if (plan.client_id) {
              const { data: clientData } = await supabase
                .from('client_profiles')
                .select('full_name')
                .eq('user_id', plan.client_id)
                .single()

              return {
                ...plan,
                client_name: clientData?.full_name
              }
            }
            return plan
          })
        )

        setMealPlans(plansWithClientNames)
      }

      setLoading(false)
    }

    fetchMealPlans()
  }, [coachProfileId])

  // Add new meal
  const addMeal = (mealType: string) => {
    const newMeal: Meal = {
      id: Date.now().toString(),
      meal_type: mealType,
      meal_name: '',
      description: '',
      total_calories: '',
      ingredients: []
    }
    setMeals([...meals, newMeal])
    setExpandedMealId(newMeal.id)
  }

  // Remove meal
  const removeMeal = (mealId: string) => {
    setMeals(meals.filter(m => m.id !== mealId))
  }

  // Update meal
  const updateMeal = (mealId: string, field: string, value: string) => {
    setMeals(meals.map(m => m.id === mealId ? { ...m, [field]: value } : m))
  }

  // Add ingredient to meal
  const addIngredient = (mealId: string) => {
    const newIngredient: Ingredient = {
      id: Date.now().toString(),
      name: '',
      serving_size: '',
      quantity: '',
      calories: ''
    }
    setMeals(meals.map(m =>
      m.id === mealId
        ? { ...m, ingredients: [...m.ingredients, newIngredient] }
        : m
    ))
  }

  // Remove ingredient
  const removeIngredient = (mealId: string, ingredientId: string) => {
    setMeals(meals.map(m =>
      m.id === mealId
        ? { ...m, ingredients: m.ingredients.filter(i => i.id !== ingredientId) }
        : m
    ))
  }

  // Update ingredient
  const updateIngredient = (mealId: string, ingredientId: string, field: string, value: string) => {
    setMeals(meals.map(m =>
      m.id === mealId
        ? {
            ...m,
            ingredients: m.ingredients.map(i =>
              i.id === ingredientId ? { ...i, [field]: value } : i
            )
          }
        : m
    ))
  }

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlanId || meals.length === 0 || saving) return

    setSaving(true)

    try {
      // 1. Create or get meal_plan_day
      const { data: existingDay } = await supabase
        .from('meal_plan_days')
        .select('id')
        .eq('meal_plan_id', selectedPlanId)
        .eq('day_number', parseInt(dayNumber))
        .single()

      let dayId: string

      if (existingDay) {
        dayId = existingDay.id
      } else {
        const { data: newDay, error: dayError } = await supabase
          .from('meal_plan_days')
          .insert({
            meal_plan_id: selectedPlanId,
            day_number: parseInt(dayNumber),
            day_name: dayName || null
          })
          .select()
          .single()

        if (dayError || !newDay) {
          console.error('Error creating day:', dayError)
          setSaving(false)
          return
        }

        dayId = newDay.id
      }

      // 2. Create meals
      for (const meal of meals) {
        const { data: newMeal, error: mealError } = await supabase
          .from('meal_plan_meals')
          .insert({
            meal_plan_day_id: dayId,
            meal_type: meal.meal_type,
            meal_name: meal.meal_name || null,
            description: meal.description || null,
            total_calories: meal.total_calories ? parseInt(meal.total_calories) : null
          })
          .select()
          .single()

        if (mealError || !newMeal) {
          console.error('Error creating meal:', mealError)
          continue
        }

        // 3. Create ingredients for this meal
        if (meal.ingredients.length > 0) {
          const ingredientsToInsert = meal.ingredients
            .filter(ing => ing.name) // Only insert ingredients with names
            .map((ing, index) => ({
              meal_plan_meal_id: newMeal.id,
              food_name: ing.name,
              serving_size: ing.serving_size || null,
              quantity: ing.quantity ? parseFloat(ing.quantity) : null,
              calories: ing.calories ? parseInt(ing.calories) : null,
              food_order: index
            }))

          if (ingredientsToInsert.length > 0) {
            await supabase
              .from('meal_plan_foods')
              .insert(ingredientsToInsert)
          }
        }
      }

      // Success - navigate to meal plan detail
      navigate(`/meal-plan/${selectedPlanId}`)
    } catch (error) {
      console.error('Error saving meals:', error)
      setSaving(false)
    }
  }

  const getMealTypeEmoji = (mealType: string) => {
    return mealTypes.find(mt => mt.value === mealType)?.emoji || '🍴'
  }

  const getMealTypeLabel = (mealType: string) => {
    return mealTypes.find(mt => mt.value === mealType)?.label || mealType
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
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">🍽️ Create Daily Meals</h1>
          <p className="text-gray-600 mt-1">Add meals for your clients' meal plans</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Select Meal Plan */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">📋 Step 1: Select Meal Plan</h2>

            {mealPlans.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-600 mb-3">You don't have any meal plans yet.</p>
                <button
                  type="button"
                  onClick={() => navigate('/meal-plans-new')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                >
                  Create Meal Plan
                </button>
              </div>
            ) : (
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                <option value="">-- Select a meal plan --</option>
                {mealPlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} {plan.client_name ? `(${plan.client_name})` : '(Unassigned)'}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Step 2: Select Day */}
          {selectedPlanId && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">📅 Step 2: Select Day</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Day Number
                  </label>
                  <input
                    type="number"
                    value={dayNumber}
                    onChange={(e) => setDayNumber(e.target.value)}
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Day Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={dayName}
                    onChange={(e) => setDayName(e.target.value)}
                    placeholder="e.g., Monday, Rest Day"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Add Meals */}
          {selectedPlanId && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">🍴 Step 3: Add Meals</h2>
              </div>

              {/* Meal Type Buttons */}
              <div className="flex flex-wrap gap-2 mb-6">
                {mealTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => addMeal(type.value)}
                    disabled={meals.some(m => m.meal_type === type.value)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>{type.emoji}</span>
                    <span>{type.label}</span>
                  </button>
                ))}
              </div>

              {/* Meals List */}
              {meals.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                  <div className="text-4xl mb-2">🍽️</div>
                  <p className="text-gray-600">Click a button above to add a meal</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {meals.map((meal) => (
                    <div key={meal.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Meal Header */}
                      <div
                        className="bg-gray-50 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => setExpandedMealId(expandedMealId === meal.id ? null : meal.id)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getMealTypeEmoji(meal.meal_type)}</span>
                          <div>
                            <h3 className="font-medium text-gray-900">{getMealTypeLabel(meal.meal_type)}</h3>
                            {meal.meal_name && (
                              <p className="text-sm text-gray-600">{meal.meal_name}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {meal.total_calories && (
                            <span className="text-sm text-gray-600">🔥 {meal.total_calories} cal</span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeMeal(meal.id)
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                          <svg
                            className={`w-5 h-5 text-gray-400 transition-transform ${expandedMealId === meal.id ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>

                      {/* Meal Details */}
                      {expandedMealId === meal.id && (
                        <div className="p-4 space-y-4">
                          {/* Meal Name */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Meal Name
                            </label>
                            <input
                              type="text"
                              value={meal.meal_name}
                              onChange={(e) => updateMeal(meal.id, 'meal_name', e.target.value)}
                              placeholder="e.g., Grilled Chicken with Rice"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                          </div>

                          {/* Description */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Description
                            </label>
                            <textarea
                              value={meal.description}
                              onChange={(e) => updateMeal(meal.id, 'description', e.target.value)}
                              placeholder="Brief description of the meal..."
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                            />
                          </div>

                          {/* Total Calories */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              🔥 Total Calories
                            </label>
                            <input
                              type="number"
                              value={meal.total_calories}
                              onChange={(e) => updateMeal(meal.id, 'total_calories', e.target.value)}
                              placeholder="e.g., 500"
                              min="0"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                          </div>

                          {/* Ingredients */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-sm font-medium text-gray-700">
                                🥘 Ingredients
                              </label>
                              <button
                                type="button"
                                onClick={() => addIngredient(meal.id)}
                                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                              >
                                + Add Ingredient
                              </button>
                            </div>

                            {meal.ingredients.length === 0 ? (
                              <div className="text-center py-4 border-2 border-dashed border-gray-200 rounded-lg">
                                <p className="text-sm text-gray-600">No ingredients yet</p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {meal.ingredients.map((ingredient) => (
                                  <div key={ingredient.id} className="grid grid-cols-12 gap-2 items-start bg-gray-50 p-3 rounded-lg">
                                    {/* Ingredient Name */}
                                    <div className="col-span-12 sm:col-span-4">
                                      <input
                                        type="text"
                                        value={ingredient.name}
                                        onChange={(e) => updateIngredient(meal.id, ingredient.id, 'name', e.target.value)}
                                        placeholder="Ingredient name"
                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                      />
                                    </div>

                                    {/* Serving Size */}
                                    <div className="col-span-5 sm:col-span-3">
                                      <input
                                        type="text"
                                        value={ingredient.serving_size}
                                        onChange={(e) => updateIngredient(meal.id, ingredient.id, 'serving_size', e.target.value)}
                                        placeholder="e.g., 1 cup"
                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                      />
                                    </div>

                                    {/* Quantity */}
                                    <div className="col-span-3 sm:col-span-2">
                                      <input
                                        type="number"
                                        value={ingredient.quantity}
                                        onChange={(e) => updateIngredient(meal.id, ingredient.id, 'quantity', e.target.value)}
                                        placeholder="Qty"
                                        step="0.1"
                                        min="0"
                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                      />
                                    </div>

                                    {/* Calories */}
                                    <div className="col-span-3 sm:col-span-2">
                                      <input
                                        type="number"
                                        value={ingredient.calories}
                                        onChange={(e) => updateIngredient(meal.id, ingredient.id, 'calories', e.target.value)}
                                        placeholder="Cal"
                                        min="0"
                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                      />
                                    </div>

                                    {/* Remove Button */}
                                    <div className="col-span-1">
                                      <button
                                        type="button"
                                        onClick={() => removeIngredient(meal.id, ingredient.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Submit Buttons */}
          {selectedPlanId && meals.length > 0 && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate('/meal-plans-new')}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Meals
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

export default CreateMeals
