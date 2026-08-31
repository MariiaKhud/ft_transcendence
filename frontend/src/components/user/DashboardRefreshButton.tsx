import { useTranslation } from 'react-i18next'
import { RefreshIcon, Spinner } from '@/components/ui/icons'

type DashboardRefreshButtonProps = {
  onRefresh: () => void
  isLoading?: boolean
}

export function DashboardRefreshButton({
  onRefresh,
  isLoading = false,
}: DashboardRefreshButtonProps) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={isLoading}
      className="relative flex items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-indigo-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      aria-label={t('admin.refresh')}
      title={t('admin.refresh')}
    >
      {isLoading ? <Spinner /> : <RefreshIcon />}
    </button>
  )
}