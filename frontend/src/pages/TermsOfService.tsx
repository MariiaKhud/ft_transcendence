import { useTranslation } from 'react-i18next'

export const TermsOfService = () => {
  const { t } = useTranslation()

  const acceptableUseList = t('termsOfService.acceptableUse.list', { returnObjects: true }) as string[]
  const accountsList = t('termsOfService.accounts.list', { returnObjects: true }) as string[]

  return (
    <section className="mx-auto w-full max-w-4xl space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-5xl font-bold tracking-tight text-slate-900">{t('termsOfService.title')}</h1>
        <p className="text-lg text-slate-600">{t('termsOfService.lastUpdated')}</p>
      </div>

      {/* Content */}
      <div className="space-y-8 rounded-2xl border border-white/30 bg-white/40 p-8 backdrop-blur-md shadow-xl">
        {/* Introduction */}
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-slate-900">{t('termsOfService.intro.heading')}</h2>
          <p className="text-slate-700 leading-relaxed">{t('termsOfService.intro.p1')}</p>
          <p className="text-slate-700 leading-relaxed">{t('termsOfService.intro.p2')}</p>
        </div>

        {/* Acceptable Use */}
        <div className="space-y-3 border-t border-white/20 pt-6">
          <h2 className="text-2xl font-bold text-slate-900">{t('termsOfService.acceptableUse.heading')}</h2>

          <p className="text-slate-700 leading-relaxed">{t('termsOfService.acceptableUse.intro')}</p>

          <ul className="space-y-2 pl-4">
            {acceptableUseList.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="text-purple-600">•</span>
                <span className="text-slate-700">{item}</span>
              </li>
            ))}
          </ul>

          <p className="text-slate-700 leading-relaxed pt-2">{t('termsOfService.acceptableUse.outro')}</p>
        </div>

        {/* Content Ownership */}
        <div className="space-y-3 border-t border-white/20 pt-6">
          <h2 className="text-2xl font-bold text-slate-900">{t('termsOfService.ownership.heading')}</h2>

          <div className="space-y-4 pl-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-800">{t('termsOfService.ownership.yourContent.heading')}</h3>
              <p className="text-slate-700 leading-relaxed">{t('termsOfService.ownership.yourContent.body')}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-800">{t('termsOfService.ownership.responsibility.heading')}</h3>
              <p className="text-slate-700 leading-relaxed">{t('termsOfService.ownership.responsibility.body')}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-800">{t('termsOfService.ownership.platformContent.heading')}</h3>
              <p className="text-slate-700 leading-relaxed">{t('termsOfService.ownership.platformContent.body')}</p>
            </div>
          </div>
        </div>

        {/* Moderation Policy */}
        <div className="space-y-3 border-t border-white/20 pt-6">
          <h2 className="text-2xl font-bold text-slate-900">{t('termsOfService.moderation.heading')}</h2>

          <div className="space-y-4 pl-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-800">{t('termsOfService.moderation.review.heading')}</h3>
              <p className="text-slate-700 leading-relaxed">{t('termsOfService.moderation.review.body')}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-800">{t('termsOfService.moderation.reporting.heading')}</h3>
              <p className="text-slate-700 leading-relaxed">{t('termsOfService.moderation.reporting.body')}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-800">{t('termsOfService.moderation.suspension.heading')}</h3>
              <p className="text-slate-700 leading-relaxed">{t('termsOfService.moderation.suspension.body')}</p>
            </div>
          </div>
        </div>

        {/* User Accounts */}
        <div className="space-y-3 border-t border-white/20 pt-6">
          <h2 className="text-2xl font-bold text-slate-900">{t('termsOfService.accounts.heading')}</h2>

          <p className="text-slate-700 leading-relaxed">{t('termsOfService.accounts.intro')}</p>

          <ul className="space-y-2 pl-4">
            {accountsList.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="text-purple-600">•</span>
                <span className="text-slate-700">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Disclaimers */}
        <div className="space-y-3 border-t border-white/20 pt-6">
          <h2 className="text-2xl font-bold text-slate-900">{t('termsOfService.disclaimers.heading')}</h2>
          <p className="text-slate-700 leading-relaxed">{t('termsOfService.disclaimers.body')}</p>
        </div>

        {/* Limitation of Liability */}
        <div className="space-y-3 border-t border-white/20 pt-6">
          <h2 className="text-2xl font-bold text-slate-900">{t('termsOfService.liability.heading')}</h2>
          <p className="text-slate-700 leading-relaxed">{t('termsOfService.liability.body')}</p>
        </div>

        {/* Changes to Terms */}
        <div className="space-y-3 border-t border-white/20 pt-6">
          <h2 className="text-2xl font-bold text-slate-900">{t('termsOfService.changes.heading')}</h2>
          <p className="text-slate-700 leading-relaxed">{t('termsOfService.changes.body')}</p>
        </div>

        {/* Contact */}
        <div className="space-y-3 border-t border-white/20 pt-6">
          <h2 className="text-2xl font-bold text-slate-900">{t('termsOfService.contact.heading')}</h2>

          <p className="text-slate-700 leading-relaxed">{t('termsOfService.contact.intro')}</p>

          <div className="mt-4 space-y-2 rounded-lg border border-purple-200/50 bg-purple-50/40 p-4">
            <p className="text-slate-900 font-semibold">{t('termsOfService.contact.teamName')}</p>
            <p className="text-slate-700">{t('termsOfService.contact.email')}</p>
            <p className="text-slate-700">{t('termsOfService.contact.responseTime')}</p>
          </div>
        </div>
      </div>
    </section>
  )
}