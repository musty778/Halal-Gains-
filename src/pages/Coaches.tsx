import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { CoachProfile, CoachSpecialisation } from '../types'

const SPECIALISATION_LABELS: Record<CoachSpecialisation, string> = {
  weight_loss: 'Weight Loss',
  muscle_building: 'Muscle Building',
  women_fitness: 'Women Fitness',
  athletic_training: 'Athletic Training',
  senior_fitness: 'Senior Fitness',
  fasting_friendly_programs: 'Fasting Friendly',
  halal_nutrition: 'Halal Nutrition',
  ramadan_fitness: 'Ramadan Fitness',
}

const Coaches = () => {
  const navigate = useNavigate()
  const [coach, setCoach] = useState<CoachProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAssignedCoach = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get current user
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          setError('Please log in to view your coach')
          setLoading(false)
          return
        }

        // Get client profile with coach_id
        const { data: clientProfile, error: clientError } = await supabase
          .from('client_profiles')
          .select('coach_id')
          .eq('user_id', user.id)
          .single()

        if (clientError) {
          console.error('Error fetching client profile:', clientError)
          setError('Could not load your profile')
          setLoading(false)
          return
        }

        if (!clientProfile?.coach_id) {
          setError(null)
          setLoading(false)
          return
        }

        // Fetch assigned coach details
        const { data: coachData, error: coachError } = await supabase
          .from('coach_profiles')
          .select('*')
          .eq('id', clientProfile.coach_id)
          .single()

        if (coachError) {
          console.error('Error fetching coach:', coachError)
          setError('Could not load coach details')
          setLoading(false)
          return
        }

        setCoach(coachData)
      } catch (err) {
        console.error('Unexpected error:', err)
        setError('An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchAssignedCoach()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      </div>
    )
  }

  if (!coach) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">👤</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Coach Assigned Yet</h2>
          <p className="text-gray-600 mb-6">
            Browse our coaches and find the perfect fit for your fitness goals
          </p>
          <button
            onClick={() => navigate('/browse-coaches')}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-all"
          >
            Browse Coaches
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent mb-2">
            My Coach
          </h1>
          <p className="text-gray-600 text-lg">Your assigned fitness coach</p>
        </div>

        {/* Coach Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden max-w-md mx-auto">
          {/* Gradient Header */}
          <div className="h-32 bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 relative">
            {/* Availability Badge */}
            {coach.availability_type && (
              <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm ${
                coach.availability_type === 'online_only'
                  ? 'bg-blue-100/90 text-blue-700'
                  : coach.availability_type === 'in_person'
                  ? 'bg-green-100/90 text-green-700'
                  : 'bg-purple-100/90 text-purple-700'
              }`}>
                {coach.availability_type === 'online_only' ? '💻 Online' :
                 coach.availability_type === 'in_person' ? '🏋️ In-Person' : '🌐 Both'}
              </span>
            )}
          </div>

          {/* Coach Info */}
          <div className="px-6 pb-6">
            {/* Profile Photo - Overlapping gradient */}
            <div className="flex justify-center -mt-16 mb-3">
              <div className="relative">
                {coach.profile_photos && coach.profile_photos.length > 0 ? (
                  <img
                    src={coach.profile_photos[0]}
                    alt={coach.full_name}
                    className="w-32 h-32 rounded-2xl object-cover border-4 border-white shadow-xl"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-2xl bg-gray-100 border-4 border-white shadow-xl flex items-center justify-center text-5xl text-gray-300">
                    👤
                  </div>
                )}
              </div>
            </div>

            {/* Coach Name */}
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
              {coach.full_name}
            </h2>

            {/* New Coach Badge or Status */}
            <div className="text-center mb-4">
              <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">
                New Coach
              </span>
            </div>

            {/* Specializations Pills */}
            {coach.specialisations && coach.specialisations.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center mb-4">
                {coach.specialisations.slice(0, 2).map((spec) => (
                  <span
                    key={spec}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium"
                  >
                    {SPECIALISATION_LABELS[spec] || spec}
                  </span>
                ))}
                {coach.specialisations.length > 2 && (
                  <span className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                    +{coach.specialisations.length - 2}
                  </span>
                )}
              </div>
            )}

            {/* Bio */}
            {coach.bio && (
              <p className="text-sm text-gray-600 text-center mb-6 leading-relaxed line-clamp-2">
                {coach.bio}
              </p>
            )}

            {/* Price */}
            <div className="mb-4">
              <p className="text-sm text-gray-500 text-center mb-1">Starting at</p>
              <div className="text-center">
                {coach.hourly_rate ? (
                  <span className="text-3xl font-bold text-gray-900">
                    ${coach.hourly_rate}<span className="text-base text-gray-500 font-normal">/hr</span>
                  </span>
                ) : (
                  <span className="text-base text-gray-500">Contact for pricing</span>
                )}
              </div>
            </div>

            {/* View Profile Button */}
            <button
              onClick={() => navigate(`/coach/${coach.id}`)}
              className="w-full py-3 px-4 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-all text-base shadow-md hover:shadow-lg"
            >
              View Profile
            </button>

            {/* Location & Experience */}
            {(coach.location || coach.years_of_experience) && (
              <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500">
                {coach.location && (
                  <span className="flex items-center gap-1">
                    <span>📍</span> {coach.location}
                  </span>
                )}
                {coach.years_of_experience && (
                  <span>
                    {coach.years_of_experience} yr{coach.years_of_experience !== 1 ? 's' : ''} exp
                  </span>
                )}
              </div>
            )}

            {/* Certifications */}
            {coach.certifications && coach.certifications.length > 0 && (
              <div className="mt-6 border-t border-gray-100 pt-6">
                <p className="text-sm font-semibold text-gray-700 mb-3 text-center">Certifications</p>
                <div className="grid grid-cols-2 gap-3">
                  {coach.certifications.map((cert, index) => {
                    // Check if cert is a URL (image)
                    const isUrl = cert.startsWith('http://') || cert.startsWith('https://')

                    if (isUrl) {
                      return (
                        <a
                          key={index}
                          href={cert}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative group overflow-hidden rounded-lg border-2 border-gray-200 hover:border-emerald-500 transition-all"
                        >
                          <img
                            src={cert}
                            alt={`Certification ${index + 1}`}
                            className="w-full h-32 object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity flex items-center justify-center">
                            <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">
                              View Full Size
                            </span>
                          </div>
                        </a>
                      )
                    } else {
                      return (
                        <span
                          key={index}
                          className="px-3 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm flex items-center gap-2"
                        >
                          <span>🏆</span>
                          <span className="truncate">{cert}</span>
                        </span>
                      )
                    }
                  })}
                </div>
              </div>
            )}

            {/* Training Philosophy */}
            {coach.training_philosophy && (
              <div className="mt-6 border-t border-gray-100 pt-6">
                <h3 className="font-semibold text-gray-900 mb-2 text-center">Training Philosophy</h3>
                <p className="text-gray-600 text-sm leading-relaxed text-center">{coach.training_philosophy}</p>
              </div>
            )}

            {/* Success Stories */}
            {coach.success_stories && (
              <div className="mt-6 border-t border-gray-100 pt-6">
                <h3 className="font-semibold text-gray-900 mb-2 text-center">Success Stories</h3>
                <p className="text-gray-600 text-sm leading-relaxed text-center">{coach.success_stories}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => navigate(`/chat?coach_id=${coach.id}`)}
                className="flex-1 py-2.5 px-4 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md text-sm"
              >
                💬 Message Coach
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/meal-plans')}
            className="p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-primary-500 transition-all text-left"
          >
            <div className="text-2xl mb-1">🥗</div>
            <div className="font-medium text-gray-900">Meal Plans</div>
            <div className="text-sm text-gray-500">View your nutrition plans</div>
          </button>
          <button
            onClick={() => navigate('/workout-plans')}
            className="p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-primary-500 transition-all text-left"
          >
            <div className="text-2xl mb-1">💪</div>
            <div className="font-medium text-gray-900">Workout Plans</div>
            <div className="text-sm text-gray-500">View your training plans</div>
          </button>
          <button
            onClick={() => navigate('/progress')}
            className="p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-primary-500 transition-all text-left"
          >
            <div className="text-2xl mb-1">📊</div>
            <div className="font-medium text-gray-900">Progress</div>
            <div className="text-sm text-gray-500">Track your journey</div>
          </button>
        </div>
      </div>
    </div>
  )
}

export default Coaches
