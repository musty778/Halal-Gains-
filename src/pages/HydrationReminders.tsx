import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'

interface HydrationReminder {
  id: string
  user_id: string
  reminder_time: string
  reminder_message: string | null
  is_active: boolean
  ramadan_only: boolean
  created_at: string
  updated_at: string
}

const HydrationReminders = () => {
  const navigate = useNavigate()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [reminders, setReminders] = useState<HydrationReminder[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingReminder, setEditingReminder] = useState<HydrationReminder | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    reminder_time: '',
    reminder_message: '',
    is_active: true,
    ramadan_only: true
  })

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }
      setCurrentUserId(user.id)
    }

    getCurrentUser()
  }, [navigate])

  // Fetch reminders
  useEffect(() => {
    const fetchReminders = async () => {
      if (!currentUserId) return

      const { data, error } = await supabase
        .from('hydration_reminders')
        .select('*')
        .eq('user_id', currentUserId)
        .order('reminder_time', { ascending: true })

      if (!error && data) {
        setReminders(data)
      }

      setLoading(false)
    }

    fetchReminders()
  }, [currentUserId])

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUserId || saving) return

    setSaving(true)

    const reminderData = {
      user_id: currentUserId,
      reminder_time: formData.reminder_time,
      reminder_message: formData.reminder_message || null,
      is_active: formData.is_active,
      ramadan_only: formData.ramadan_only,
      updated_at: new Date().toISOString()
    }

    if (editingReminder) {
      // Update existing reminder
      const { error } = await supabase
        .from('hydration_reminders')
        .update(reminderData)
        .eq('id', editingReminder.id)

      if (!error) {
        setReminders(prev =>
          prev.map(r => r.id === editingReminder.id ? { ...r, ...reminderData } : r)
        )
        closeModal()
      }
    } else {
      // Create new reminder
      const { data, error } = await supabase
        .from('hydration_reminders')
        .insert(reminderData)
        .select()
        .single()

      if (!error && data) {
        setReminders(prev => [...prev, data].sort((a, b) =>
          a.reminder_time.localeCompare(b.reminder_time)
        ))
        closeModal()
      }
    }

    setSaving(false)
  }

  // Handle delete
  const handleDelete = async (reminderId: string) => {
    if (deleting || !confirm('Delete this hydration reminder?')) return

    setDeleting(reminderId)

    const { error } = await supabase
      .from('hydration_reminders')
      .delete()
      .eq('id', reminderId)

    if (!error) {
      setReminders(prev => prev.filter(r => r.id !== reminderId))
    }

    setDeleting(null)
  }

  // Toggle active status
  const toggleActive = async (reminder: HydrationReminder) => {
    const { error } = await supabase
      .from('hydration_reminders')
      .update({ is_active: !reminder.is_active })
      .eq('id', reminder.id)

    if (!error) {
      setReminders(prev =>
        prev.map(r => r.id === reminder.id ? { ...r, is_active: !r.is_active } : r)
      )
    }
  }

  // Open modal for editing
  const openEditModal = (reminder: HydrationReminder) => {
    setEditingReminder(reminder)
    setFormData({
      reminder_time: reminder.reminder_time,
      reminder_message: reminder.reminder_message || '',
      is_active: reminder.is_active,
      ramadan_only: reminder.ramadan_only
    })
    setShowModal(true)
  }

  // Open modal for creating
  const openCreateModal = () => {
    setEditingReminder(null)
    setFormData({
      reminder_time: '',
      reminder_message: '',
      is_active: true,
      ramadan_only: true
    })
    setShowModal(true)
  }

  // Close modal
  const closeModal = () => {
    setShowModal(false)
    setEditingReminder(null)
    setFormData({
      reminder_time: '',
      reminder_message: '',
      is_active: true,
      ramadan_only: true
    })
  }

  // Format time for display
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">💧 Hydration Reminders</h1>
            <p className="text-gray-600 mt-1">Stay hydrated throughout the day</p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Reminder
          </button>
        </div>

        {reminders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-4xl mb-3">💧</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Reminders Yet</h3>
            <p className="text-gray-600 mb-4">
              Set up hydration reminders to help you stay healthy and hydrated.
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Your First Reminder
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reminders.map((reminder) => (
              <div
                key={reminder.id}
                className={`bg-white rounded-xl shadow-sm border border-gray-200 p-5 transition-all ${
                  reminder.is_active ? 'opacity-100' : 'opacity-60'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`text-3xl ${reminder.is_active ? '' : 'grayscale'}`}>
                      {reminder.ramadan_only ? '🌙' : '💧'}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {formatTime(reminder.reminder_time)}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          reminder.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {reminder.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {reminder.ramadan_only && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                            Ramadan Only
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleActive(reminder)}
                      className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title={reminder.is_active ? 'Deactivate' : 'Activate'}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {reminder.is_active ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        )}
                      </svg>
                    </button>
                    <button
                      onClick={() => openEditModal(reminder)}
                      className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Edit reminder"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(reminder.id)}
                      disabled={deleting === reminder.id}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete reminder"
                    >
                      {deleting === reminder.id ? (
                        <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {reminder.reminder_message && (
                  <p className="text-sm text-gray-600 mt-2">
                    💬 {reminder.reminder_message}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeModal}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {editingReminder ? '✏️ Edit Reminder' : '➕ Add Reminder'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Reminder Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ⏰ Reminder Time
                  </label>
                  <input
                    type="time"
                    value={formData.reminder_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, reminder_time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    💬 Message (Optional)
                  </label>
                  <textarea
                    value={formData.reminder_message}
                    onChange={(e) => setFormData(prev => ({ ...prev, reminder_message: e.target.value }))}
                    placeholder="e.g., Time to drink water!"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Ramadan Only */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.ramadan_only}
                      onChange={(e) => setFormData(prev => ({ ...prev, ramadan_only: e.target.checked }))}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      🌙 Ramadan Only
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 ml-6 mt-1">
                    This reminder will only be active during Ramadan
                  </p>
                </div>

                {/* Active */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      ✅ Active
                    </span>
                  </label>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !formData.reminder_time}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : editingReminder ? (
                      'Update Reminder'
                    ) : (
                      'Add Reminder'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HydrationReminders
