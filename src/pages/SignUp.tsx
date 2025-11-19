import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { Gender, FitnessGoal, FitnessLevel, UserType, CoachSpecialisation, TrainingAvailabilityType } from '../types'

type FastingHabit = 'ramadan_only' | 'mondays_thursdays' | 'both' | 'none'
type WorkoutPrayerPreference = 'between_prayers' | 'no_preference'
type DietaryRestriction = 'none' | 'vegetarian' | 'vegan' | 'allergies'
type CoachGenderPreference = 'same_gender_only' | 'no_preference'

interface FormData {
  // Account
  email: string
  password: string
  userType: UserType
  // Personal
  full_name: string
  age: number
  gender: Gender
  location: string
  // Client - Fitness Goals
  fitness_goal: FitnessGoal
  fitness_level: FitnessLevel
  // Client - Fitness Assessment
  current_weight: number
  target_weight: number
  height: number
  injuries_limitations: string
  medical_conditions: string
  post_pregnancy: boolean
  // Client - Islamic Lifestyle
  fasting_habit: FastingHabit
  workout_prayer_preference: WorkoutPrayerPreference
  dietary_restriction: DietaryRestriction
  coach_gender_preference: CoachGenderPreference
  allergies: string[]
  // Coach specific
  profile_photos: File[]
  certifications: File[]
  years_of_experience: number
  specialisations: CoachSpecialisation[]
  bio: string
  training_philosophy: string
  success_stories: string
  hourly_rate: number
  package_price: number
  availability_type: TrainingAvailabilityType
  languages_spoken: string[]
  weekly_availability: { [key: number]: { start: string; end: string; enabled: boolean } }
}

// Language options with flags - Common languages shown first
const COMMON_LANGUAGES: { code: string; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'ur', name: 'Urdu', flag: '🇵🇰' },
  { code: 'bn', name: 'Bengali', flag: '🇧🇩' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'id', name: 'Indonesian', flag: '🇮🇩' },
  { code: 'ms', name: 'Malay', flag: '🇲🇾' },
  { code: 'so', name: 'Somali', flag: '🇸🇴' },
  { code: 'sw', name: 'Swahili', flag: '🇰🇪' },
]

