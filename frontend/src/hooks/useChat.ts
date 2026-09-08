import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { getSocket } from '@/lib/socket'
import { apiRequest } from '@/api/client'
import i18n from '@/lib/i18n'

export interface ChatMessage {
  id: string
  senderId: string
  receiverId: string
  content: string
  isRead: boolean
  createdAt: string
  sender: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
  }
}

// export function useChat(otherUserId: string, currentUserId: string) {
export function useChat(otherUserId: string) {
  const { t } = useTranslation()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  // Load history on mount via REST
  useEffect(() => {
    if (!otherUserId) {
      setMessages([])
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    apiRequest<ChatMessage[]>(`/messages/${otherUserId}`, {
      fallbackMessage: t('chat.loadError'),
    })
      .then((res) => setMessages(res.data ?? []))
      .catch(() => setError(t('chat.loadError')))
      .finally(() => setLoading(false))
  }, [otherUserId, t])

  // Listen for real-time events
  useEffect(() => {
    if (!otherUserId) return

    const socket = getSocket()

    // New message received from the other user
    function onMessage(message: ChatMessage) {
      if (message.senderId !== otherUserId) return
      setMessages((prev) => [...prev, message])

      // Mark as read immediately since conversation is open
      socket.emit('chat:read', { senderId: otherUserId })
    }

    // Confirmation that our sent message was saved
    function onSent(message: ChatMessage) {
      setSending(false)
      setError(null)
      setMessages((prev) => [...prev, message])
    }

    function onError(payload: { code?: string; message: string }) {
      setSending(false)
      if (payload.code === 'friendship_not_found') {
        setError(t('chat.notFriends'))
        return
      }
      const key = payload.code ? `api.errors.${payload.code}` : null
      setError(key && i18n.exists(key) ? i18n.t(key) : payload.message)
    }

    socket.on('chat:message', onMessage)
    socket.on('chat:sent', onSent)
    socket.on('chat:error', onError)

    // Mark existing messages as read when opening the conversation
    socket.emit('chat:read', { senderId: otherUserId })

    return () => {
      socket.emit('chat:close')
      socket.off('chat:message', onMessage)
      socket.off('chat:sent', onSent)
      socket.off('chat:error', onError)
    }
  }, [otherUserId, t])

  // Send a message
  const sendMessage = useCallback((content: string) => {
    const trimmed = content.trim()
    if (!trimmed || trimmed.length > 2000 || sending) return

    setSending(true)
    setError(null)
    getSocket().emit('chat:send', {
      receiverId: otherUserId,
      content: trimmed,
    })
  }, [otherUserId, sending])

  return { messages, loading, error, sending, sendMessage }
}
