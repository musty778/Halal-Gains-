import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'

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
}

interface CoachInfo {
  id: string
  user_id: string
  full_name: string
  profile_photos: string[]
  bio?: string
}

interface MealPlanDay {
  id: string
  meal_plan_id: string
  day_number: number
  day_name: string | null
  notes: string | null
  meals: MealPlanMeal[]
}

interface MealPlanMeal {
  id: string
  meal_plan_day_id: string
  meal_type: string
  meal_name: string | null
  description: string | null
  total_calories: number | null
  meal_time: string | null
  notes: string | null
  meal_order: number
  foods: MealPlanFood[]
}

interface MealPlanFood {
  id: string
  meal_plan_meal_id: string
  food_name: string
  serving_size: string | null
  quantity: number | null
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fats_g: number | null
  is_halal: boolean
  notes: string | null
  food_order: number
}

const MEAL_TYPES = [
  { value: 'suhoor', label: 'Suhoor', emoji: '🌙', ramadan: true },
  { value: 'breakfast', label: 'Breakfast', emoji: '🍳', ramadan: false },
  { value: 'morning_snack', label: 'Morning Snack', emoji: '🍎', ramadan: false },
  { value: 'lunch', label: 'Lunch', emoji: '🍽️', ramadan: false },
  { value: 'afternoon_snack', label: 'Afternoon Snack', emoji: '🥗', ramadan: false },
  { value: 'iftar', label: 'Iftar', emoji: '🌅', ramadan: true },
  { value: 'dinner', label: 'Dinner', emoji: '🍖', ramadan: false },
  { value: 'evening_snack', label: 'Evening Snack', emoji: '🥜', ramadan: false },
  { value: 'post_taraweeh_snack', label: 'Post-Taraweeh Snack', emoji: '🕌', ramadan: true }
]

const MealPlanDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null)
  const [coachInfo, setCoachInfo] = useState<CoachInfo | null>(null)
  const [mealPlanDays, setMealPlanDays] = useState<MealPlanDay[]>([])
  const [loading, setLoading] = useState(true)
  const [isCoach, setIsCoach] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [expandedDayId, setExpandedDayId] = useState<string | null>(null)

  // Modal states
  const [showDayModal, setShowDayModal] = useState(false)
  const [showMealModal, setShowMealModal] = useState(false)
  const [showFoodModal, setShowFoodModal] = useState(false)
  const [showEditMealModal, setShowEditMealModal] = useState(false)
  const [showEditFoodModal, setShowEditFoodModal] = useState(false)
  const [selectedDay, setSelectedDay] = useState<MealPlanDay | null>(null)
  const [selectedMeal, setSelectedMeal] = useState<MealPlanMeal | null>(null)
  const [selectedFood, setSelectedFood] = useState<MealPlanFood | null>(null)
  const [saving, setSaving] = useState(false)

  // Form states
  const [dayNumber, setDayNumber] = useState(1)
  const [dayName, setDayName] = useState('')
  const [dayNotes, setDayNotes] = useState('')
  const [mealType, setMealType] = useState('breakfast')
  const [mealName, setMealName] = useState('')
  const [mealDescription, setMealDescription] = useState('')
  const [mealTotalCalories, setMealTotalCalories] = useState<number | ''>('')
  const [mealTime, setMealTime] = useState('')
  const [mealNotes, setMealNotes] = useState('')
  const [foodName, setFoodName] = useState('')
  const [servingSize, setServingSize] = useState('')
  const [quantity, setQuantity] = useState<number | ''>('')
  const [calories, setCalories] = useState<number | ''>('')
  const [proteinG, setProteinG] = useState<number | ''>('')
  const [carbsG, setCarbsG] = useState<number | ''>('')
  const [fatsG, setFatsG] = useState<number | ''>('')
  const [isHalal, setIsHalal] = useState(true)
  const [foodNotes, setFoodNotes] = useState('')

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

    // Fetch meal plan
    const { data: planData, error: planError } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('id', id)
      .single()

    if (planError || !planData) {
      navigate('/meal-plans-new')
      return
    }

    setMealPlan(planData)

    // Fetch coach info
    const { data: coachData } = await supabase
      .from('coach_profiles')
      .select('id, user_id, full_name, profile_photos, bio')
      .eq('id', planData.coach_id)
      .single()

    if (coachData) {
      setCoachInfo(coachData)
    }

    // Fetch meal plan days with meals and foods
    await fetchMealPlanDays()

    setLoading(false)
  }

  const fetchMealPlanDays = async () => {
    if (!id) return

    const { data: daysData } = await supabase
      .from('meal_plan_days')
      .select('*')
      .eq('meal_plan_id', id)
      .order('day_number', { ascending: true })

    if (daysData) {
      const daysWithMeals = await Promise.all(
        daysData.map(async (day) => {
          const { data: mealsData } = await supabase
            .from('meal_plan_meals')
            .select('*')
            .eq('meal_plan_day_id', day.id)
            .order('meal_order', { ascending: true })

          const mealsWithFoods = await Promise.all(
            (mealsData || []).map(async (meal) => {
              const { data: foodsData } = await supabase
                .from('meal_plan_foods')
                .select('*')
                .eq('meal_plan_meal_id', meal.id)
                .order('food_order', { ascending: true })

              return {
                ...meal,
                foods: foodsData || []
              }
            })
          )

          return {
            ...day,
            meals: mealsWithFoods
          }
        })
      )

      setMealPlanDays(daysWithMeals)

      // Expand first day by default if not already expanded
      if (daysWithMeals.length > 0 && !expandedDayId) {
        setExpandedDayId(daysWithMeals[0].id)
      }
    }
  }

  const handleAddDay = async () => {
    if (!id || saving) return

    setSaving(true)
    const { error } = await supabase
      .from('meal_plan_days')
      .insert({
        meal_plan_id: id,
        day_number: dayNumber,
        day_name: dayName || null,
        notes: dayNotes || null
      })

    if (!error) {
      await fetchMealPlanDays()
      setShowDayModal(false)
      resetDayForm()
    }
    setSaving(false)
  }

  const handleAddMeal = async () => {
    if (!selectedDay || saving) return

    setSaving(true)

    // Get the current max order
    const { data: existingMeals } = await supabase
      .from('meal_plan_meals')
      .select('meal_order')
      .eq('meal_plan_day_id', selectedDay.id)
      .order('meal_order', { ascending: false })
      .limit(1)

    const nextOrder = existingMeals && existingMeals.length > 0
      ? existingMeals[0].meal_order + 1
      : 0

    const { error } = await supabase
      .from('meal_plan_meals')
      .insert({
        meal_plan_day_id: selectedDay.id,
        meal_type: mealType,
        meal_name: mealName || null,
        description: mealDescription || null,
        total_calories: mealTotalCalories || null,
        meal_time: mealTime || null,
        notes: mealNotes || null,
        meal_order: nextOrder
      })

    if (!error) {
      await fetchMealPlanDays()
      setShowMealModal(false)
      resetMealForm()
    }
    setSaving(false)
  }

  const handleEditMeal = async () => {
    if (!selectedMeal || saving) return

    setSaving(true)

    const { error } = await supabase
      .from('meal_plan_meals')
      .update({
        meal_name: mealName || null,
        description: mealDescription || null,
        total_calories: mealTotalCalories || null,
        meal_time: mealTime || null,
        notes: mealNotes || null
      })
      .eq('id', selectedMeal.id)

    if (!error) {
      await fetchMealPlanDays()
      setShowEditMealModal(false)
      resetMealForm()
    }
    setSaving(false)
  }

  const handleEditFood = async () => {
    if (!selectedFood || saving || !foodName) return

    setSaving(true)

    const { error } = await supabase
      .from('meal_plan_foods')
      .update({
        food_name: foodName,
        serving_size: servingSize || null,
        quantity: quantity || null,
        calories: calories || null,
        protein_g: proteinG || null,
        carbs_g: carbsG || null,
        fats_g: fatsG || null,
        is_halal: isHalal,
        notes: foodNotes || null
      })
      .eq('id', selectedFood.id)

    if (!error) {
      await fetchMealPlanDays()
      setShowEditFoodModal(false)
      resetFoodForm()
    }
    setSaving(false)
  }

  const handleAddFood = async () => {
    if (!selectedMeal || saving || !foodName) return

    setSaving(true)

    // Get the current max order
    const { data: existingFoods } = await supabase
      .from('meal_plan_foods')
      .select('food_order')
      .eq('meal_plan_meal_id', selectedMeal.id)
      .order('food_order', { ascending: false })
      .limit(1)

    const nextOrder = existingFoods && existingFoods.length > 0
      ? existingFoods[0].food_order + 1
      : 0

    const { error } = await supabase
      .from('meal_plan_foods')
      .insert({
        meal_plan_meal_id: selectedMeal.id,
        food_name: foodName,
        serving_size: servingSize || null,
        quantity: quantity || null,
        calories: calories || null,
        protein_g: proteinG || null,
        carbs_g: carbsG || null,
        fats_g: fatsG || null,
        is_halal: isHalal,
        notes: foodNotes || null,
        food_order: nextOrder
      })

    if (!error) {
      await fetchMealPlanDays()
      setShowFoodModal(false)
      resetFoodForm()
    }
    setSaving(false)
  }

  const handleDeleteDay = async (dayId: string) => {
    if (!confirm('Delete this day? This will remove all meals and foods.')) return

    const { error } = await supabase
      .from('meal_plan_days')
      .delete()
      .eq('id', dayId)

    if (!error) {
      await fetchMealPlanDays()
    }
  }

  const handleDeleteMeal = async (mealId: string) => {
    if (!confirm('Delete this meal? This will remove all foods.')) return

    const { error } = await supabase
      .from('meal_plan_meals')
      .delete()
      .eq('id', mealId)

    if (!error) {
      await fetchMealPlanDays()
    }
  }

  const handleDeleteFood = async (foodId: string) => {
    const { error } = await supabase
      .from('meal_plan_foods')
      .delete()
      .eq('id', foodId)

    if (!error) {
      await fetchMealPlanDays()
    }
  }

  const resetDayForm = () => {
    setDayName('')
    setDayNotes('')
  }

  const resetMealForm = () => {
    setMealType('breakfast')
    setMealName('')
    setMealDescription('')
    setMealTotalCalories('')
    setMealTime('')
    setMealNotes('')
  }

  const resetFoodForm = () => {
    setFoodName('')
    setServingSize('')
    setQuantity('')
    setCalories('')
    setProteinG('')
    setCarbsG('')
    setFatsG('')
    setIsHalal(true)
    setFoodNotes('')
  }

  const openAddDayModal = () => {
    const maxDay = mealPlanDays.length > 0
      ? Math.max(...mealPlanDays.map(d => d.day_number))
      : 0
    setDayNumber(maxDay + 1)
    resetDayForm()
    setShowDayModal(true)
  }

  const openAddMealModal = (day: MealPlanDay) => {
    setSelectedDay(day)
    resetMealForm()
    setShowMealModal(true)
  }

  const openAddFoodModal = (meal: MealPlanMeal) => {
    setSelectedMeal(meal)
    resetFoodForm()
    setShowFoodModal(true)
  }

  const openEditMealModal = (meal: MealPlanMeal) => {
    setSelectedMeal(meal)
    setMealName(meal.meal_name || '')
    setMealDescription(meal.description || '')
    setMealTotalCalories(meal.total_calories || '')
    setMealTime(meal.meal_time || '')
    setMealNotes(meal.notes || '')
    setShowEditMealModal(true)
  }

  const openEditFoodModal = (food: MealPlanFood) => {
    setSelectedFood(food)
    setFoodName(food.food_name)
    setServingSize(food.serving_size || '')
    setQuantity(food.quantity || '')
    setCalories(food.calories || '')
    setProteinG(food.protein_g || '')
    setCarbsG(food.carbs_g || '')
    setFatsG(food.fats_g || '')
    setIsHalal(food.is_halal)
    setFoodNotes(food.notes || '')
    setShowEditFoodModal(true)
  }

  const getMealTypeInfo = (type: string) => {
    const mealType = MEAL_TYPES.find(mt => mt.value === type)
    return mealType || { emoji: '🍴', label: type }
  }

  const calculateMealTotals = (foods: MealPlanFood[]) => {
    return foods.reduce((acc, food) => ({
      calories: acc.calories + (food.calories || 0),
      protein: acc.protein + (food.protein_g || 0),
      carbs: acc.carbs + (food.carbs_g || 0),
      fats: acc.fats + (food.fats_g || 0)
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 })
  }

  const calculateDayTotals = (meals: MealPlanMeal[]) => {
    return meals.reduce((acc, meal) => {
      const mealTotals = calculateMealTotals(meal.foods)
      return {
        calories: acc.calories + mealTotals.calories,
        protein: acc.protein + mealTotals.protein,
        carbs: acc.carbs + mealTotals.carbs,
        fats: acc.fats + mealTotals.fats
      }
    }, { calories: 0, protein: 0, carbs: 0, fats: 0 })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!mealPlan) {
    return null
  }

  const availableMealTypes = mealPlan.ramadan_mode
    ? MEAL_TYPES
    : MEAL_TYPES.filter(mt => !mt.ramadan)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Back Button */}
        <button
          onClick={() => navigate('/meal-plans-new')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Meal Plans
        </button>

        <div className="max-w-5xl mx-auto">
          {/* Main Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-6 text-white">
              <div className="flex items-start justify-between mb-2">
                <h1 className="text-2xl md:text-3xl font-bold">{mealPlan.name}</h1>
                {mealPlan.ramadan_mode && (
                  <span className="text-3xl">🌙</span>
                )}
              </div>
              {mealPlan.description && (
                <p className="text-white/90 mb-3">{mealPlan.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-3">
                {mealPlan.calories_target && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                    🔥 {mealPlan.calories_target} cal/day
                  </span>
                )}
                {mealPlan.protein_target_g && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                    💪 {mealPlan.protein_target_g}g protein
                  </span>
                )}
                {mealPlan.carbs_target_g && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                    🍞 {mealPlan.carbs_target_g}g carbs
                  </span>
                )}
                {mealPlan.fats_target_g && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                    🥑 {mealPlan.fats_target_g}g fats
                  </span>
                )}
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

          {/* Daily Breakdown Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">📅 Daily Breakdown</h2>
              {isCoach && coachInfo?.user_id === currentUserId && (
                <button
                  onClick={openAddDayModal}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Day
                </button>
              )}
            </div>

            <div className="p-6">
              {mealPlanDays.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">📋</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Days Added Yet</h3>
                  <p className="text-gray-600">
                    {isCoach && coachInfo?.user_id === currentUserId
                      ? 'Start building your meal plan by adding days.'
                      : 'Your coach is still building this meal plan.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {mealPlanDays.map((day) => {
                    const dayTotals = calculateDayTotals(day.meals)
                    const isExpanded = expandedDayId === day.id
                    const hasMultipleDays = mealPlanDays.length > 1

                    return (
                      <div key={day.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* Day Header */}
                        <div
                          className={`bg-gray-50 px-4 py-3 ${!isExpanded && hasMultipleDays ? 'cursor-pointer hover:bg-gray-100' : ''} ${isExpanded || !hasMultipleDays ? 'border-b border-gray-200' : ''}`}
                          onClick={() => hasMultipleDays && setExpandedDayId(isExpanded ? null : day.id)}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex items-center gap-3 flex-1">
                              {hasMultipleDays && (
                                <svg
                                  className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              )}
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-900">
                                  Day {day.day_number}
                                  {day.day_name && ` - ${day.day_name}`}
                                </h3>
                                {day.meals.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 mt-1">
                                    <span>🔥 {dayTotals.calories} cal</span>
                                    <span>💪 {dayTotals.protein.toFixed(1)}g</span>
                                    <span>🍞 {dayTotals.carbs.toFixed(1)}g</span>
                                    <span>🥑 {dayTotals.fats.toFixed(1)}g</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            {isCoach && coachInfo?.user_id === currentUserId && (
                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => openAddMealModal(day)}
                                  className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                                >
                                  Add Meal
                                </button>
                                <button
                                  onClick={() => handleDeleteDay(day.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>
                          {day.notes && (
                            <p className="text-sm text-gray-600 mt-2">📝 {day.notes}</p>
                          )}
                        </div>

                        {/* Meals */}
                        {(isExpanded || !hasMultipleDays) && (
                          day.meals.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm">
                              No meals added yet
                            </div>
                          ) : (
                            <div className="divide-y divide-gray-200">
                              {day.meals.map((meal) => {
                                const mealTypeInfo = getMealTypeInfo(meal.meal_type)
                                const mealTotals = calculateMealTotals(meal.foods)

                                return (
                                  <div key={meal.id} className="p-4">
                                    {/* Meal Header */}
                                    <div className="flex items-start justify-between mb-3">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-xl">{mealTypeInfo.emoji}</span>
                                          <h4 className="font-semibold text-gray-900">
                                            {meal.meal_name || mealTypeInfo.label}
                                          </h4>
                                          {meal.meal_time && (
                                            <span className="text-sm text-gray-500">⏰ {meal.meal_time}</span>
                                          )}
                                        </div>
                                        {meal.description && (
                                          <p className="text-sm text-gray-600 mb-1">{meal.description}</p>
                                        )}
                                        {meal.total_calories && (
                                          <div className="flex items-center gap-2 text-sm text-gray-700 mb-1">
                                            <span className="font-medium">🔥 {meal.total_calories} cal</span>
                                          </div>
                                        )}
                                        {meal.foods.length > 0 && (
                                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                                            <span>🔥 {mealTotals.calories} cal (from ingredients)</span>
                                            <span>💪 {mealTotals.protein.toFixed(1)}g</span>
                                            <span>🍞 {mealTotals.carbs.toFixed(1)}g</span>
                                            <span>🥑 {mealTotals.fats.toFixed(1)}g</span>
                                          </div>
                                        )}
                                        {meal.notes && (
                                          <p className="text-sm text-gray-600 mt-1">💡 {meal.notes}</p>
                                        )}
                                      </div>
                                      {isCoach && coachInfo?.user_id === currentUserId && (
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => openAddFoodModal(meal)}
                                            className="px-3 py-1 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                                          >
                                            Add Food
                                          </button>
                                          <button
                                            onClick={() => openEditMealModal(meal)}
                                            className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                                            title="Edit meal"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                          </button>
                                          <button
                                            onClick={() => handleDeleteMeal(meal.id)}
                                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                            title="Delete meal"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                          </button>
                                        </div>
                                      )}
                                    </div>

                                    {/* Foods */}
                                    {meal.foods.length === 0 ? (
                                      <p className="text-sm text-gray-500 italic ml-7">No foods added</p>
                                    ) : (
                                      <div className="space-y-2 ml-7">
                                        {meal.foods.map((food, idx) => (
                                          <div key={food.id} className="bg-gray-50 rounded-lg p-3">
                                            <div className="flex items-start justify-between">
                                              <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                  <span className="font-medium text-gray-900">
                                                    {idx + 1}. {food.food_name}
                                                  </span>
                                                  {food.is_halal && <span className="text-sm">✅</span>}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                                                  {food.quantity && food.serving_size && (
                                                    <span>📏 {food.quantity} {food.serving_size}</span>
                                                  )}
                                                  {food.calories && <span>🔥 {food.calories} cal</span>}
                                                  {food.protein_g && <span>💪 {food.protein_g}g P</span>}
                                                  {food.carbs_g && <span>🍞 {food.carbs_g}g C</span>}
                                                  {food.fats_g && <span>🥑 {food.fats_g}g F</span>}
                                                </div>
                                                {food.notes && (
                                                  <p className="text-xs text-gray-600 mt-1">📝 {food.notes}</p>
                                                )}
                                              </div>
                                              {isCoach && coachInfo?.user_id === currentUserId && (
                                                <div className="flex items-center gap-1 ml-2">
                                                  <button
                                                    onClick={() => openEditFoodModal(food)}
                                                    className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                                                    title="Edit ingredient"
                                                  >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                  </button>
                                                  <button
                                                    onClick={() => handleDeleteFood(food.id)}
                                                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Delete ingredient"
                                                  >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )
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

      {/* Add Day Modal */}
      {showDayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDayModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">➕ Add Day</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Day Number
                  </label>
                  <input
                    type="number"
                    value={dayNumber}
                    onChange={(e) => setDayNumber(parseInt(e.target.value) || 1)}
                    min={1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                    placeholder="e.g., Monday, High Protein Day"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={dayNotes}
                    onChange={(e) => setDayNotes(e.target.value)}
                    placeholder="Any special notes for this day..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
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

      {/* Add Meal Modal */}
      {showMealModal && selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowMealModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                ➕ Add Meal to Day {selectedDay.day_number}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meal Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {availableMealTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setMealType(type.value)}
                        className={`py-2 px-3 rounded-lg border-2 font-medium transition-all text-sm ${
                          mealType === type.value
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                      >
                        {type.emoji} {type.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meal Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={mealName}
                    onChange={(e) => setMealName(e.target.value)}
                    placeholder="e.g., Protein Shake"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={mealDescription}
                    onChange={(e) => setMealDescription(e.target.value)}
                    placeholder="Brief description of the meal..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    🔥 Total Calories (Optional)
                  </label>
                  <input
                    type="number"
                    value={mealTotalCalories}
                    onChange={(e) => setMealTotalCalories(e.target.value ? parseInt(e.target.value) : '')}
                    placeholder="e.g., 500"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time (Optional)
                  </label>
                  <input
                    type="text"
                    value={mealTime}
                    onChange={(e) => setMealTime(e.target.value)}
                    placeholder="e.g., 8:00 AM"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={mealNotes}
                    onChange={(e) => setMealNotes(e.target.value)}
                    placeholder="Any special instructions..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowMealModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddMeal}
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Adding...' : 'Add Meal'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Food Modal */}
      {showFoodModal && selectedMeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowFoodModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">➕ Add Food</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Food Name
                  </label>
                  <input
                    type="text"
                    value={foodName}
                    onChange={(e) => setFoodName(e.target.value)}
                    placeholder="e.g., Grilled Chicken Breast"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value ? parseFloat(e.target.value) : '')}
                      placeholder="1"
                      min="0"
                      step="0.1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Serving Size
                    </label>
                    <input
                      type="text"
                      value={servingSize}
                      onChange={(e) => setServingSize(e.target.value)}
                      placeholder="cup, oz, g"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    🔥 Calories
                  </label>
                  <input
                    type="number"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value ? parseInt(e.target.value) : '')}
                    placeholder="0"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      💪 Protein (g)
                    </label>
                    <input
                      type="number"
                      value={proteinG}
                      onChange={(e) => setProteinG(e.target.value ? parseFloat(e.target.value) : '')}
                      placeholder="0"
                      min="0"
                      step="0.1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      🍞 Carbs (g)
                    </label>
                    <input
                      type="number"
                      value={carbsG}
                      onChange={(e) => setCarbsG(e.target.value ? parseFloat(e.target.value) : '')}
                      placeholder="0"
                      min="0"
                      step="0.1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      🥑 Fats (g)
                    </label>
                    <input
                      type="number"
                      value={fatsG}
                      onChange={(e) => setFatsG(e.target.value ? parseFloat(e.target.value) : '')}
                      placeholder="0"
                      min="0"
                      step="0.1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isHalal}
                      onChange={(e) => setIsHalal(e.target.checked)}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      ✅ Halal Certified
                    </span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={foodNotes}
                    onChange={(e) => setFoodNotes(e.target.value)}
                    placeholder="Any preparation notes..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowFoodModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddFood}
                    disabled={saving || !foodName}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Adding...' : 'Add Food'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Meal Modal */}
      {showEditMealModal && selectedMeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowEditMealModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">✏️ Edit Meal</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meal Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={mealName}
                    onChange={(e) => setMealName(e.target.value)}
                    placeholder="e.g., Protein Shake"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={mealDescription}
                    onChange={(e) => setMealDescription(e.target.value)}
                    placeholder="Brief description of the meal..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    🔥 Total Calories (Optional)
                  </label>
                  <input
                    type="number"
                    value={mealTotalCalories}
                    onChange={(e) => setMealTotalCalories(e.target.value ? parseInt(e.target.value) : '')}
                    placeholder="e.g., 500"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time (Optional)
                  </label>
                  <input
                    type="text"
                    value={mealTime}
                    onChange={(e) => setMealTime(e.target.value)}
                    placeholder="e.g., 8:00 AM"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={mealNotes}
                    onChange={(e) => setMealNotes(e.target.value)}
                    placeholder="Any special instructions..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowEditMealModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEditMeal}
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Food Modal */}
      {showEditFoodModal && selectedFood && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowEditFoodModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">✏️ Edit Ingredient</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Food Name
                  </label>
                  <input
                    type="text"
                    value={foodName}
                    onChange={(e) => setFoodName(e.target.value)}
                    placeholder="e.g., Grilled Chicken Breast"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value ? parseFloat(e.target.value) : '')}
                      placeholder="1"
                      min="0"
                      step="0.1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Serving Size
                    </label>
                    <input
                      type="text"
                      value={servingSize}
                      onChange={(e) => setServingSize(e.target.value)}
                      placeholder="cup, oz, g"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    🔥 Calories
                  </label>
                  <input
                    type="number"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value ? parseInt(e.target.value) : '')}
                    placeholder="0"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      💪 Protein (g)
                    </label>
                    <input
                      type="number"
                      value={proteinG}
                      onChange={(e) => setProteinG(e.target.value ? parseFloat(e.target.value) : '')}
                      placeholder="0"
                      min="0"
                      step="0.1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      🍞 Carbs (g)
                    </label>
                    <input
                      type="number"
                      value={carbsG}
                      onChange={(e) => setCarbsG(e.target.value ? parseFloat(e.target.value) : '')}
                      placeholder="0"
                      min="0"
                      step="0.1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      🥑 Fats (g)
                    </label>
                    <input
                      type="number"
                      value={fatsG}
                      onChange={(e) => setFatsG(e.target.value ? parseFloat(e.target.value) : '')}
                      placeholder="0"
                      min="0"
                      step="0.1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isHalal}
                      onChange={(e) => setIsHalal(e.target.checked)}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      ✅ Halal Certified
                    </span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={foodNotes}
                    onChange={(e) => setFoodNotes(e.target.value)}
                    placeholder="Any preparation notes..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowEditFoodModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEditFood}
                    disabled={saving || !foodName}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
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

export default MealPlanDetail
