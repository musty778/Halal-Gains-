import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { CoachSpecialisation, Gender, TrainingAvailabilityType } from '../types'

interface CoachWithRating {
  id: string
  full_name: string
  gender: Gender | null
  location: string | null
  profile_photos: string[]
  specialisations: CoachSpecialisation[]
  hourly_rate: number | null
  availability_type: TrainingAvailabilityType | null
  bio: string | null
  years_of_experience: number | null
  average_rating: number | null
  review_count: number
}

interface Filters {
  search: string
  gender: Gender | ''
  location: string
  specialisation: CoachSpecialisation | ''
  minPrice: number
  maxPrice: number
  availabilityType: TrainingAvailabilityType | ''
  minRating: number
}

const SPECIALISATION_OPTIONS: { value: CoachSpecialisation; label: string }[] = [
  { value: 'weight_loss', label: 'Weight Loss' },
  { value: 'muscle_building', label: 'Muscle Building' },
  { value: 'women_fitness', label: 'Women Fitness' },
  { value: 'athletic_training', label: 'Athletic Training' },
  { value: 'senior_fitness', label: 'Senior Fitness' },
  { value: 'fasting_friendly_programs', label: 'Fasting Friendly' },
  { value: 'halal_nutrition', label: 'Halal Nutrition' },
  { value: 'ramadan_fitness', label: 'Ramadan Fitness' },
]

