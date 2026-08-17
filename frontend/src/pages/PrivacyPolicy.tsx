import { useTranslation } from 'react-i18next'

interface LabeledListItem {
  label: string
  text: string
}

export const PrivacyPolicy = () => {
  const { t } = useTranslation()

  const usageList = t('privacyPolicy.usage.list', { returnObjects: true }) as string[]
  const sharingList = t('privacyPolicy.sharing.list', { returnObjects: true }) as LabeledListItem[]
  const securityList = t('privacyPolicy.security.list', { returnObjects: true }) as string[]
  const rightsList = t('privacyPolicy.rights.list', { returnObjects: true }) as LabeledListItem[]

  return (
    <section className="mx-auto w-full max-w-4xl space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-5xl font-bold tracking-tight text-slate-900">{t('privacyPolicy.title')}</h1>
        <p className="text-lg text-slate-600">{t('privacyPolicy.lastUpdated')}</p>
      </div>

      {/* Content */}
      <div className="space-y-8 rounded-2xl border border-white/30 bg-white/40 p-8 backdrop-blur-md shadow-xl">
        {/* Introduction */}
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-slate-900">{t('privacyPolicy.intro.heading')}</h2>
          <p className="text-slate-700 leading-relaxed">{t('privacyPolicy.intro.p1')}</p>
          <p className="text-slate-700 leading-relaxed">{t('privacyPolicy.intro.p2')}</p>
        </div>

        {/* Data Collection */}
        <div className="space-y-3 border-t border-white/20 pt-6">
          <h2 className="text-2xl font-bold text-slate-900">{t('privacyPolicy.collect.heading')}</h2>

          <div className="space-y-4 pl-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-800">{t('privacyPolicy.collect.account.heading')}</h3>
              <p className="text-slate-700 leading-relaxed">{t('privacyPolicy.collect.account.body')}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-800">{t('privacyPolicy.collect.content.heading')}</h3>
              <p className="text-slate-700 leading-relaxed">{t('privacyPolicy.collect.content.body')}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-800">{t('privacyPolicy.collect.usage.heading')}</h3>
              <p className="text-slate-700 leading-relaxed">{t('privacyPolicy.collect.usage.body')}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-800">{t('privacyPolicy.collect.device.heading')}</h3>
              <p className="text-slate-700 leading-relaxed">{t('privacyPolicy.collect.device.body')}</p>
            </div>
          </div>
        </div>

        {/* Cookies and JWT */}
        <div className="space-y-3 border-t border-white/20 pt-6">
          <h2 className="text-2xl font-bold text-slate-900">{t('privacyPolicy.cookies.heading')}</h2>

          <div className="space-y-4 pl-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-800">{t('privacyPolicy.cookies.jwt.heading')}</h3>
              <p className="text-slate-700 leading-relaxed">{t('privacyPolicy.cookies.jwt.body')}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-800">{t('privacyPolicy.cookies.session.heading')}</h3>
              <p className="text-slate-700 leading-relaxed">{t('privacyPolicy.cookies.session.body')}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-800">{t('privacyPolicy.cookies.preference.heading')}</h3>
              <p className="text-slate-700 leading-relaxed">{t('privacyPolicy.cookies.preference.body')}</p>
            </div>
          </div>
        </div>

        {/* Usage of Information */}
        <div className="space-y-3 border-t border-white/20 pt-6">
          <h2 className="text-2xl font-bold text-slate-900">{t('privacyPolicy.usage.heading')}</h2>

          <p className="text-slate-700 leading-relaxed">{t('privacyPolicy.usage.intro')}</p>

          <ul className="space-y-2 pl-4">
            {usageList.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="text-purple-600">•</span>
                <span className="text-slate-700">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Information Sharing */}
        <div className="space-y-3 border-t border-white/20 pt-6">
          <h2 className="text-2xl font-bold text-slate-900">{t('privacyPolicy.sharing.heading')}</h2>

          <p className="text-slate-700 leading-relaxed">{t('privacyPolicy.sharing.intro')}</p>

          <ul className="space-y-2 pl-4">
            {sharingList.map((item) => (
              <li key={item.label} className="flex gap-3">
                <span className="text-purple-600">•</span>
                <span className="text-slate-700">
                  <strong>{item.label}</strong> {item.text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Data Security */}
        <div className="space-y-3 border-t border-white/20 pt-6">
          <h2 className="text-2xl font-bold text-slate-900">{t('privacyPolicy.security.heading')}</h2>

          <p className="text-slate-700 leading-relaxed">{t('privacyPolicy.security.intro')}</p>

          <ul className="space-y-2 pl-4">
            {securityList.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="text-purple-600">•</span>
                <span className="text-slate-700">{item}</span>
              </li>
            ))}
          </ul>

          <p className="text-slate-700 leading-relaxed pt-3">{t('privacyPolicy.security.outro')}</p>
        </div>

        {/* User Rights */}
        <div className="space-y-3 border-t border-white/20 pt-6">
          <h2 className="text-2xl font-bold text-slate-900">{t('privacyPolicy.rights.heading')}</h2>

          <p className="text-slate-700 leading-relaxed">{t('privacyPolicy.rights.intro')}</p>

          <ul className="space-y-2 pl-4">
            {rightsList.map((item) => (
              <li key={item.label} className="flex gap-3">
                <span className="text-purple-600">•</span>
                <span className="text-slate-700">
                  <strong>{item.label}</strong> {item.text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Retention */}
        <div className="space-y-3 border-t border-white/20 pt-6">
          <h2 className="text-2xl font-bold text-slate-900">{t('privacyPolicy.retention.heading')}</h2>
          <p className="text-slate-700 leading-relaxed">{t('privacyPolicy.retention.body')}</p>
        </div>

        {/* Children's Privacy */}
        <div className="space-y-3 border-t border-white/20 pt-6">
          <h2 className="text-2xl font-bold text-slate-900">{t('privacyPolicy.children.heading')}</h2>
          <p className="text-slate-700 leading-relaxed">{t('privacyPolicy.children.body')}</p>
        </div>

        {/* Policy Changes */}
        <div className="space-y-3 border-t border-white/20 pt-6">
          <h2 className="text-2xl font-bold text-slate-900">{t('privacyPolicy.changes.heading')}</h2>
          <p className="text-slate-700 leading-relaxed">{t('privacyPolicy.changes.body')}</p>
        </div>

        {/* Contact */}
        <div className="space-y-3 border-t border-white/20 pt-6">
          <h2 className="text-2xl font-bold text-slate-900">{t('privacyPolicy.contact.heading')}</h2>

          <p className="text-slate-700 leading-relaxed">{t('privacyPolicy.contact.intro')}</p>

          <div className="mt-4 space-y-2 rounded-lg border border-purple-200/50 bg-purple-50/40 p-4">
            <p className="text-slate-900 font-semibold">{t('privacyPolicy.contact.teamName')}</p>
            <p className="text-slate-700">{t('privacyPolicy.contact.email')}</p>
            <p className="text-slate-700">{t('privacyPolicy.contact.responseTime')}</p>
          </div>
        </div>
      </div>
    </section>
  )
}