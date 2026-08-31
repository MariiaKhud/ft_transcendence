import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LeaderboardIcon } from '@/components/ui/icons'

export function LeaderboardButton() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/leaderboard')}
      className="relative
                 p-2
                 text-gray-500
                 hover:text-gray-900
                 hover:bg-indigo-100
                 rounded-lg
                 transition-colors
                 focus:outline-none
                 focus:ring-2
                 focus:ring-blue-500"
      aria-label={t('nav.leaderboard')}
    >
      <LeaderboardIcon />
    </button>
  );
}