const BrowseCoaches = () => {
  const navigate = useNavigate()
  const [coaches, setCoaches] = useState<CoachWithRating[]>([])
  const [filteredCoaches, setFilteredCoaches] = useState<CoachWithRating[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    search: '',
    gender: '',
    location: '',
    specialisation: '',
    minPrice: 0,
    maxPrice: 500,
    availabilityType: '',
    minRating: 0,
  })

  // Fetch coaches with ratings
  useEffect(() => {
    const fetchCoaches = async () => {
      setLoading(true)
      try {
        // Fetch coaches
        const { data: coachData, error: coachError } = await supabase
          .from('coach_profiles')
          .select('*')

        if (coachError) throw coachError

        // Fetch ratings summary
        const { data: ratingsData, error: ratingsError } = await supabase
          .from('coach_ratings_summary')
          .select('*')

        if (ratingsError) {
          console.error('Ratings error:', ratingsError)
        }

        // Combine coach data with ratings
        const coachesWithRatings: CoachWithRating[] = (coachData || []).map(coach => {
          const rating = ratingsData?.find(r => r.coach_id === coach.id)
          return {
            ...coach,
            average_rating: rating?.average_rating || null,
            review_count: rating?.review_count || 0,
          }
        })

        setCoaches(coachesWithRatings)
        setFilteredCoaches(coachesWithRatings)
      } catch (error) {
        console.error('Error fetching coaches:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCoaches()
  }, [])

  // Apply filters
  useEffect(() => {
    let result = [...coaches]

    // Search by name
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      result = result.filter(coach =>
        coach.full_name.toLowerCase().includes(searchLower) ||
        coach.bio?.toLowerCase().includes(searchLower) ||
        coach.location?.toLowerCase().includes(searchLower)
      )
    }

    // Filter by gender
    if (filters.gender) {
      result = result.filter(coach => coach.gender === filters.gender)
    }

    // Filter by location
    if (filters.location) {
      const locationLower = filters.location.toLowerCase()
      result = result.filter(coach =>
        coach.location?.toLowerCase().includes(locationLower)
      )
    }

    // Filter by specialisation
    if (filters.specialisation) {
      result = result.filter(coach =>
        coach.specialisations.includes(filters.specialisation as CoachSpecialisation)
      )
    }

    // Filter by price range
    result = result.filter(coach => {
      if (!coach.hourly_rate) return true
      return coach.hourly_rate >= filters.minPrice && coach.hourly_rate <= filters.maxPrice
    })

    // Filter by availability type
    if (filters.availabilityType) {
      result = result.filter(coach => {
        if (filters.availabilityType === 'both') {
          return coach.availability_type === 'both'
        }
        return coach.availability_type === filters.availabilityType || coach.availability_type === 'both'
      })
    }

    // Filter by minimum rating
    if (filters.minRating > 0) {
      result = result.filter(coach =>
        coach.average_rating && coach.average_rating >= filters.minRating
      )
    }

    setFilteredCoaches(result)
  }, [filters, coaches])

  const clearFilters = () => {
    setFilters({
      search: '',
      gender: '',
      location: '',
      specialisation: '',
      minPrice: 0,
      maxPrice: 500,
      availabilityType: '',
      minRating: 0,
    })
  }

  const activeFiltersCount = [
    filters.gender,
    filters.location,
    filters.specialisation,
    filters.availabilityType,
    filters.minRating > 0,
    filters.minPrice > 0 || filters.maxPrice < 500,
  ].filter(Boolean).length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Find Your Coach</h1>
          <p className="text-gray-600">Discover coaches that match your fitness goals</p>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Search by name, location, or keywords..."
              className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-base"
            />
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Filter Toggle Button */}
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 font-medium transition-all ${
              showFilters || activeFiltersCount > 0
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
            {activeFiltersCount > 0 && (
              <span className="bg-primary-500 text-white text-xs px-2 py-0.5 rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear all
            </button>
          )}

          <span className="text-sm text-gray-500 ml-auto">
            {filteredCoaches.length} coach{filteredCoaches.length !== 1 ? 'es' : ''} found
          </span>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Gender Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select
                  value={filters.gender}
                  onChange={(e) => setFilters(prev => ({ ...prev, gender: e.target.value as Gender | '' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                >
                  <option value="">Any</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              {/* Location Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={filters.location}
                  onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="City or area..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                />
              </div>

              {/* Specialisation Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specialisation</label>
                <select
                  value={filters.specialisation}
                  onChange={(e) => setFilters(prev => ({ ...prev, specialisation: e.target.value as CoachSpecialisation | '' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                >
                  <option value="">Any</option>
                  {SPECIALISATION_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Availability Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Training Type</label>
                <select
                  value={filters.availabilityType}
                  onChange={(e) => setFilters(prev => ({ ...prev, availabilityType: e.target.value as TrainingAvailabilityType | '' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                >
                  <option value="">Any</option>
                  <option value="online_only">Online Only</option>
                  <option value="in_person">In-Person Only</option>
                  <option value="both">Both</option>
                </select>
              </div>

              {/* Price Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price Range (${filters.minPrice} - ${filters.maxPrice})
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={filters.minPrice}
                    onChange={(e) => setFilters(prev => ({ ...prev, minPrice: parseInt(e.target.value) || 0 }))}
                    placeholder="Min"
                    min={0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="number"
                    value={filters.maxPrice}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: parseInt(e.target.value) || 500 }))}
                    placeholder="Max"
                    min={0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {/* Rating Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Rating</label>
                <select
                  value={filters.minRating}
                  onChange={(e) => setFilters(prev => ({ ...prev, minRating: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                >
                  <option value={0}>Any rating</option>
                  <option value={3}>3+ stars</option>
                  <option value={4}>4+ stars</option>
                  <option value={5}>5 stars only</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
          </div>
        ) : filteredCoaches.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No coaches found</h3>
            <p className="text-gray-600 mb-4">Try adjusting your filters or search terms</p>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCoaches.map((coach) => (
              <div
                key={coach.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Coach Photo */}
                <div className="aspect-[4/3] bg-gray-100 relative">
                  {coach.profile_photos && coach.profile_photos.length > 0 ? (
                    <img
                      src={coach.profile_photos[0]}
                      alt={coach.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">
                      👤
                    </div>
                  )}
                  {/* Availability Badge */}
                  {coach.availability_type && (
                    <span className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium ${
                      coach.availability_type === 'online_only'
                        ? 'bg-blue-100 text-blue-700'
                        : coach.availability_type === 'in_person'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {coach.availability_type === 'online_only' ? '💻 Online' :
                       coach.availability_type === 'in_person' ? '🏋️ In-Person' : '🌐 Both'}
                    </span>
                  )}
                </div>

                {/* Coach Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{coach.full_name}</h3>
                      {coach.location && (
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <span>📍</span> {coach.location}
                        </p>
                      )}
                    </div>
                    {/* Rating */}
                    <div className="text-right">
                      {coach.average_rating ? (
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-400">⭐</span>
                          <span className="font-medium text-gray-900">{coach.average_rating}</span>
                          <span className="text-xs text-gray-500">({coach.review_count})</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">New</span>
                      )}
                    </div>
                  </div>

                  {/* Specialisations */}
                  {coach.specialisations && coach.specialisations.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {coach.specialisations.slice(0, 3).map((spec) => {
                        const label = SPECIALISATION_OPTIONS.find(o => o.value === spec)?.label || spec
                        return (
                          <span
                            key={spec}
                            className="px-2 py-0.5 bg-primary-50 text-primary-700 rounded-full text-xs"
                          >
                            {label}
                          </span>
                        )
                      })}
                      {coach.specialisations.length > 3 && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                          +{coach.specialisations.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Bio preview */}
                  {coach.bio && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{coach.bio}</p>
                  )}

                  {/* Price and Experience */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div>
                      {coach.hourly_rate ? (
                        <span className="font-semibold text-gray-900">${coach.hourly_rate}/hr</span>
                      ) : (
                        <span className="text-sm text-gray-500">Contact for pricing</span>
                      )}
                    </div>
                    {coach.years_of_experience && (
                      <span className="text-sm text-gray-500">
                        {coach.years_of_experience} yr{coach.years_of_experience !== 1 ? 's' : ''} exp
                      </span>
                    )}
                  </div>

                  {/* View Profile Button */}
                  <button
                    onClick={() => navigate(`/coach/${coach.id}`)}
                    className="w-full mt-3 py-2 px-4 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-all text-sm"
                  >
                    View Profile
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

export default BrowseCoaches
