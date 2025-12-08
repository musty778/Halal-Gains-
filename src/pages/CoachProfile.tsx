import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { CoachSpecialisation, Gender, TrainingAvailabilityType } from '../types'

interface CoachData {
  id: string
  full_name: string
  age: number | null
  gender: Gender | null
  location: string | null
  profile_photos: string[]
  certifications: string[]
  years_of_experience: number | null
  specialisations: CoachSpecialisation[]
  bio: string | null
  training_philosophy: string | null
  success_stories: string | null
  hourly_rate: number | null
  package_price: number | null
  availability_type: TrainingAvailabilityType | null
  languages_spoken: string[]
}

interface CoachAvailability {
  day_of_week: number
  start_time: string
  end_time: string
  is_available: boolean
}

interface CoachPackage {
  id: string
  name: string
  description: string | null
  price: number
  duration_weeks: number | null
  sessions_per_week: number | null
  features: string[]
  is_popular: boolean
}

interface CoachReview {
  id: string
  rating: number
  review_text: string | null
  created_at: string
  client_name?: string
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

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const LANGUAGE_FLAGS: { [key: string]: { name: string; flag: string } } = {
  en: { name: 'English', flag: '🇬🇧' },
  ar: { name: 'Arabic', flag: '🇸🇦' },
  ur: { name: 'Urdu', flag: '🇵🇰' },
  bn: { name: 'Bengali', flag: '🇧🇩' },
  tr: { name: 'Turkish', flag: '🇹🇷' },
  fr: { name: 'French', flag: '🇫🇷' },
  es: { name: 'Spanish', flag: '🇪🇸' },
  de: { name: 'German', flag: '🇩🇪' },
  id: { name: 'Indonesian', flag: '🇮🇩' },
  ms: { name: 'Malay', flag: '🇲🇾' },
  so: { name: 'Somali', flag: '🇸🇴' },
  sw: { name: 'Swahili', flag: '🇰🇪' },
  hi: { name: 'Hindi', flag: '🇮🇳' },
  fa: { name: 'Persian', flag: '🇮🇷' },
  zh: { name: 'Chinese', flag: '🇨🇳' },
  ja: { name: 'Japanese', flag: '🇯🇵' },
  ko: { name: 'Korean', flag: '🇰🇷' },
  pt: { name: 'Portuguese', flag: '🇵🇹' },
  it: { name: 'Italian', flag: '🇮🇹' },
  ru: { name: 'Russian', flag: '🇷🇺' },
}

const CoachProfile = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [coach, setCoach] = useState<CoachData | null>(null)
  const [availability, setAvailability] = useState<CoachAvailability[]>([])
  const [packages, setPackages] = useState<CoachPackage[]>([])
  const [reviews, setReviews] = useState<CoachReview[]>([])
  const [averageRating, setAverageRating] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPhoto, setSelectedPhoto] = useState(0)

  useEffect(() => {
    const fetchCoachData = async () => {
      if (!id) return

      setLoading(true)
      try {
        // Fetch coach profile
        const { data: coachData, error: coachError } = await supabase
          .from('coach_profiles')
          .select('*')
          .eq('id', id)
          .single()

        if (coachError) throw coachError
        setCoach(coachData)

        // Fetch availability
        const { data: availData, error: availError } = await supabase
          .from('coach_availability')
          .select('*')
          .eq('coach_id', id)
          .order('day_of_week')

        if (!availError) setAvailability(availData || [])

        // Fetch packages
        const { data: packagesData, error: packagesError } = await supabase
          .from('coach_packages')
          .select('*')
          .eq('coach_id', id)
          .order('price')

        if (!packagesError) setPackages(packagesData || [])

        // Fetch reviews
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('coach_reviews')
          .select('*')
          .eq('coach_id', id)
          .order('created_at', { ascending: false })

        if (!reviewsError) {
          setReviews(reviewsData || [])
          if (reviewsData && reviewsData.length > 0) {
            const avg = reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length
            setAverageRating(Math.round(avg * 10) / 10)
          }
        }
      } catch (error) {
        console.error('Error fetching coach data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCoachData()
  }, [id])

  // Removed blocking loading screen for faster page transitions

  if (!coach) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-cyan-50/20 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">😕</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Coach not found</h2>
          <button
            onClick={() => navigate('/browse-coaches')}
            className="text-primary-600 hover:text-primary-700"
          >
            Back to Browse
          </button>
        </div>
      </div>
    )
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-cyan-50/20">
      <div className="container mx-auto px-4 py-6">
        {/* Back Button */}
        <button
          onClick={() => navigate('/browse-coaches')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Search
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Photo Gallery */}
              <div className="aspect-[16/9] bg-gray-100 relative">
                {coach.profile_photos && coach.profile_photos.length > 0 ? (
                  <>
                    <img
                      src={coach.profile_photos[selectedPhoto]}
                      alt={coach.full_name}
                      className="w-full h-full object-cover"
                    />
                    {coach.profile_photos.length > 1 && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {coach.profile_photos.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedPhoto(idx)}
                            className={`w-2 h-2 rounded-full transition-all ${
                              idx === selectedPhoto ? 'bg-white' : 'bg-white/50'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400">
                    <svg className="w-32 h-32 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </div>
                )}
              </div>

              <div className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{coach.full_name}</h1>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
                      {coach.location && (
                        <span className="flex items-center gap-1">
                          <span>📍</span> {coach.location}
                        </span>
                      )}
                      {coach.years_of_experience && (
                        <span className="flex items-center gap-1">
                          <span>🏆</span> {coach.years_of_experience} years exp
                        </span>
                      )}
                      {coach.availability_type && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
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
                  </div>
                  {averageRating && (
                    <div className="flex items-center gap-2 bg-yellow-50 px-3 py-2 rounded-lg">
                      <span className="text-yellow-400 text-xl">⭐</span>
                      <div>
                        <span className="font-bold text-gray-900">{averageRating}</span>
                        <span className="text-sm text-gray-500 ml-1">({reviews.length} reviews)</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Specialisations */}
                {coach.specialisations && coach.specialisations.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {coach.specialisations.map((spec) => {
                      const label = SPECIALISATION_OPTIONS.find(o => o.value === spec)?.label || spec
                      return (
                        <span
                          key={spec}
                          className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm"
                        >
                          {label}
                        </span>
                      )
                    })}
                  </div>
                )}

                {/* Languages */}
                {coach.languages_spoken && coach.languages_spoken.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {coach.languages_spoken.map((lang) => {
                      const langData = LANGUAGE_FLAGS[lang]
                      return (
                        <span
                          key={lang}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-sm"
                        >
                          {langData?.flag} {langData?.name || lang}
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Bio & Philosophy */}
            {(coach.bio || coach.training_philosophy) && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                {coach.bio && (
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">About Me</h2>
                    <p className="text-gray-600 whitespace-pre-line">{coach.bio}</p>
                  </div>
                )}
                {coach.training_philosophy && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">Training Philosophy</h2>
                    <p className="text-gray-600 whitespace-pre-line">{coach.training_philosophy}</p>
                  </div>
                )}
              </div>
            )}

            {/* Certifications */}
            {coach.certifications && coach.certifications.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Certifications</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {coach.certifications.map((cert, idx) => (
                    <a
                      key={idx}
                      href={cert}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="aspect-square bg-gray-100 rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                    >
                      <img src={cert} alt={`Certification ${idx + 1}`} className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Success Stories / Testimonials */}
            {coach.success_stories && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Success Stories</h2>
                <p className="text-gray-600 whitespace-pre-line">{coach.success_stories}</p>
              </div>
            )}

            {/* Reviews */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Client Reviews {reviews.length > 0 && `(${reviews.length})`}
              </h2>
              {reviews.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No reviews yet</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              className={star <= review.rating ? 'text-yellow-400' : 'text-gray-200'}
                            >
                              ⭐
                            </span>
                          ))}
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {review.review_text && (
                        <p className="text-gray-600">{review.review_text}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Pricing & CTA */}
          <div className="space-y-6">
            {/* Sticky CTA */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:sticky lg:top-6">
              {/* Pricing */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Pricing</h3>
                {coach.hourly_rate && (
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-3xl font-bold text-gray-900">${coach.hourly_rate}</span>
                    <span className="text-gray-500">/hour</span>
                  </div>
                )}
                {coach.package_price && (
                  <p className="text-sm text-gray-600">
                    Package deals from <span className="font-semibold">${coach.package_price}</span>
                  </p>
                )}
              </div>

              {/* Packages */}
              {packages.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Available Packages</h4>
                  <div className="space-y-3">
                    {packages.map((pkg) => (
                      <div
                        key={pkg.id}
                        className={`p-3 rounded-lg border ${
                          pkg.is_popular
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <span className="font-medium text-gray-900">{pkg.name}</span>
                          {pkg.is_popular && (
                            <span className="text-xs bg-primary-500 text-white px-2 py-0.5 rounded-full">
                              Popular
                            </span>
                          )}
                        </div>
                        <p className="text-lg font-bold text-gray-900">${pkg.price}</p>
                        {pkg.description && (
                          <p className="text-sm text-gray-600 mt-1">{pkg.description}</p>
                        )}
                        {(pkg.duration_weeks || pkg.sessions_per_week) && (
                          <p className="text-xs text-gray-500 mt-1">
                            {pkg.duration_weeks && `${pkg.duration_weeks} weeks`}
                            {pkg.duration_weeks && pkg.sessions_per_week && ' • '}
                            {pkg.sessions_per_week && `${pkg.sessions_per_week}x/week`}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA Buttons */}
              <div className="space-y-3">
                <button className="w-full py-3 px-4 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-all">
                  Book Discovery Call
                </button>
                <button
                  onClick={() => navigate(`/chat?coach=${id}`)}
                  className="w-full py-3 px-4 bg-white border-2 border-primary-600 text-primary-600 rounded-lg font-semibold hover:bg-primary-50 transition-all"
                >
                  Message Coach
                </button>
              </div>
            </div>

            {/* Availability */}
            {availability.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Availability</h3>
                <div className="space-y-2">
                  {DAYS_OF_WEEK.map((day, idx) => {
                    const daySlots = availability.filter(a => a.day_of_week === idx && a.is_available)
                    return (
                      <div key={day} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <span className={`text-sm ${daySlots.length > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                          {day}
                        </span>
                        {daySlots.length > 0 ? (
                          <span className="text-sm text-gray-600">
                            {daySlots.map(slot =>
                              `${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`
                            ).join(', ')}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">Unavailable</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}

export default CoachProfile
