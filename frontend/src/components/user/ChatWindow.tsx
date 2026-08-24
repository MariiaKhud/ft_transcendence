import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ChatMessage } from '@/hooks/useChat'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/icons'
import { UserAvatar } from '@/components/user/UserAvatar'
import { formatMessageTime } from '@/lib/utils'

interface ChatWindowProps {
  messages: ChatMessage[]
  currentUserId: string
  sending: boolean
  error: string | null
  onSend: (content: string) => void
}

export function ChatWindow({
  messages,
  currentUserId,
  sending,
  error,
  onSend,
}: ChatWindowProps) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend() {
    if (!draft.trim() || sending) return
    onSend(draft)
    setDraft('')
    textareaRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Send on Enter, new line on Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-full flex-col">

      {/* ── Messages ──────────────────────────────────────── */}
      <div className="flex-1
                      overflow-y-auto
                      px-4
                      py-4
                      space-y-3">
        {messages.length === 0 && (
          <div className="flex
                          h-full
                          items-center
                          justify-center">
            <p className="text-sm text-slate-400">
              {t('chat.noMessages')}
            </p>
          </div>
        )}

        {messages.map((msg, index) => {
          const isMine = msg.senderId === currentUserId
          const prevMsg = messages[index - 1]
          // Group messages from same sender — don't repeat avatar
          const showAvatar = !prevMsg || prevMsg.senderId !== msg.senderId

          return (
            <div
              key={msg.id}
              className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar — only shown on first message in a group */}
              <div className="w-7 shrink-0">
                {showAvatar && !isMine && (
                  <UserAvatar
                    avatarUrl={msg.sender.avatarUrl}
                    username={msg.sender.username}
                    size="small"
                  />
                )}
              </div>

              {/* Bubble */}
              <div
                className={`max-w-[72%]
                            rounded-2xl
                            px-4
                            py-2.5
                            shadow-sm ${
                  isMine
                    ? 'rounded-br-sm bg-gradient-to-br from-purple-600 to-pink-600 text-white'
                    : 'rounded-bl-sm border border-white/30 bg-white/60 text-slate-800 backdrop-blur-sm'
                }`}
              >
                <p className="text-sm
                              leading-relaxed
                              whitespace-pre-wrap
                              break-words">
                  {msg.content}
                </p>
                <p className={`mt-1 text-[10px] ${
                  isMine ? 'text-white/60 text-right' : 'text-slate-400'
                }`}>
                  {formatMessageTime(msg.createdAt)}
                  {isMine && (
                    <span className="ml-1">
                      {msg.isRead ? '✓✓' : '✓'}
                    </span>
                  )}
                </p>
              </div>
            </div>
          )
        })}

        {/* Anchor for auto-scroll */}
        <div ref={bottomRef} />
      </div>

      {/* ── Error ─────────────────────────────────────────── */}
      {error && (
        <p className="px-4
                      py-1
                      text-xs
                      text-pink-600">{error}</p>
      )}

      {/* ── Input ─────────────────────────────────────────── */}
      <div className="border-t
                      border-white/20
                      bg-white/30
                      px-4
                      py-3
                      backdrop-blur-sm">
        <div className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.placeholder')}
            rows={1}
            maxLength={2000}
            disabled={sending}
            className="flex-1
                       resize-none
                       rounded-2xl
                       border
                       border-slate-200
                       bg-white/70
                       px-4
                       py-2.5
                       text-sm
                       text-slate-800
                       placeholder-slate-400
                       focus:border-purple-300
                       focus:outline-none
                       focus:ring-2
                       focus:ring-purple-200
                       disabled:opacity-50
                       max-h-32
                       overflow-y-auto"
            style={{ height: 'auto' }}
            onInput={(e) => {
              // Auto-grow textarea
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = `${el.scrollHeight}px`
            }}
          />

          <Button
            variant="default"
            onClick={handleSend}
            disabled={!draft.trim() || sending}
            aria-label={t('chat.send')}
            className="shrink-0
                       rounded-2xl
                       bg-gradient-to-r
                       from-purple-600
                       to-pink-600
                       px-5
                       py-2.5
                       text-sm
                       font-semibold
                       text-white
                       shadow
                       hover:shadow-md
                       hover:scale-105
                       transition-all
                       disabled:opacity-50
                       disabled:scale-100"
          >
            {sending ? <Spinner /> : t('chat.send')}
          </Button>
        </div>

        <p className={`mt-1 text-right text-[10px] ${
          draft.length > 1800 ? 'text-pink-500' : 'text-slate-400'
        }`}>
          {draft.length}/2000
        </p>
      </div>
    </div>
  )
}
