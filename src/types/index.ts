// Core types for Halal Gains platform

export interface Coach {
  id: string
  name: string
  email: string
  bio: string
  specialties: string[]
  rating: number
  image_url?: string
  created_at: string
}

export interface Client {
  id: string
  name: string
  email: string
  coach_id?: string
  created_at: string
}

export interface MealPlan {
  id: string
  client_id: string
  coach_id: string
  name: string
  description: string
  meals: Meal[]
  created_at: string
}

export interface Meal {
  id: string
  name: string
  calories: number
  protein: number
  carbs: number
  fats: number
  is_halal: boolean
}

export interface WorkoutPlan {
  id: string
  client_id: string
  coach_id: string
  name: string
  description: string
  exercises: Exercise[]
  created_at: string
}

export interface Exercise {
  id: string
  name: string
  sets: number
  reps: number
  rest_seconds: number
  notes?: string
}

export interface Account {
  id: string
  email: string
  role: 'coach' | 'client'
  created_at: string
}

// Enum types matching database
export type Gender = 'male' | 'female'
export type FitnessGoal = 'lose_weight' | 'build_muscle'
export type FitnessLevel = 'unfit' | 'healthy' | 'athlete'
export type UserType = 'client' | 'coach'

// Coach specialisation types
export type CoachSpecialisation =
  | 'weight_loss'
  | 'muscle_building'
  | 'women_fitness'
  | 'athletic_training'
  | 'senior_fitness'
  | 'fasting_friendly_programs'
  | 'halal_nutrition'
  | 'ramadan_fitness'

export type TrainingAvailabilityType = 'online_only' | 'in_person' | 'both'

export interface CoachProfile {
  id: string
  user_id: string
  full_name: string
  age?: number
  gender?: Gender
  location?: string
  profile_photos: string[]
  certifications: string[]
  years_of_experience?: number
  specialisations: CoachSpecialisation[]
  bio?: string
  training_philosophy?: string
  success_stories?: string
  hourly_rate?: number
  package_price?: number
  availability_type?: TrainingAvailabilityType
  languages_spoken: string[]
  created_at: string
  updated_at: string
}

export interface CoachAvailability {
  id: string
  coach_id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_available: boolean
  created_at: string
  updated_at: string
}

export interface ClientProfile {
  id: string
  user_id: string
  full_name: string
  age: number
  location: string
  gender: Gender
  weight_kg?: number
  fitness_level: FitnessLevel
  fitness_goal: FitnessGoal
  post_pregnancy_recovery: boolean
  coach_id?: string
  created_at: string
  updated_at: string
}

export interface SignUpFormData {
  email: string
  password: string
  full_name: string
  age: number
  gender: Gender
  location: string
  fitness_goal: FitnessGoal
  fitness_level: FitnessLevel
  post_pregnancy_recovery: boolean
}
