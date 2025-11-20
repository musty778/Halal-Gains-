import { useState, useEffect, useRef } from 'react'
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

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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
      if (!coachId || !currentUserId || userRole !== 'client') return

      // Check if conversation already exists
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('client_id', currentUserId)
        .eq('coach_id', coachId)
        .single()

      if (existingConv) {
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

    if (currentUserId && userRole) {
      createConversationIfNeeded()
    }
  }, [currentUserId, userRole, searchParams, navigate])

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      if (!currentUserId || !userRole) return

      const query = supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false })

      // Filter based on role
      if (userRole === 'coach') {
        const { data: coachProfile } = await supabase
          .from('coach_profiles')
          .select('id')
          .eq('user_id', currentUserId)
          .single()

        if (coachProfile) {
          query.eq('coach_id', coachProfile.id)
        }
      } else {
        query.eq('client_id', currentUserId)
      }

      const { data: convData, error } = await query

      if (error) {
        console.error('Error fetching conversations:', error)
        setLoading(false)
        return
      }

      // Enrich conversations with user info and last message
      const enrichedConversations = await Promise.all(
        (convData || []).map(async (conv) => {
          let otherUserName = ''
          let otherUserPhoto = ''

          if (userRole === 'coach') {
            // Get client info
            const { data: clientData } = await supabase
              .from('client_profiles')
              .select('full_name')
              .eq('user_id', conv.client_id)
              .single()

            otherUserName = clientData?.full_name || 'Client'
          } else {
            // Get coach info
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
    }

    fetchConversations()
  }, [currentUserId, userRole])

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
        if (userRole === 'coach') {
          const { data: clientData } = await supabase
            .from('client_profiles')
            .select('full_name')
            .eq('user_id', convData.client_id)
            .single()

          setOtherUser({
            id: convData.client_id,
            name: clientData?.full_name || 'Client'
          })
        } else {
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
  }, [selectedConversation, currentUserId, userRole])

  // Real-time subscription for messages
  useEffect(() => {
    if (!selectedConversation) return

    const channel = supabase
      .channel(`messages:${selectedConversation}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation}`
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages((prev) => [...prev, newMsg])

          // Mark as read if not from current user
          if (newMsg.sender_id !== currentUserId) {
            supabase
              .from('messages')
              .update({ is_read: true })
              .eq('id', newMsg.id)
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

      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
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
            <div className="border-r border-gray-200 overflow-y-auto">
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
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setSelectedConversation(conv.id)
                      navigate(`/chat/${conv.id}`)
                    }}
                    className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      selectedConversation === conv.id ? 'bg-primary-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
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
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900 truncate">
                            {conv.other_user_name}
                          </span>
                          {conv.unread_count && conv.unread_count > 0 ? (
                            <span className="w-5 h-5 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center">
                              {conv.unread_count}
                            </span>
                          ) : null}
                        </div>
                        {conv.last_message && (
                          <p className="text-sm text-gray-500 truncate">{conv.last_message}</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Messages Area */}
            <div className="md:col-span-2 flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-200 flex items-center gap-3">
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
                            <p
                              className={`text-xs mt-1 ${
                                msg.sender_id === currentUserId ? 'text-primary-100' : 'text-gray-500'
                              }`}
                            >
                              {formatTime(msg.created_at)}
                            </p>
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
    </div>
  )
}

export default Chat
