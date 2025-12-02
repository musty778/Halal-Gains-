import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../services/supabase'

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  is_read: boolean
  created_at: string
}

interface Conversation {
  id: string
  client_id: string
  coach_id: string
  created_at: string
  updated_at: string
  other_user_name?: string
  other_user_photo?: string
  last_message?: string
  unread_count?: number
}

interface UserInfo {
  id: string
  name: string
  photo?: string
}

const Chat = () => {
  const { conversationId } = useParams<{ conversationId?: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<'client' | 'coach' | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(conversationId || null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [otherUser, setOtherUser] = useState<UserInfo | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [isClientAssigned, setIsClientAssigned] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [currentClientUserId, setCurrentClientUserId] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter conversations based on search query (memoized)
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations
    const query = searchQuery.toLowerCase()
    return conversations.filter(conv =>
      conv.other_user_name?.toLowerCase().includes(query) ||
      conv.last_message?.toLowerCase().includes(query)
    )
  }, [conversations, searchQuery])

  // Assign coach to client
  const handleStartWorkingTogether = async () => {
    if (!selectedConversation || !currentUserId || !currentClientUserId || assigning) return

    setAssigning(true)
    try {
      // Call the secure RPC function to assign coach
      const { data: result, error: rpcError } = await supabase
        .rpc('assign_coach_to_client', {
          p_coach_user_id: currentUserId,
          p_client_user_id: currentClientUserId
        })

      if (rpcError) {
        console.error('RPC Error:', rpcError)
        throw new Error(rpcError.message || 'Failed to call assignment function')
      }

      // Check the result from the function
      if (!result || !result.success) {
        throw new Error(result?.error || 'Assignment failed')
      }

      // Update state immediately to show "Your Client" badge
      setIsClientAssigned(true)
      // Force a refresh to ensure UI updates
      setRefreshTrigger(prev => prev + 1)

      alert('Success! You are now working with this client. They can now see you in their Coaches menu.')
    } catch (err: any) {
      console.error('Error assigning coach:', err)
      alert(`Failed to assign coach: ${err.message || 'Please try again.'}`)
      setIsClientAssigned(false) // Reset on error
    } finally {
      setAssigning(false)
    }
  }

  // Delete conversation handler (soft delete)
  const handleDeleteConversation = async () => {
    if (!selectedConversation || deleting || !currentUserId) return

    setDeleting(true)
    try {
      // Get the conversation to determine user's role
      const { data: conv } = await supabase
        .from('conversations')
        .select('client_id, coach_id')
        .eq('id', selectedConversation)
        .single()

      if (!conv) throw new Error('Conversation not found')

      // Check if current user is the coach in this conversation
      const { data: myCoachProfile } = await supabase
        .from('coach_profiles')
        .select('id')
        .eq('user_id', currentUserId)
        .single()

      const isCoachInConv = myCoachProfile && conv.coach_id === myCoachProfile.id

      // Soft delete by setting the appropriate flag
      const updateData = isCoachInConv
        ? { deleted_by_coach: true }
        : { deleted_by_client: true }

      const { error } = await supabase
        .from('conversations')
        .update(updateData)
        .eq('id', selectedConversation)

      if (error) throw error

      // Clear selection and refresh
      setSelectedConversation(null)
      setMessages([])
      setOtherUser(null)
      setShowDeleteConfirm(false)
      navigate('/chat')
      fetchConversations()
    } catch (err) {
      console.error('Error deleting conversation:', err)
    } finally {
      setDeleting(false)
    }
  }

  // Helper function to get user name from either client_profiles or coach_profiles
  const getUserName = async (userId: string): Promise<{ name: string; photo?: string }> => {
    // Try client_profiles first
    const { data: clientData } = await supabase
      .from('client_profiles')
      .select('full_name, profile_photo')
      .eq('user_id', userId)
      .single()

    if (clientData?.full_name) {
      return {
        name: clientData.full_name,
        photo: clientData.profile_photo
      }
    }

    // Try coach_profiles
    const { data: coachData } = await supabase
      .from('coach_profiles')
      .select('full_name, profile_photos')
      .eq('user_id', userId)
      .single()

    if (coachData?.full_name) {
      return {
        name: coachData.full_name,
        photo: coachData.profile_photos?.[0]
      }
    }

    return { name: 'Unknown User' }
  }

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Get current user and their role
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }
      setCurrentUserId(user.id)

      // Check if user is a coach or client
      const { data: coachData } = await supabase
        .from('coach_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (coachData) {
        setUserRole('coach')
      } else {
        setUserRole('client')
      }
    }

    getCurrentUser()
  }, [navigate])

  // Create conversation if coming from coach profile
  useEffect(() => {
    const createConversationIfNeeded = async () => {
      const coachId = searchParams.get('coach')
      if (!coachId || !currentUserId) return

      // Check if conversation already exists (including soft-deleted ones)
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id, deleted_by_client, deleted_by_coach')
        .eq('client_id', currentUserId)
        .eq('coach_id', coachId)
        .single()

      if (existingConv) {
        // Reactivate the conversation for both parties if it was soft-deleted
        const updates: Record<string, boolean> = {}
        if (existingConv.deleted_by_client) {
          updates.deleted_by_client = false
        }
        if (existingConv.deleted_by_coach) {
          updates.deleted_by_coach = false
        }

        if (Object.keys(updates).length > 0) {
          await supabase
            .from('conversations')
            .update(updates)
            .eq('id', existingConv.id)
        }

        setSelectedConversation(existingConv.id)
        navigate(`/chat/${existingConv.id}`, { replace: true })
      } else {
        // Create new conversation
        const { data: newConv, error } = await supabase
          .from('conversations')
          .insert({
            client_id: currentUserId,
            coach_id: coachId
          })
          .select('id')
          .single()

        if (!error && newConv) {
          setSelectedConversation(newConv.id)
          navigate(`/chat/${newConv.id}`, { replace: true })
        }
      }
    }

    if (currentUserId) {
      createConversationIfNeeded()
    }
  }, [currentUserId, searchParams, navigate])

  // Fetch conversations function (defined outside useEffect for reuse)
  const fetchConversations = useCallback(async () => {
    if (!currentUserId) return

      // Get user's coach profile ID if they have one
      const { data: coachProfile } = await supabase
        .from('coach_profiles')
        .select('id')
        .eq('user_id', currentUserId)
        .single()

      const coachProfileId = coachProfile?.id

      // Fetch all conversations where user is either coach or client
      let convData: any[] = []

      // Get conversations where user is the client (exclude soft-deleted by client)
      const { data: clientConvs } = await supabase
        .from('conversations')
        .select('*')
        .eq('client_id', currentUserId)
        .eq('deleted_by_client', false)
        .order('updated_at', { ascending: false })

      if (clientConvs) {
        convData = [...clientConvs]
      }

      // Get conversations where user is the coach (exclude soft-deleted by coach)
      if (coachProfileId) {
        const { data: coachConvs } = await supabase
          .from('conversations')
          .select('*')
          .eq('coach_id', coachProfileId)
          .eq('deleted_by_coach', false)
          .order('updated_at', { ascending: false })

        if (coachConvs) {
          // Merge and deduplicate
          const existingIds = new Set(convData.map(c => c.id))
          coachConvs.forEach(c => {
            if (!existingIds.has(c.id)) {
              convData.push(c)
            }
          })
        }
      }

      // Sort by updated_at
      convData.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

      // Enrich conversations with user info and last message
      const enrichedConversations = await Promise.all(
        convData.map(async (conv) => {
          let otherUserName = ''
          let otherUserPhoto = ''

          // Determine if current user is the coach or client in this conversation
          const isCoachInConv = coachProfileId && conv.coach_id === coachProfileId

          if (isCoachInConv) {
            // Current user is the coach, get client info
            const userInfo = await getUserName(conv.client_id)
            otherUserName = userInfo.name
            otherUserPhoto = userInfo.photo || ''
          } else {
            // Current user is the client, get coach info
            const { data: coachData } = await supabase
              .from('coach_profiles')
              .select('full_name, profile_photos')
              .eq('id', conv.coach_id)
              .single()

            otherUserName = coachData?.full_name || 'Coach'
            otherUserPhoto = coachData?.profile_photos?.[0]
          }

          // Get last message
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          // Get unread count
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .neq('sender_id', currentUserId)

          return {
            ...conv,
            other_user_name: otherUserName,
            other_user_photo: otherUserPhoto,
            last_message: lastMsg?.content,
            unread_count: count || 0
          }
        })
      )

    setConversations(enrichedConversations)
    setLoading(false)
  }, [currentUserId])

  // Initial fetch of conversations
  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Real-time subscription for conversation list updates
  useEffect(() => {
    if (!currentUserId) return

    const channel = supabase
      .channel('conversations-list')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        () => {
          // Refresh conversations when any message changes
          fetchConversations()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        () => {
          // Refresh conversations when conversations change
          fetchConversations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId, fetchConversations])

  // Fetch messages for selected conversation
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedConversation) return

      const { data: msgData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', selectedConversation)
        .order('created_at', { ascending: true })

      if (!error) {
        setMessages(msgData || [])
      }

      // Get other user info
      const { data: convData } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', selectedConversation)
        .single()

      if (convData && currentUserId) {
        // Get user's coach profile to determine their role in this conversation
        const { data: myCoachProfile } = await supabase
          .from('coach_profiles')
          .select('id')
          .eq('user_id', currentUserId)
          .single()

        const isCoachInConv = myCoachProfile && convData.coach_id === myCoachProfile.id

        if (isCoachInConv) {
          // Current user is the coach in this conversation, get client info
          const userInfo = await getUserName(convData.client_id)
          setOtherUser({
            id: convData.client_id,
            name: userInfo.name,
            photo: userInfo.photo
          })

          // Store client user_id for assignment
          setCurrentClientUserId(convData.client_id)

          // Check if this client is already assigned to this coach
          const { data: clientProfile } = await supabase
            .from('client_profiles')
            .select('coach_id')
            .eq('user_id', convData.client_id)
            .single()

          if (clientProfile && clientProfile.coach_id === myCoachProfile?.id) {
            setIsClientAssigned(true)
          } else {
            setIsClientAssigned(false)
          }
        } else {
          // Current user is the client in this conversation, get coach info
          const { data: coachData } = await supabase
            .from('coach_profiles')
            .select('full_name, profile_photos')
            .eq('id', convData.coach_id)
            .single()

          setOtherUser({
            id: convData.coach_id,
            name: coachData?.full_name || 'Coach',
            photo: coachData?.profile_photos?.[0]
          })

          // Reset client assignment state when user is a client
          setCurrentClientUserId(null)
          setIsClientAssigned(false)
        }
      }

      // Mark messages as read
      if (currentUserId) {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('conversation_id', selectedConversation)
          .neq('sender_id', currentUserId)
      }
    }

    fetchMessages()
  }, [selectedConversation, currentUserId, userRole, refreshTrigger])

  // Real-time subscription for messages
  useEffect(() => {
    if (!selectedConversation) return

    const channel = supabase
      .channel(`messages:${selectedConversation}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const message = payload.new as Message

          // Only process messages for this conversation
          if (message.conversation_id !== selectedConversation) return

          if (payload.eventType === 'INSERT') {
            setMessages((prev) => [...prev, message])

            // Mark as read if not from current user
            if (message.sender_id !== currentUserId) {
              supabase
                .from('messages')
                .update({ is_read: true })
                .eq('id', message.id)
            }
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === message.id ? message : msg
              )
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedConversation, currentUserId])

  // Send message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedConversation || !currentUserId || sending) return

    setSending(true)
    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: selectedConversation,
        sender_id: currentUserId,
        content: newMessage.trim()
      })

    if (!error) {
      setNewMessage('')
      inputRef.current?.focus()

      // Reactivate conversation for both parties and update timestamp
      // This ensures the recipient sees the conversation even if they deleted it
      await supabase
        .from('conversations')
        .update({
          updated_at: new Date().toISOString(),
          deleted_by_client: false,
          deleted_by_coach: false
        })
        .eq('id', selectedConversation)
    }

    setSending(false)
  }

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Messages</h1>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 h-[calc(100vh-200px)]">
            {/* Conversations List */}
            <div className="border-r border-gray-200 flex flex-col">
              {/* Search Input */}
              <div className="p-3 border-b border-gray-200">
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Conversations */}
              <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <div className="text-4xl mb-2">💬</div>
                    <p>No conversations yet</p>
                    {userRole === 'client' && (
                      <button
                        onClick={() => navigate('/browse-coaches')}
                        className="mt-3 text-primary-600 hover:text-primary-700 text-sm"
                      >
                        Find a coach to message
                      </button>
                    )}
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <p>No conversations found</p>
                  </div>
                ) : (
                  filteredConversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => {
                        setSelectedConversation(conv.id)
                        navigate(`/chat/${conv.id}`)
                      }}
                      className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        selectedConversation === conv.id ? 'bg-primary-50' : ''
                      } ${conv.unread_count && conv.unread_count > 0 ? 'bg-blue-50/50' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                            {conv.other_user_photo ? (
                              <img
                                src={conv.other_user_photo}
                                alt={conv.other_user_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-gray-500">👤</span>
                            )}
                          </div>
                          {conv.unread_count && conv.unread_count > 0 && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary-500 rounded-full border-2 border-white"></span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className={`truncate ${
                              conv.unread_count && conv.unread_count > 0
                                ? 'font-bold text-gray-900'
                                : 'font-medium text-gray-900'
                            }`}>
                              {conv.other_user_name}
                            </span>
                            {conv.unread_count && conv.unread_count > 0 ? (
                              <span className="w-5 h-5 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center">
                                {conv.unread_count}
                              </span>
                            ) : null}
                          </div>
                          {conv.last_message && (
                            <p className={`text-sm truncate ${
                              conv.unread_count && conv.unread_count > 0
                                ? 'font-semibold text-gray-700'
                                : 'text-gray-500'
                            }`}>
                              {conv.last_message}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Messages Area */}
            <div className="md:col-span-2 flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        {otherUser?.photo ? (
                          <img
                            src={otherUser.photo}
                            alt={otherUser.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-gray-500">👤</span>
                        )}
                      </div>
                      <div>
                        <h2 className="font-semibold text-gray-900">{otherUser?.name}</h2>
                        {userRole === 'coach' && isClientAssigned && (
                          <span className="text-xs text-primary-600 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Your Client
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Start Working Together Button - Only for coaches */}
                      {userRole === 'coach' && !isClientAssigned && (
                        <button
                          onClick={handleStartWorkingTogether}
                          disabled={assigning}
                          className="px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium flex items-center gap-1.5"
                        >
                          {assigning ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Starting...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              <span>Start Working Together</span>
                            </>
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete conversation"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-gray-500">
                        <p>Start the conversation!</p>
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                              msg.sender_id === currentUserId
                                ? 'bg-primary-500 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <p className="break-words">{msg.content}</p>
                            <div
                              className={`flex items-center justify-end gap-2 mt-1 ${
                                msg.sender_id === currentUserId ? 'text-primary-100' : 'text-gray-500'
                              }`}
                            >
                              <span className="text-xs">{formatTime(msg.created_at)}</span>
                              {msg.sender_id === currentUserId && (
                                <div className="flex flex-col items-center">
                                  {msg.is_read ? (
                                    <>
                                      <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M18 7l-8 8-3-3" />
                                        <path d="M22 7l-8 8-1-1" />
                                      </svg>
                                      <span className="text-[9px] text-white font-medium leading-tight">Read</span>
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-3.5 h-3.5 text-primary-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20 6L9 17l-5-5" />
                                      </svg>
                                      <span className="text-[9px] text-primary-200 font-medium leading-tight">Delivered</span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <form onSubmit={sendMessage} className="p-4 border-t border-gray-200">
                    <div className="flex gap-2">
                      <input
                        ref={inputRef}
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="px-4 py-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {sending ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <div className="text-4xl mb-2">💬</div>
                    <p>Select a conversation to start chatting</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Conversation</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this conversation? This action cannot be undone and all messages will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConversation}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Chat
