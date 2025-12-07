import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { User } from '@supabase/supabase-js'
import { useRamadan } from '../contexts/RamadanContext'

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isCoach, setIsCoach] = useState(false)
  const [coachProfileId, setCoachProfileId] = useState<string | null>(null)
  const navigate = useNavigate()
  const { ramadanMode } = useRamadan()

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

  // Check if user is a coach and get profile ID (combined to avoid duplicate queries)
  useEffect(() => {
    const checkUserProfile = async () => {
      if (!user) {
        setIsCoach(false)
        setCoachProfileId(null)
        return
      }

      const { data: coachProfile } = await supabase
        .from('coach_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      setIsCoach(!!coachProfile)
      setCoachProfileId(coachProfile?.id || null)
    }

    checkUserProfile()
  }, [user])

  // Fetch unread message count (memoized to use in subscriptions)
  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0)
      return
    }

    let conversationIds: string[] = []

    if (coachProfileId) {
      // User is a coach - get conversations where they are the coach
      const { data: convs } = await supabase
        .from('conversations')
        .select('id')
        .eq('coach_id', coachProfileId)

      conversationIds = convs?.map(c => c.id) || []
    } else {
      // User is a client - get conversations where they are the client
      const { data: convs } = await supabase
        .from('conversations')
        .select('id')
        .eq('client_id', user.id)

      conversationIds = convs?.map(c => c.id) || []
    }

    if (conversationIds.length === 0) {
      setUnreadCount(0)
      return
    }

    // Count unread messages
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', conversationIds)
      .eq('is_read', false)
      .neq('sender_id', user.id)

    setUnreadCount(count || 0)
  }, [user, coachProfileId])

  // Subscribe to messages and fetch initial count
  useEffect(() => {
    if (!user) return

    fetchUnreadCount()

    // Subscribe to new messages for real-time badge updates
    const channel = supabase
      .channel('navbar-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        () => {
          // Refetch count on any message change
          fetchUnreadCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, fetchUnreadCount])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  // Filter nav links based on user role
  const allNavLinks = [
    { path: '/', label: 'Home' },
    { path: '/coaches', label: 'Coaches', clientOnly: true },
    { path: '/browse-coaches', label: 'Browse Coaches', clientOnly: true },
    { path: '/meal-plans-new', label: 'Meal Plans' },
    { path: '/workout-plans', label: 'Workout Plans' },
    { path: '/progress', label: 'Progress' },
  ]

  const navLinks = allNavLinks.filter(link => {
    // If link is client-only and user is a coach, hide it
    if (link.clientOnly && isCoach) {
      return false
    }
    return true
  })

  return (
    <nav className={`text-white shadow-lg transition-colors duration-300 ${
      ramadanMode
        ? 'bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900'
        : 'bg-primary-600'
    }`}>
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link to="/" className={`text-2xl font-bold transition-colors ${
            ramadanMode ? 'text-yellow-400' : 'bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent'
          }`}>
            {ramadanMode && <span className="mr-2">🌙</span>}
            Halal Gains
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`transition-colors ${
                  ramadanMode
                    ? 'hover:text-yellow-400'
                    : 'hover:text-primary-200'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link
                  to="/chat"
                  className={`relative transition-colors ${
                    ramadanMode
                      ? 'hover:text-yellow-400'
                      : 'hover:text-primary-200'
                  }`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
                <button
                  onClick={handleSignOut}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    ramadanMode
                      ? 'bg-yellow-500 text-gray-900 hover:bg-yellow-600'
                      : 'bg-primary-700 hover:bg-primary-800'
                  }`}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className={`transition-colors ${
                    ramadanMode
                      ? 'hover:text-yellow-400'
                      : 'hover:text-primary-200'
                  }`}
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    ramadanMode
                      ? 'bg-yellow-500 text-gray-900 hover:bg-yellow-600'
                      : 'bg-white text-primary-600 hover:bg-primary-50'
                  }`}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="md:hidden focus:outline-none"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden pb-4">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`block py-2 transition-colors ${
                  ramadanMode
                    ? 'hover:text-yellow-400'
                    : 'hover:text-primary-200'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className={`mt-3 pt-3 ${
              ramadanMode
                ? 'border-t border-yellow-500/30'
                : 'border-t border-primary-500'
            }`}>
              {user ? (
                <>
                  <Link
                    to="/chat"
                    className={`flex items-center gap-2 py-2 transition-colors ${
                      ramadanMode
                        ? 'hover:text-yellow-400'
                        : 'hover:text-primary-200'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Messages
                    {unreadCount > 0 && (
                      <span className="ml-auto w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Link>
                  <button
                    onClick={() => {
                      handleSignOut()
                      setIsMenuOpen(false)
                    }}
                    className={`block w-full text-left py-2 transition-colors ${
                      ramadanMode
                        ? 'hover:text-yellow-400'
                        : 'hover:text-primary-200'
                    }`}
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className={`block py-2 transition-colors ${
                      ramadanMode
                        ? 'hover:text-yellow-400'
                        : 'hover:text-primary-200'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className={`block py-2 transition-colors ${
                      ramadanMode
                        ? 'hover:text-yellow-400'
                        : 'hover:text-primary-200'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navbar
