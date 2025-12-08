import { useNavigate } from 'react-router-dom'
import { Dumbbell, Heart, Moon, Sparkles } from 'lucide-react'

const LandingPage = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-emerald-50 to-teal-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-5xl mx-auto">
          {/* Main Content */}
          <div className="text-center mb-12">
            {/* Logo/Brand */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Dumbbell className="w-9 h-9 text-white" />
              </div>
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                Halal Gains
              </h1>
            </div>

            {/* Tagline */}
            <p className="text-2xl md:text-3xl text-gray-700 font-semibold mb-4">
              Your Islamic Fitness Journey Starts Here
            </p>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10">
              Connect with certified Muslim coaches, get personalized workout and meal plans that respect your faith and lifestyle
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <button
                onClick={() => navigate('/signup')}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300"
              >
                Get Started Free
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-8 py-4 bg-white/60 backdrop-blur-xl border-2 border-emerald-500 text-emerald-700 rounded-xl font-bold text-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                Sign In
              </button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Feature 1 */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-2xl opacity-0 group-hover:opacity-20 blur transition duration-300"></div>
              <div className="relative bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg mb-4">
                  <Dumbbell className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Faith-Based Training</h3>
                <p className="text-gray-600">
                  Workout plans designed around prayer times and fasting schedules
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-400 to-pink-400 rounded-2xl opacity-0 group-hover:opacity-20 blur transition duration-300"></div>
              <div className="relative bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-pink-500 rounded-xl flex items-center justify-center shadow-lg mb-4">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Halal Nutrition</h3>
                <p className="text-gray-600">
                  Personalized meal plans with 100% halal ingredients and options
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-400 to-pink-400 rounded-2xl opacity-0 group-hover:opacity-20 blur transition duration-300"></div>
              <div className="relative bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center shadow-lg mb-4">
                  <Moon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Ramadan Ready</h3>
                <p className="text-gray-600">
                  Special programs optimized for training during the holy month
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="mt-16 text-center">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/60 backdrop-blur-xl rounded-full border border-white/20 shadow-lg">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              <p className="text-gray-700 font-medium">
                Join thousands of Muslims on their fitness journey
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LandingPage
