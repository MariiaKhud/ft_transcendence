import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { getSocket } from '@/lib/socket'
import { apiRequest } from '@/api/client'

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
    if (!otherUserId) return

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

    function onError(payload: { message: string }) {
      setSending(false)
      setError(payload.message)
    }

    socket.on('chat:message', onMessage)
    socket.on('chat:sent', onSent)
    socket.on('chat:error', onError)

    // Mark existing messages as read when opening the conversation
    socket.emit('chat:read', { senderId: otherUserId })

    return () => {
      socket.off('chat:message', onMessage)
      socket.off('chat:sent', onSent)
      socket.off('chat:error', onError)
    }
  }, [otherUserId])

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
