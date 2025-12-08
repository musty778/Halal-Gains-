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
  MessageSquare,
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
      path: '/chat',
      label: 'Messages',
      icon: MessageSquare
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
      <div className="p-6 border-b border-gray-200/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">H</span>
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-900 bg-clip-text text-transparent">HalalGains</h1>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon
          const isActive = isActivePath(item.path)

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-md'
                  : 'text-gray-600 hover:bg-white/80 hover:shadow-sm hover:text-gray-900'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? '' : 'group-hover:scale-110'}`} />
              <span className="font-semibold">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Profile Section */}
      <div className="p-4 border-t border-gray-200/50 bg-gradient-to-t from-gray-50/50 to-transparent">
        <div className="flex items-center gap-3 mb-3 p-2 rounded-xl bg-white/60 shadow-sm">
          <div className="w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center text-gray-700 font-bold shadow-sm">
            {getInitials(clientProfile?.full_name || 'User')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">
              {clientProfile?.full_name || 'User'}
            </p>
            <p className="text-xs font-medium text-gray-500">
              {isCoach ? 'Coach' : 'Client'}
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-4 py-2.5 text-gray-600 hover:bg-white/80 hover:text-red-600 rounded-xl transition-all duration-200 hover:shadow-sm font-semibold group"
        >
          <LogOut className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
          <span className="text-sm">Sign Out</span>
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200/50 backdrop-blur-sm z-40 flex items-center justify-between px-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 rounded-xl flex items-center justify-center shadow-md">
            <span className="text-white font-bold">H</span>
          </div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-gray-800 to-gray-900 bg-clip-text text-transparent">HalalGains</h1>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-gray-600 hover:bg-white/80 hover:shadow-sm rounded-xl transition-all duration-200"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 bg-gradient-to-b from-gray-50 via-gray-50/50 to-white border-r border-gray-200/50 shadow-sm z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-gradient-to-b from-gray-50 via-gray-50/50 to-white flex flex-col shadow-xl">
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  )
}

export default Sidebar