// Extended language list
const MORE_LANGUAGES: { code: string; name: string; flag: string }[] = [
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'fa', name: 'Persian', flag: '🇮🇷' },
  { code: 'ps', name: 'Pashto', flag: '🇦🇫' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'th', name: 'Thai', flag: '🇹🇭' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
  { code: 'tl', name: 'Tagalog', flag: '🇵🇭' },
  { code: 'ta', name: 'Tamil', flag: '🇱🇰' },
  { code: 'te', name: 'Telugu', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi', flag: '🇮🇳' },
  { code: 'ha', name: 'Hausa', flag: '🇳🇬' },
  { code: 'yo', name: 'Yoruba', flag: '🇳🇬' },
  { code: 'am', name: 'Amharic', flag: '🇪🇹' },
  { code: 'ro', name: 'Romanian', flag: '🇷🇴' },
  { code: 'uk', name: 'Ukrainian', flag: '🇺🇦' },
  { code: 'el', name: 'Greek', flag: '🇬🇷' },
  { code: 'he', name: 'Hebrew', flag: '🇮🇱' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'no', name: 'Norwegian', flag: '🇳🇴' },
  { code: 'da', name: 'Danish', flag: '🇩🇰' },
  { code: 'fi', name: 'Finnish', flag: '🇫🇮' },
]

// Combined for lookups
const ALL_LANGUAGES = [...COMMON_LANGUAGES, ...MORE_LANGUAGES]

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const SPECIALISATION_OPTIONS: { value: CoachSpecialisation; label: string }[] = [
  { value: 'weight_loss', label: 'Weight Loss' },
  { value: 'muscle_building', label: 'Muscle Building' },
  { value: 'women_fitness', label: 'Women Fitness' },
  { value: 'athletic_training', label: 'Athletic Training' },
  { value: 'senior_fitness', label: 'Senior Fitness' },
  { value: 'fasting_friendly_programs', label: 'Fasting Friendly Programs' },
  { value: 'halal_nutrition', label: 'Halal Nutrition' },
  { value: 'ramadan_fitness', label: 'Ramadan Fitness' },
]

const SignUp = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(1)
  const [useImperial, setUseImperial] = useState(false)

  // Conversion helpers
  const kgToLbs = (kg: number) => Math.round(kg * 2.20462 * 10) / 10
  const lbsToKg = (lbs: number) => Math.round(lbs / 2.20462 * 10) / 10
  const feetToCm = (feet: number, inches: number) => Math.round((feet * 12 + inches) * 2.54 * 10) / 10

  // State for imperial height (feet and inches)
  const [heightFeet, setHeightFeet] = useState(0)
  const [heightInches, setHeightInches] = useState(0)

  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    userType: 'client',
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
    // Coach specific
    profile_photos: [],
    certifications: [],
    years_of_experience: 0,
    specialisations: [],
    bio: '',
    training_philosophy: '',
    success_stories: '',
    hourly_rate: 0,
    package_price: 0,
    availability_type: 'both',
    languages_spoken: [],
    weekly_availability: {
      0: { start: '09:00', end: '17:00', enabled: false },
      1: { start: '09:00', end: '17:00', enabled: true },
      2: { start: '09:00', end: '17:00', enabled: true },
      3: { start: '09:00', end: '17:00', enabled: true },
      4: { start: '09:00', end: '17:00', enabled: true },
      5: { start: '09:00', end: '17:00', enabled: true },
      6: { start: '09:00', end: '17:00', enabled: false },
    },
  })

  // Toggle language selection
  const toggleLanguage = (langCode: string) => {
    setFormData(prev => ({
      ...prev,
      languages_spoken: prev.languages_spoken.includes(langCode)
        ? prev.languages_spoken.filter(l => l !== langCode)
        : [...prev.languages_spoken, langCode]
    }))
  }

  // Update availability for a day
  const updateDayAvailability = (day: number, field: 'start' | 'end' | 'enabled', value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      weekly_availability: {
        ...prev.weekly_availability,
        [day]: {
          ...prev.weekly_availability[day],
          [field]: value
        }
      }
    }))
  }

  const [allergyInput, setAllergyInput] = useState('')
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [uploadingCerts, setUploadingCerts] = useState(false)
  const [showMoreLanguages, setShowMoreLanguages] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const certInputRef = useRef<HTMLInputElement>(null)

  // Preview URLs for uploaded files
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([])
  const [certPreviewUrls, setCertPreviewUrls] = useState<string[]>([])

  // Handle file selection for profile photos
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Add to existing photos
    setFormData(prev => ({
      ...prev,
      profile_photos: [...prev.profile_photos, ...files]
    }))

    // Create preview URLs
    const newPreviewUrls = files.map(file => URL.createObjectURL(file))
    setPhotoPreviewUrls(prev => [...prev, ...newPreviewUrls])
  }

  // Handle file selection for certifications
  const handleCertSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Add to existing certifications
    setFormData(prev => ({
      ...prev,
      certifications: [...prev.certifications, ...files]
    }))

    // Create preview URLs
    const newPreviewUrls = files.map(file => URL.createObjectURL(file))
    setCertPreviewUrls(prev => [...prev, ...newPreviewUrls])
  }

  // Remove a photo
  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviewUrls[index])
    setFormData(prev => ({
      ...prev,
      profile_photos: prev.profile_photos.filter((_, i) => i !== index)
    }))
    setPhotoPreviewUrls(prev => prev.filter((_, i) => i !== index))
  }

  // Remove a certification
  const removeCert = (index: number) => {
    URL.revokeObjectURL(certPreviewUrls[index])
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index)
    }))
    setCertPreviewUrls(prev => prev.filter((_, i) => i !== index))
  }

  // Toggle specialisation selection
  const toggleSpecialisation = (spec: CoachSpecialisation) => {
    setFormData(prev => ({
      ...prev,
      specialisations: prev.specialisations.includes(spec)
        ? prev.specialisations.filter(s => s !== spec)
        : [...prev.specialisations, spec]
    }))
  }

  // Upload files to Supabase Storage
  const uploadFiles = async (userId: string, files: File[], folder: string): Promise<string[]> => {
    const urls: string[] = []

    for (const file of files) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}/${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('coach-files')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('coach-files')
        .getPublicUrl(fileName)

      urls.push(urlData.publicUrl)
    }

    return urls
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: ['age', 'current_weight', 'target_weight', 'height', 'years_of_experience', 'hourly_rate', 'package_price'].includes(name)
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
        if (formData.userType === 'client') {
          // Create client profile using database function
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
        } else {
          // Coach signup
          // Upload profile photos
          let photoUrls: string[] = []
          if (formData.profile_photos.length > 0) {
            setUploadingPhotos(true)
            photoUrls = await uploadFiles(authData.user.id, formData.profile_photos, 'photos')
            setUploadingPhotos(false)
          }

          // Upload certifications
          let certUrls: string[] = []
          if (formData.certifications.length > 0) {
            setUploadingCerts(true)
            certUrls = await uploadFiles(authData.user.id, formData.certifications, 'certifications')
            setUploadingCerts(false)
          }

          // Create coach profile using database function
          const { data: coachProfile, error: coachError } = await supabase.rpc('create_coach_profile', {
            p_user_id: authData.user.id,
            p_full_name: formData.full_name,
            p_age: formData.age || null,
            p_gender: formData.gender,
            p_location: formData.location || null,
            p_profile_photos: photoUrls,
            p_certifications: certUrls,
            p_years_of_experience: formData.years_of_experience || null,
            p_specialisations: formData.specialisations,
          })

          if (coachError) throw coachError

          // Update coach profile with additional fields
          const { error: updateError } = await supabase
            .from('coach_profiles')
            .update({
              bio: formData.bio || null,
              training_philosophy: formData.training_philosophy || null,
              success_stories: formData.success_stories || null,
              hourly_rate: formData.hourly_rate || null,
              package_price: formData.package_price || null,
              availability_type: formData.availability_type,
              languages_spoken: formData.languages_spoken,
            })
            .eq('id', coachProfile)

          if (updateError) throw updateError

          // Save weekly availability
          const availabilityEntries = Object.entries(formData.weekly_availability)
            .filter(([_, slot]) => slot.enabled)
            .map(([day, slot]) => ({
              coach_id: coachProfile,
              day_of_week: parseInt(day),
              start_time: slot.start,
              end_time: slot.end,
              is_available: true,
            }))

          if (availabilityEntries.length > 0) {
            const { error: availError } = await supabase
              .from('coach_availability')
              .insert(availabilityEntries)

            if (availError) throw availError
          }
        }

        navigate('/')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during sign up')
    } finally {
      setLoading(false)
      setUploadingPhotos(false)
      setUploadingCerts(false)
    }
  }

  // Calculate total steps based on user type
  const getTotalSteps = () => formData.userType === 'client' ? 6 : 10

  // Get step title based on user type and current step
  const getStepTitle = () => {
    if (step === 1) return 'Create your account'
    if (step === 2) return 'Choose your role'

    if (formData.userType === 'client') {
      switch (step) {
        case 3: return 'Tell us about yourself'
        case 4: return 'Your fitness journey'
        case 5: return 'Fitness assessment'
        case 6: return 'Islamic lifestyle'
        default: return ''
      }
    } else {
      switch (step) {
        case 3: return 'Tell us about yourself'
        case 4: return 'Profile photos'
        case 5: return 'Certifications & experience'
        case 6: return 'Your specialisations'
        case 7: return 'About you'
        case 8: return 'Pricing & training type'
        case 9: return 'Languages spoken'
        case 10: return 'Weekly availability'
        default: return ''
      }
    }
  }

  const nextStep = () => {
    if (step === 1 && (!formData.email || !formData.password)) {
      setError('Please fill in email and password')
      return
    }
    if (step === 3 && (!formData.full_name || !formData.age || !formData.location)) {
      setError('Please fill in all fields')
      return
    }

    // Client-specific validation
    if (formData.userType === 'client') {
      if (step === 5 && (!formData.current_weight || !formData.target_weight || !formData.height)) {
        setError('Please fill in weight and height')
        return
      }
    }

    // Coach-specific validation
    if (formData.userType === 'coach') {
      if (step === 6 && formData.specialisations.length === 0) {
        setError('Please select at least one specialisation')
        return
      }
      if (step === 9 && formData.languages_spoken.length === 0) {
        setError('Please select at least one language')
        return
      }
    }

    setError(null)
    setStep(prev => prev + 1)
  }

  // Check if we're on the last step
  const isLastStep = () => {
    if (formData.userType === 'client') return step === 6
    return step === 10
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
              {getStepTitle()}
            </p>
            {/* Progress indicator */}
            <div className="flex justify-center gap-2 mt-4">
              {Array.from({ length: getTotalSteps() }, (_, i) => i + 1).map((s) => (
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

            {/* Step 2: User Type Selection */}
            {step === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 text-center mb-4">
                  How would you like to use Halal Gains?
                </p>
                <div className="grid grid-cols-1 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, userType: 'client' }))}
                    className={`p-6 rounded-xl border-2 text-left transition-all ${
                      formData.userType === 'client'
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-3xl">🏋️</span>
                      <div>
                        <h3 className={`font-semibold text-lg ${
                          formData.userType === 'client' ? 'text-primary-700' : 'text-gray-900'
                        }`}>
                          I'm a Client
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Looking for a coach to help me achieve my fitness goals with halal-friendly guidance
                        </p>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, userType: 'coach' }))}
                    className={`p-6 rounded-xl border-2 text-left transition-all ${
                      formData.userType === 'coach'
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-3xl">🎯</span>
                      <div>
                        <h3 className={`font-semibold text-lg ${
                          formData.userType === 'coach' ? 'text-primary-700' : 'text-gray-900'
                        }`}>
                          I'm a Coach
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Ready to help clients achieve their fitness goals with Islamic principles
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Personal Information (for both client and coach) */}
            {step === 3 && (
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

            {/* Step 4: Fitness Goals (Client only) */}
            {step === 4 && formData.userType === 'client' && (
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

            {/* Step 5: Fitness Assessment (Client only) */}
            {step === 5 && formData.userType === 'client' && (
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

            {/* Step 6: Islamic Lifestyle (Client only) */}
            {step === 6 && formData.userType === 'client' && (
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

            {/* Step 4: Profile Photos (Coach only) */}
            {step === 4 && formData.userType === 'coach' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 text-center mb-4">
                  Add photos to showcase yourself to potential clients
                </p>

                {/* Hidden file input */}
                <input
                  type="file"
                  ref={photoInputRef}
                  onChange={handlePhotoSelect}
                  accept="image/*"
                  multiple
                  className="hidden"
                />

                {/* Upload area */}
                <div
                  onClick={() => photoInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-all"
                >
                  <div className="text-4xl mb-3">📸</div>
                  <p className="text-gray-700 font-medium">Click to upload photos</p>
                  <p className="text-sm text-gray-500 mt-1">JPG, PNG up to 5MB each</p>
                </div>

                {/* Photo previews */}
                {photoPreviewUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {photoPreviewUrls.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Profile ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs text-gray-500 text-center">
                  {photoPreviewUrls.length} photo{photoPreviewUrls.length !== 1 ? 's' : ''} selected
                </p>
              </div>
            )}

            {/* Step 5: Certifications & Experience (Coach only) */}
            {step === 5 && formData.userType === 'coach' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    📅 Years of Experience
                  </label>
                  <input
                    type="number"
                    name="years_of_experience"
                    value={formData.years_of_experience || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-base"
                    placeholder="5"
                    min={0}
                    max={50}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📜 Certifications
                  </label>
                  <p className="text-sm text-gray-600 mb-3">
                    Upload images of your certifications
                  </p>

                  {/* Hidden file input */}
                  <input
                    type="file"
                    ref={certInputRef}
                    onChange={handleCertSelect}
                    accept="image/*,.pdf"
                    multiple
                    className="hidden"
                  />

                  {/* Upload area */}
                  <div
                    onClick={() => certInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-all"
                  >
                    <div className="text-3xl mb-2">📄</div>
                    <p className="text-gray-700 font-medium text-sm">Click to upload certifications</p>
                    <p className="text-xs text-gray-500 mt-1">Images or PDFs</p>
                  </div>

                  {/* Certification previews */}
                  {certPreviewUrls.length > 0 && (
                    <div className="space-y-2 mt-4">
                      {formData.certifications.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">📄</span>
                            <span className="text-sm text-gray-700 truncate max-w-[200px]">{file.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeCert(index)}
                            className="text-red-500 hover:text-red-600 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 6: Specialisations (Coach only) */}
            {step === 6 && formData.userType === 'coach' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 text-center mb-4">
                  Select your areas of expertise (choose at least one)
                </p>

                <div className="grid grid-cols-1 gap-3">
                  {SPECIALISATION_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleSpecialisation(option.value)}
                      className={`py-3 px-4 rounded-lg border-2 font-medium transition-all text-left flex items-center gap-3 ${
                        formData.specialisations.includes(option.value)
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        formData.specialisations.includes(option.value)
                          ? 'border-primary-500 bg-primary-500'
                          : 'border-gray-300'
                      }`}>
                        {formData.specialisations.includes(option.value) && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </span>
                      {option.label}
                    </button>
                  ))}
                </div>

                <p className="text-xs text-gray-500 text-center mt-2">
                  {formData.specialisations.length} selected
                </p>
              </div>
            )}

            {/* Step 7: Bio & Training Philosophy (Coach only) */}
            {step === 7 && formData.userType === 'coach' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bio
                  </label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-base resize-none"
                    placeholder="Tell clients about yourself, your background, and what makes you unique..."
                    rows={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Training Philosophy
                  </label>
                  <textarea
                    name="training_philosophy"
                    value={formData.training_philosophy}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-base resize-none"
                    placeholder="Describe your approach to fitness and how you help clients achieve their goals..."
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Success Stories
                  </label>
                  <textarea
                    name="success_stories"
                    value={formData.success_stories}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-base resize-none"
                    placeholder="Share some client transformations or achievements..."
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Step 8: Pricing & Availability Type (Coach only) */}
            {step === 8 && formData.userType === 'coach' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hourly Rate ($)
                    </label>
                    <input
                      type="number"
                      name="hourly_rate"
                      value={formData.hourly_rate || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-base"
                      placeholder="50"
                      min={0}
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Package Price ($)
                    </label>
                    <input
                      type="number"
                      name="package_price"
                      value={formData.package_price || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-base"
                      placeholder="200"
                      min={0}
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Training Availability
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, availability_type: 'online_only' }))}
                      className={`py-3 px-4 rounded-lg border-2 font-medium transition-all text-left ${
                        formData.availability_type === 'online_only'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      💻 Online Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, availability_type: 'in_person' }))}
                      className={`py-3 px-4 rounded-lg border-2 font-medium transition-all text-left ${
                        formData.availability_type === 'in_person'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      🏋️ In-Person Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, availability_type: 'both' }))}
                      className={`py-3 px-4 rounded-lg border-2 font-medium transition-all text-left ${
                        formData.availability_type === 'both'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      🌐 Both Online & In-Person
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 9: Languages Spoken (Coach only) */}
            {step === 9 && formData.userType === 'coach' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 text-center mb-4">
                  Select the languages you can coach in
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {COMMON_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => toggleLanguage(lang.code)}
                      className={`py-3 px-3 rounded-lg border-2 font-medium transition-all text-left flex items-center gap-2 ${
                        formData.languages_spoken.includes(lang.code)
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      <span className="text-lg">{lang.flag}</span>
                      <span className="text-sm">{lang.name}</span>
                    </button>
                  ))}
                </div>

                {/* More Languages Button */}
                <button
                  type="button"
                  onClick={() => setShowMoreLanguages(true)}
                  className="w-full py-3 px-4 rounded-lg border-2 border-dashed border-gray-300 text-gray-600 hover:border-primary-400 hover:text-primary-600 transition-all flex items-center justify-center gap-2"
                >
                  <span>🌍</span>
                  <span className="font-medium">More Languages</span>
                </button>

                {formData.languages_spoken.length > 0 && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-2">Selected languages:</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.languages_spoken.map(code => {
                        const lang = ALL_LANGUAGES.find(l => l.code === code)
                        return lang ? (
                          <span key={code} className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">
                            {lang.flag} {lang.name}
                          </span>
                        ) : null
                      })}
                    </div>
                  </div>
                )}

                {/* More Languages Modal */}
                {showMoreLanguages && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden">
                      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">More Languages</h3>
                        <button
                          type="button"
                          onClick={() => setShowMoreLanguages(false)}
                          className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                        >
                          ×
                        </button>
                      </div>
                      <div className="p-4 overflow-y-auto max-h-[60vh]">
                        <div className="grid grid-cols-2 gap-2">
                          {MORE_LANGUAGES.map((lang) => (
                            <button
                              key={lang.code}
                              type="button"
                              onClick={() => toggleLanguage(lang.code)}
                              className={`py-3 px-3 rounded-lg border-2 font-medium transition-all text-left flex items-center gap-2 ${
                                formData.languages_spoken.includes(lang.code)
                                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
                              }`}
                            >
                              <span className="text-lg">{lang.flag}</span>
                              <span className="text-sm">{lang.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="p-4 border-t border-gray-200">
                        <button
                          type="button"
                          onClick={() => setShowMoreLanguages(false)}
                          className="w-full py-3 px-4 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-all"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 10: Weekly Availability (Coach only) */}
            {step === 10 && formData.userType === 'coach' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 text-center mb-2">
                  Set your weekly availability
                </p>
                <p className="text-xs text-gray-500 text-center mb-4">
                  You can update this anytime from your profile
                </p>

                <div className="space-y-3">
                  {DAYS_OF_WEEK.map((day, index) => (
                    <div key={day} className={`p-3 rounded-lg border ${
                      formData.weekly_availability[index].enabled
                        ? 'border-primary-200 bg-primary-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.weekly_availability[index].enabled}
                            onChange={(e) => updateDayAvailability(index, 'enabled', e.target.checked)}
                            className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
                          />
                          <span className={`font-medium text-sm ${
                            formData.weekly_availability[index].enabled ? 'text-primary-700' : 'text-gray-500'
                          }`}>
                            {day}
                          </span>
                        </label>
                      </div>

                      {formData.weekly_availability[index].enabled && (
                        <div className="flex items-center gap-2 mt-2">
                          <input
                            type="time"
                            value={formData.weekly_availability[index].start}
                            onChange={(e) => updateDayAvailability(index, 'start', e.target.value)}
                            className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                          <span className="text-gray-500 text-sm">to</span>
                          <input
                            type="time"
                            value={formData.weekly_availability[index].end}
                            onChange={(e) => updateDayAvailability(index, 'end', e.target.value)}
                            className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="mt-6 space-y-3">
              {isLastStep() ? (
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
                      {uploadingPhotos ? 'Uploading photos...' : uploadingCerts ? 'Uploading certifications...' : 'Creating Account...'}
                    </span>
                  ) : (
                    formData.userType === 'coach' ? '🚀 Create Coach Account' : '🚀 Create Account'
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
