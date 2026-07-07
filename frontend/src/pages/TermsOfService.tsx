export const TermsOfService = () => {
  return (
    <section className="mx-auto w-full max-w-4xl space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-5xl font-bold tracking-tight text-slate-900">Terms of Service</h1>
        <p className="text-lg text-slate-600">Last updated: July 2026</p>
      </div>

      {/* Content */}
      <div className="space-y-8 rounded-2xl border border-white/30 bg-white/40 p-8 backdrop-blur-md shadow-xl">
        {/* Introduction */}
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-slate-900">Introduction</h2>
          <p className="text-slate-700 leading-relaxed">
            Welcome to Codamium. By accessing or using our platform, you agree to be bound by these Terms of Service ("Terms"). Please read them carefully before using the platform.
          </p>
          <p className="text-slate-700 leading-relaxed">
            If you do not agree to these Terms, you may not access or use Codamium. We reserve the right to update these Terms at any time, and your continued use of the platform constitutes acceptance of any changes.
          </p>
        </div>

        {/* Acceptable Use */}
        <div className="space-y-3 border-t border-white/20 pt-6">
          <h2 className="text-2xl font-bold text-slate-900">1. Acceptable Use</h2>

          <p className="text-slate-700 leading-relaxed">
            You agree to use Codamium only for lawful purposes and in a way that does not infringe the rights of others. The following activities are strictly prohibited:
          </p>

          <ul className="space-y-2 pl-4">
            <li className="flex gap-3">
              <span className="text-purple-600">•</span>
              <span className="text-slate-700">Posting content that is illegal, harmful, abusive, harassing, defamatory, or discriminatory</span>
            </li>
            <li className="flex gap-3">
              <span className="text-purple-600">•</span>
              <span className="text-slate-700">Impersonating another person or entity, or misrepresenting your affiliation</span>
            </li>
            <li className="flex gap-3">
              <span className="text-purple-600">•</span>
              <span className="text-slate-700">Distributing spam, malware, viruses, or any malicious code</span>
            </li>
            <li className="flex gap-3">
              <span className="text-purple-600">•</span>
              <span className="text-slate-700">Attempting to gain unauthorized access to any account, system, or network</span>
            </li>
            <li className="flex gap-3">
              <span className="text-purple-600">•</span>
              <span className="text-slate-700">Scraping, crawling, or harvesting user data without our express written consent</span>
            </li>
            <li className="flex gap-3">
              <span className="text-purple-600">•</span>
              <span className="text-slate-700">Using the platform to engage in any form of commercial advertising without approval</span>
            </li>
            <li className="flex gap-3">
              <span className="text-purple-600">•</span>
              <span className="text-slate-700">Interfering with or disrupting the integrity or performance of the platform</span>
            </li>
          </ul>

          <p className="text-slate-700 leading-relaxed pt-2">
            We reserve the right to remove any content that violates these rules and to suspend or terminate the accounts of users who engage in prohibited activities.
          </p>
        </div>

        {/* Content Ownership */}
        <div className="space-y-3 border-t border-white/20 pt-6">
          <h2 className="text-2xl font-bold text-slate-900">2. Content Ownership</h2>

          <div className="space-y-4 pl-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-800">Your Content</h3>
              <p className="text-slate-700 leading-relaxed">
                You retain ownership of all content you create and publish on Codamium, including articles, comments, and profile information. By posting content, you grant Codamium a non-exclusive, worldwide, royalty-free license to display, distribute, and promote your content within the platform.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-800">Content Responsibility</h3>
              <p className="text-slate-700 leading-relaxed">
                You are solely responsible for the content you publish. You represent and warrant that you own or have the necessary rights to publish your content, and that it does not violate any applicable laws or third-party rights, including intellectual property rights.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-800">Platform Content</h3>
              <p className="text-slate-700 leading-relaxed">
                All platform elements not created by users — including the design, logo, and interface — are owned by Codamium and protected by applicable intellectual property laws. You may not copy, reproduce, or redistribute any platform content without express written permission.
              </p>
            </div>
          </div>
        </div>

        {/* Moderation Policy */}
        <div className="space-y-3 border-t border-white/20 pt-6">
          <h2 className="text-2xl font-bold text-slate-900">3. Moderation Policy</h2>

          <div className="space-y-4 pl-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-800">Content Review</h3>
              <p className="text-slate-700 leading-relaxed">
                Codamium moderators may review, edit, or remove any content at their discretion if it violates these Terms. Moderation decisions are final, though users may appeal by contacting our support team.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-800">Reporting</h3>
              <p className="text-slate-700 leading-relaxed">
                Users may report content or accounts they believe violate these Terms. We investigate all reports and take appropriate action, but we do not guarantee that every report will result in removal or account action.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-800">Account Suspension and Termination</h3>
              <p className="text-slate-700 leading-relaxed">
                We reserve the right to suspend or permanently terminate any account that repeatedly or severely violates these Terms, without prior notice. Suspended users may not create new accounts to circumvent the suspension.
              </p>
            </div>
          </div>
        </div>

        {/* User Accounts */}
        <div className="space-y-3 border-t border-white/20 pt-6">
          <h2 className="text-2xl font-bold text-slate-900">4. User Accounts</h2>

          <p className="text-slate-700 leading-relaxed">
            You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You agree to:
          </p>

          <ul className="space-y-2 pl-4">
            <li className="flex gap-3">
              <span className="text-purple-600">•</span>
              <span className="text-slate-700">Provide accurate and truthful information when creating your account</span>
            </li>
            <li className="flex gap-3">
              <span className="text-purple-600">•</span>
              <span className="text-slate-700">Keep your password secure and not share it with others</span>
            </li>
            <li className="flex gap-3">
              <span className="text-purple-600">•</span>
              <span className="text-slate-700">Notify us immediately of any unauthorized use of your account</span>
            </li>
            <li className="flex gap-3">
              <span className="text-purple-600">•</span>
              <span className="text-slate-700">Not create multiple accounts to circumvent bans or restrictions</span>
            </li>
          </ul>
        </div>

        {/* Disclaimers */}
        <div className="space-y-3 border-t border-white/20 pt-6">
          <h2 className="text-2xl font-bold text-slate-900">5. Disclaimers</h2>

          <p className="text-slate-700 leading-relaxed">
            Codamium is provided "as is" without warranties of any kind. We do not guarantee that the platform will be available at all times, error-free, or free from security vulnerabilities. We are not responsible for any content posted by users, and we do not endorse any opinions expressed on the platform.
          </p>
        </div>

        {/* Limitation of Liability */}
        <div className="space-y-3 border-t border-white/20 pt-6">
          <h2 className="text-2xl font-bold text-slate-900">6. Limitation of Liability</h2>

          <p className="text-slate-700 leading-relaxed">
            To the maximum extent permitted by law, Codamium shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the platform, including but not limited to loss of data, loss of profits, or reputational damage.
          </p>
        </div>

        {/* Changes to Terms */}
        <div className="space-y-3 border-t border-white/20 pt-6">
          <h2 className="text-2xl font-bold text-slate-900">7. Changes to These Terms</h2>

          <p className="text-slate-700 leading-relaxed">
            We may update these Terms from time to time. When we do, we will update the "Last updated" date at the top of this page. Material changes will be communicated through the platform. Your continued use of Codamium after any changes constitutes your acceptance of the updated Terms.
          </p>
        </div>

        {/* Contact */}
        <div className="space-y-3 border-t border-white/20 pt-6">
          <h2 className="text-2xl font-bold text-slate-900">8. Contact Us</h2>

          <p className="text-slate-700 leading-relaxed">
            If you have questions or concerns about these Terms of Service, please contact us at:
          </p>

          <div className="mt-4 space-y-2 rounded-lg border border-purple-200/50 bg-purple-50/40 p-4">
            <p className="text-slate-900 font-semibold">Codamium Support Team</p>
            <p className="text-slate-700">Email: legal@codamium.com</p>
            <p className="text-slate-700">Response time: We aim to respond within 7 business days</p>
          </div>
        </div>
      </div>
    </section>
  )
}
