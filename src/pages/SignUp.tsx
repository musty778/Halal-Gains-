import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { Gender, FitnessGoal, FitnessLevel } from '../types'

type FastingHabit = 'ramadan_only' | 'mondays_thursdays' | 'both' | 'none'
type WorkoutPrayerPreference = 'between_prayers' | 'no_preference'
type DietaryRestriction = 'none' | 'vegetarian' | 'vegan' | 'allergies'
type CoachGenderPreference = 'same_gender_only' | 'no_preference'

interface FormData {
  // Account
  email: string
  password: string
  // Personal
  full_name: string
  age: number
  gender: Gender
  location: string
  // Fitness Goals
  fitness_goal: FitnessGoal
  fitness_level: FitnessLevel
  // Fitness Assessment
  current_weight: number
  target_weight: number
  height: number
  injuries_limitations: string
  medical_conditions: string
  post_pregnancy: boolean
  // Islamic Lifestyle
  fasting_habit: FastingHabit
  workout_prayer_preference: WorkoutPrayerPreference
  dietary_restriction: DietaryRestriction
  coach_gender_preference: CoachGenderPreference
  allergies: string[]
}

const SignUp = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(1)
  const [useImperial, setUseImperial] = useState(false)

  // Conversion helpers
  const kgToLbs = (kg: number) => Math.round(kg * 2.20462 * 10) / 10
  const lbsToKg = (lbs: number) => Math.round(lbs / 2.20462 * 10) / 10
  const cmToFeet = (cm: number) => {
    const totalInches = cm / 2.54
    const feet = Math.floor(totalInches / 12)
    const inches = Math.round(totalInches % 12)
    return { feet, inches }
  }
  const feetToCm = (feet: number, inches: number) => Math.round((feet * 12 + inches) * 2.54 * 10) / 10

  // State for imperial height (feet and inches)
  const [heightFeet, setHeightFeet] = useState(0)
  const [heightInches, setHeightInches] = useState(0)

  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    full_name: '',
    age: 0,
    gender: 'male',
    location: '',
    fitness_goal: 'lose_weight',
    fitness_level: 'healthy',
    current_weight: 0,
    target_weight: 0,
    height: 0,
    injuries_limitations: '',
    medical_conditions: '',
    post_pregnancy: false,
    fasting_habit: 'ramadan_only',
    workout_prayer_preference: 'no_preference',
    dietary_restriction: 'none',
    coach_gender_preference: 'no_preference',
    allergies: [],
  })

  const [allergyInput, setAllergyInput] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: ['age', 'current_weight', 'target_weight', 'height'].includes(name)
        ? parseFloat(value) || 0
        : value
    }))
  }

  const handleGenderSelect = (gender: Gender) => {
    setFormData(prev => ({
      ...prev,
      gender,
      post_pregnancy: gender === 'male' ? false : prev.post_pregnancy
    }))
  }

  const handleFitnessLevelSelect = (level: FitnessLevel) => {
    setFormData(prev => ({
      ...prev,
      fitness_level: level
    }))
  }

  const handleFitnessGoalSelect = (goal: FitnessGoal) => {
    setFormData(prev => ({
      ...prev,
      fitness_goal: goal
    }))
  }

  const handleSignUp = async () => {
    setLoading(true)
    setError(null)

    try {
      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      })

      if (authError) throw authError

      if (authData.user) {
        // Create user profile using database function
        const { error: profileError } = await supabase.rpc('create_user_profile', {
          p_user_id: authData.user.id,
          p_full_name: formData.full_name,
          p_age: formData.age,
          p_gender: formData.gender,
          p_location: formData.location,
          p_fitness_goal: formData.fitness_goal,
          p_fitness_level: formData.fitness_level,
          p_post_pregnant_recovery: false,
        })

        if (profileError) throw profileError

        // Create fitness assessment using database function
        const { error: assessmentError } = await supabase.rpc('create_fitness_assessment', {
          p_user_id: authData.user.id,
          p_current_weight_kg: formData.current_weight,
          p_target_weight_kg: formData.target_weight,
          p_height_cm: formData.height,
          p_injuries_limitations: formData.injuries_limitations || null,
          p_medical_conditions: formData.medical_conditions || null,
          p_post_pregnancy: formData.post_pregnancy,
        })

        if (assessmentError) throw assessmentError

        // Create islamic lifestyle using database function
        const { error: lifestyleError } = await supabase.rpc('create_islamic_lifestyle', {
          p_user_id: authData.user.id,
          p_fasting_habit: formData.fasting_habit,
          p_workout_prayer_preference: formData.workout_prayer_preference,
          p_dietary_restriction: formData.dietary_restriction,
          p_coach_gender_preference: formData.coach_gender_preference,
        })

        if (lifestyleError) throw lifestyleError

        // Create allergies if any
        if (formData.allergies.length > 0) {
          for (const allergy of formData.allergies) {
            const { error: allergyError } = await supabase.rpc('create_user_allergy', {
              p_user_id: authData.user.id,
              p_allergy_name: allergy,
            })
            if (allergyError) throw allergyError
          }
        }

        navigate('/')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during sign up')
    } finally {
      setLoading(false)
    }
  }

  const nextStep = () => {
    if (step === 1 && (!formData.email || !formData.password)) {
      setError('Please fill in email and password')
      return
    }
    if (step === 2 && (!formData.full_name || !formData.age || !formData.location)) {
      setError('Please fill in all fields')
      return
    }
    if (step === 4 && (!formData.current_weight || !formData.target_weight || !formData.height)) {
      setError('Please fill in weight and height')
      return
    }
    setError(null)
    setStep(prev => prev + 1)
  }

  const prevStep = () => {
    setError(null)
    setStep(prev => prev - 1)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Join Halal Gains 💪
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              {step === 1 && 'Create your account 🔐'}
              {step === 2 && 'Tell us about yourself 📝'}
              {step === 3 && 'Your fitness journey 🏋️'}
              {step === 4 && 'Fitness assessment 📋'}
              {step === 5 && 'Islamic lifestyle 🕌'}
            </p>
            {/* Progress indicator */}
            <div className="flex justify-center gap-2 mt-4">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`h-2 w-5 rounded-full transition-colors ${
                    s <= step ? 'bg-primary-500' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={(e) => e.preventDefault()}>
            {/* Step 1: Account Details */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    📧 Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-base"
                    placeholder="your@email.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    🔑 Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-base"
                    placeholder="••••••••"
                    minLength={6}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                </div>
              </div>
            )}

            {/* Step 2: Personal Information */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    👤 Full Name
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-base"
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    🎂 Age
                  </label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-base"
                    placeholder="25"
                    min={13}
                    max={100}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ⚧️ Gender
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleGenderSelect('male')}
                      className={`py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                        formData.gender === 'male'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      👨 Male
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenderSelect('female')}
                      className={`py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                        formData.gender === 'female'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      👩 Female
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">For appropriate coach matching</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    📍 Location
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-base"
                    placeholder="City, Country"
                    required
                  />
                </div>
              </div>
            )}

            {/* Step 3: Fitness Goals */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🎯 Fitness Goal
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      type="button"
                      onClick={() => handleFitnessGoalSelect('lose_weight')}
                      className={`py-3 px-4 rounded-lg border-2 font-medium transition-all text-left ${
                        formData.fitness_goal === 'lose_weight'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      🔥 Lose Weight
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFitnessGoalSelect('build_muscle')}
                      className={`py-3 px-4 rounded-lg border-2 font-medium transition-all text-left ${
                        formData.fitness_goal === 'build_muscle'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      💪 Build Muscle
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📊 Fitness Level
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleFitnessLevelSelect('unfit')}
                      className={`py-3 px-2 rounded-lg border-2 font-medium transition-all text-sm ${
                        formData.fitness_level === 'unfit'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      😅 Unfit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFitnessLevelSelect('healthy')}
                      className={`py-3 px-2 rounded-lg border-2 font-medium transition-all text-sm ${
                        formData.fitness_level === 'healthy'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      😊 Healthy
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFitnessLevelSelect('athlete')}
                      className={`py-3 px-2 rounded-lg border-2 font-medium transition-all text-sm ${
                        formData.fitness_level === 'athlete'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      🏆 Athlete
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Fitness Assessment */}
            {step === 4 && (
              <div className="space-y-4">
                {/* Unit Toggle */}
                <div className="flex justify-center mb-2">
                  <div className="inline-flex rounded-lg border border-gray-200 p-1">
                    <button
                      type="button"
                      onClick={() => setUseImperial(false)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        !useImperial
                          ? 'bg-primary-500 text-white'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      Metric (kg/cm)
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseImperial(true)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        useImperial
                          ? 'bg-primary-500 text-white'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      Imperial (lbs/ft)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ⚖️ Current Weight
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={useImperial
                          ? (formData.current_weight ? kgToLbs(formData.current_weight) : '')
                          : (formData.current_weight || '')
                        }
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0
                          setFormData(prev => ({
                            ...prev,
                            current_weight: useImperial ? lbsToKg(value) : value
                          }))
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-base pr-12"
                        placeholder={useImperial ? "154" : "70"}
                        min={useImperial ? 44 : 20}
                        max={useImperial ? 660 : 300}
                        step="0.1"
                        required
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                        {useImperial ? 'lbs' : 'kg'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      🎯 Target Weight
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={useImperial
                          ? (formData.target_weight ? kgToLbs(formData.target_weight) : '')
                          : (formData.target_weight || '')
                        }
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0
                          setFormData(prev => ({
                            ...prev,
                            target_weight: useImperial ? lbsToKg(value) : value
                          }))
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-base pr-12"
                        placeholder={useImperial ? "143" : "65"}
                        min={useImperial ? 44 : 20}
                        max={useImperial ? 660 : 300}
                        step="0.1"
                        required
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                        {useImperial ? 'lbs' : 'kg'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    📏 Height
                  </label>
                  {useImperial ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <input
                          type="number"
                          value={heightFeet || ''}
                          onChange={(e) => {
                            const feet = parseInt(e.target.value) || 0
                            setHeightFeet(feet)
                            setFormData(prev => ({
                              ...prev,
                              height: feetToCm(feet, heightInches)
                            }))
                          }}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-base pr-10"
                          placeholder="5"
                          min={3}
                          max={8}
                          required
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">ft</span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          value={heightInches || ''}
                          onChange={(e) => {
                            const inches = parseInt(e.target.value) || 0
                            setHeightInches(inches)
                            setFormData(prev => ({
                              ...prev,
                              height: feetToCm(heightFeet, inches)
                            }))
                          }}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-base pr-10"
                          placeholder="7"
                          min={0}
                          max={11}
                          required
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">in</span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="number"
                        name="height"
                        value={formData.height || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-base pr-12"
                        placeholder="170"
                        min={100}
                        max={250}
                        step="0.1"
                        required
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">cm</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    🩹 Injuries or Limitations
                  </label>
                  <textarea
                    name="injuries_limitations"
                    value={formData.injuries_limitations}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-base resize-none"
                    placeholder="E.g., knee injury, back pain..."
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    🏥 Medical Conditions
                  </label>
                  <textarea
                    name="medical_conditions"
                    value={formData.medical_conditions}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-base resize-none"
                    placeholder="E.g., diabetes, asthma..."
                    rows={2}
                  />
                </div>

                {/* Post-pregnancy - only for women */}
                {formData.gender === 'female' && (
                  <div>
                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border-2 border-gray-200 hover:border-gray-300 transition-all">
                      <input
                        type="checkbox"
                        checked={formData.post_pregnancy}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          post_pregnancy: e.target.checked
                        }))}
                        className="w-5 h-5 text-primary-500 rounded focus:ring-primary-500"
                      />
                      <span className="text-gray-700 font-medium">
                        🤱 Post-pregnancy Recovery
                      </span>
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Islamic Lifestyle */}
            {step === 5 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🌙 Do you fast regularly?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, fasting_habit: 'ramadan_only' }))}
                      className={`py-3 px-3 rounded-lg border-2 font-medium transition-all text-sm ${
                        formData.fasting_habit === 'ramadan_only'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      Ramadan Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, fasting_habit: 'mondays_thursdays' }))}
                      className={`py-3 px-3 rounded-lg border-2 font-medium transition-all text-sm ${
                        formData.fasting_habit === 'mondays_thursdays'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      Mon & Thu
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, fasting_habit: 'both' }))}
                      className={`py-3 px-3 rounded-lg border-2 font-medium transition-all text-sm ${
                        formData.fasting_habit === 'both'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      Both
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, fasting_habit: 'none' }))}
                      className={`py-3 px-3 rounded-lg border-2 font-medium transition-all text-sm ${
                        formData.fasting_habit === 'none'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      None
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🕐 Workout preference with prayers?
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, workout_prayer_preference: 'between_prayers' }))}
                      className={`py-3 px-4 rounded-lg border-2 font-medium transition-all text-left ${
                        formData.workout_prayer_preference === 'between_prayers'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      🕌 Between prayers
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, workout_prayer_preference: 'no_preference' }))}
                      className={`py-3 px-4 rounded-lg border-2 font-medium transition-all text-left ${
                        formData.workout_prayer_preference === 'no_preference'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      🤷 Don't mind
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🥗 Dietary restrictions beyond halal?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, dietary_restriction: 'none', allergies: [] }))}
                      className={`py-3 px-3 rounded-lg border-2 font-medium transition-all text-sm ${
                        formData.dietary_restriction === 'none'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      None
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, dietary_restriction: 'vegetarian', allergies: [] }))}
                      className={`py-3 px-3 rounded-lg border-2 font-medium transition-all text-sm ${
                        formData.dietary_restriction === 'vegetarian'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      🥬 Vegetarian
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, dietary_restriction: 'vegan', allergies: [] }))}
                      className={`py-3 px-3 rounded-lg border-2 font-medium transition-all text-sm ${
                        formData.dietary_restriction === 'vegan'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      🌱 Vegan
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, dietary_restriction: 'allergies' }))}
                      className={`py-3 px-3 rounded-lg border-2 font-medium transition-all text-sm ${
                        formData.dietary_restriction === 'allergies'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      ⚠️ Allergies
                    </button>
                  </div>
                </div>

                {/* Allergies input - only shown when allergies is selected */}
                {formData.dietary_restriction === 'allergies' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      🚫 List your allergies
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={allergyInput}
                        onChange={(e) => setAllergyInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && allergyInput.trim()) {
                            e.preventDefault()
                            setFormData(prev => ({
                              ...prev,
                              allergies: [...prev.allergies, allergyInput.trim()]
                            }))
                            setAllergyInput('')
                          }
                        }}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-base"
                        placeholder="Type and press Enter"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (allergyInput.trim()) {
                            setFormData(prev => ({
                              ...prev,
                              allergies: [...prev.allergies, allergyInput.trim()]
                            }))
                            setAllergyInput('')
                          }
                        }}
                        className="px-4 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-all"
                      >
                        Add
                      </button>
                    </div>
                    {formData.allergies.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.allergies.map((allergy, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm"
                          >
                            {allergy}
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({
                                ...prev,
                                allergies: prev.allergies.filter((_, i) => i !== index)
                              }))}
                              className="hover:text-red-900"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    👥 Preferred coach gender?
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, coach_gender_preference: 'same_gender_only' }))}
                      className={`py-3 px-4 rounded-lg border-2 font-medium transition-all text-left ${
                        formData.coach_gender_preference === 'same_gender_only'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      ✅ Same gender only
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, coach_gender_preference: 'no_preference' }))}
                      className={`py-3 px-4 rounded-lg border-2 font-medium transition-all text-left ${
                        formData.coach_gender_preference === 'no_preference'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      🤝 No preference
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="mt-6 space-y-3">
              {step === 5 ? (
                <button
                  type="button"
                  onClick={handleSignUp}
                  disabled={loading}
                  className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-primary-700 focus:ring-4 focus:ring-primary-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating Account...
                    </span>
                  ) : (
                    '🚀 Create Account'
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={nextStep}
                  className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-primary-700 focus:ring-4 focus:ring-primary-200 transition-all"
                >
                  Continue ➡️
                </button>
              )}

              {step > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-200 transition-all"
                >
                  ⬅️ Back
                </button>
              )}
            </div>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-primary-600 hover:text-primary-700 font-semibold"
              >
                Sign In 🔓
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignUp
