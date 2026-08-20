import { useTranslation } from 'react-i18next'

export function Notifications() {
  const { t } = useTranslation()
  return <div className="p-8 text-slate-900">{t('notification.comingSoon')}</div>
}
