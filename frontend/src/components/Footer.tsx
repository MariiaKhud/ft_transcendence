import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export const Footer = () => {
  const { t } = useTranslation()
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative z-10 border-t border-white/20 bg-white/10 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-slate-600">
            {t('footer.copyright', { year: currentYear })}
        </p>
        <nav aria-label={t('footer.navAriaLabel')} className="flex items-center gap-4 text-sm">
          <Link to="/privacy-policy" className="text-slate-600 transition-colors hover:text-purple-600">
            {t('footer.privacyPolicy')}
          </Link>
          <Link to="/terms-of-service" className="text-slate-600 transition-colors hover:text-purple-600">
            {t('footer.termsOfService')}
          </Link>
          <a
            href="https://github.com/MariiaKhud/ft_transcendence/tree/main"
            target="_blank"
            rel="noreferrer"
            className="text-slate-600 transition-colors hover:text-purple-600"
          >
            {t('footer.githubRepo')}
          </a>
        </nav>
      </div>
    </footer>
  )
}
