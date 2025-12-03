import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { User } from '@supabase/supabase-js'
import {
  LayoutDashboard,
  Users,
  Search,
  UtensilsCrossed,
  Dumbbell,
  TrendingUp,
  LogOut,
  Menu,
  X
} from 'lucide-react'

interface ClientProfile {
  full_name: string
  user_id: string
}

const Sidebar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [isCoach, setIsCoach] = useState(false)
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Check if user is a coach and get profile
  useEffect(() => {
    const checkUserRole = async () => {
      if (!user) {
        setIsCoach(false)
        setClientProfile(null)
        return
      }

      // Run both queries in parallel to reduce wait time
      const [coachResult, clientResult] = await Promise.all([
        supabase
          .from('coach_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('client_profiles')
          .select('full_name, user_id')
          .eq('user_id', user.id)
          .maybeSingle()
      ])

      const isCoachUser = !!coachResult.data
      setIsCoach(isCoachUser)

      // Set client profile only if not a coach
      if (!isCoachUser && clientResult.data) {
        setClientProfile(clientResult.data)
      } else {
        setClientProfile(null)
      }
    }

    checkUserRole()
  }, [user])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  // Don't show sidebar on login/signup pages
  if (location.pathname === '/login' || location.pathname === '/signup') {
    return null
  }

  // Don't show sidebar if user is not logged in
  if (!user) {
    return null
  }

  const menuItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard
    },
    {
      path: '/coaches',
      label: 'Coaches',
      icon: Users,
      clientOnly: true
    },
    {
      path: '/browse-coaches',
      label: 'Browse Coaches',
      icon: Search,
      clientOnly: true
    },
    {
      path: '/meal-plans-new',
      label: 'Meal Plans',
      icon: UtensilsCrossed
    },
    {
      path: '/workout-plans',
      label: 'Workout Plans',
      icon: Dumbbell
    },
    {
      path: '/progress',
      label: 'Progress',
      icon: TrendingUp
    },
  ]

  const visibleMenuItems = menuItems.filter(item => {
    if (item.clientOnly && isCoach) {
      return false
    }
    return true
  })

  const getInitials = (name: string) => {
    if (!name) return '?'
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0][0].toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const isActivePath = (path: string) => {
    return location.pathname === path
  }

  const SidebarContent = () => (
    <>
      {/* Logo/Brand */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-600 rounded-2xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">H</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">HalalGains</h1>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 space-y-1">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon
          const isActive = isActivePath(item.path)

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Profile Section */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-700 font-semibold">
            {getInitials(clientProfile?.full_name || 'User')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {clientProfile?.full_name || 'User'}
            </p>
            <p className="text-xs text-gray-500">
              {isCoach ? 'Coach' : 'Client'}
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold">H</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900">HalalGains</h1>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 bg-white border-r border-gray-200 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  )
}

export default Sidebar
