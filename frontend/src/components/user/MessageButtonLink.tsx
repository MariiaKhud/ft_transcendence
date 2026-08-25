import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { MessageIcon } from '@/components/ui/icons'

interface MessageButtonLinkProps {
  username: string
}

export function MessageButtonLink({ username }: MessageButtonLinkProps) {
  const { t } = useTranslation()

  return (
    <Link
      to={`/chat/${encodeURIComponent(username)}`}
      aria-label={t('friends.message')}
      title={t('friends.message')}
    >
      <Button variant="profile">
        <MessageIcon />
        <span className="hidden sm:inline">{t('friends.message')}</span>
      </Button>
    </Link>
  )
}
