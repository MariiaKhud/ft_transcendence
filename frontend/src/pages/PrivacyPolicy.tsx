export const PrivacyPolicy = () => {
  return (
    <section className="mx-auto w-full max-w-4xl space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-5xl font-bold tracking-tight text-slate-900">Privacy Policy</h1>
        <p className="text-lg text-slate-600">Last updated: July 2026</p>
      </div>

      {/* Content */}
      <div className="space-y-8 rounded-2xl border border-white/30 bg-white/40 p-8 backdrop-blur-md shadow-xl">
        {/* Introduction */}
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-slate-900">Introduction</h2>
          <p className="text-slate-700 leading-relaxed">
            Codamium ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our platform.
          </p>
          <p className="text-slate-700 leading-relaxed">
            Please read this Privacy Policy carefully. If you do not agree with our policies and practices, please do not use our platform.
          </p>
        </div>

        {/* Data Collection */}
        <div className="space-y-3 border-t border-white/20 pt-6">
          <h2 className="text-2xl font-bold text-slate-900">1. Information We Collect</h2>

          <div className="space-y-4 pl-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-800">Account Information</h3>
              <p className="text-slate-700 leading-relaxed">
                When you create an account, we collect information such as your email address, username, display name, profile picture, and bio. We also store your password in hashed form for authentication purposes.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-800">User-Generated Content</h3>
              <p className="text-slate-700 leading-relaxed">
                We collect and store the articles, comments, and other content you create on our platform, including metadata such as publication date, category, and engagement metrics.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-800">Usage and Analytics Data</h3>
              <p className="text-slate-700 leading-relaxed">
                We automatically collect information about your interactions with our platform, including pages visited, content viewed, time spent on pages, and click patterns. This information is used to improve our services and understand user behavior.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-800">Device Information</h3>
              <p className="text-slate-700 leading-relaxed">
                We collect information about the devices you use to access our platform, including device type, operating system, browser type, and IP address.
              </p>
            </div>
          </div>
        </div>

        {/* Cookies and JWT */}
        <div className="space-y-3 border-t border-white/20 pt-6">
          <h2 className="text-2xl font-bold text-slate-900">2. Cookies and Authentication</h2>

          <div className="space-y-4 pl-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-800">JWT Tokens</h3>
              <p className="text-slate-700 leading-relaxed">
                We use JSON Web Tokens (JWT) for authentication and authorization. These tokens contain encrypted information about your session and are stored securely in your browser. JWTs allow you to stay logged in across pages without repeatedly entering your credentials.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-800">Session Cookies</h3>
              <p className="text-slate-700 leading-relaxed">
                We may use session cookies to maintain your logged-in state and provide personalized experiences. These cookies are deleted when you close your browser or explicitly log out.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-800">Preference Cookies</h3>
              <p className="text-slate-700 leading-relaxed">
                We use preference cookies to remember your settings and preferences, such as display language, theme selection, and notification preferences.
              </p>
            </div>
          </div>
        </div>

        {/* Usage of Information */}
        <div className="space-y-3 border-t border-white/20 pt-6">
          <h2 className="text-2xl font-bold text-slate-900">3. How We Use Your Information</h2>

          <p className="text-slate-700 leading-relaxed">We use the information we collect for the following purposes:</p>

          <ul className="space-y-2 pl-4">
            <li className="flex gap-3">
              <span className="text-purple-600">•</span>
              <span className="text-slate-700">To provide, maintain, and improve our platform and services</span>
            </li>
            <li className="flex gap-3">
              <span className="text-purple-600">•</span>
              <span className="text-slate-700">To authenticate your identity and manage your account</span>
            </li>
            <li className="flex gap-3">
              <span className="text-purple-600">•</span>
              <span className="text-slate-700">To personalize your experience and deliver targeted content</span>
            </li>
            <li className="flex gap-3">
              <span className="text-purple-600">•</span>
              <span className="text-slate-700">To communicate with you about updates, announcements, and promotional offers</span>
            </li>
            <li className="flex gap-3">
              <span className="text-purple-600">•</span>
              <span className="text-slate-700">To monitor and analyze trends and usage patterns for platform improvements</span>
            </li>
            <li className="flex gap-3">
              <span className="text-purple-600">•</span>
              <span className="text-slate-700">To enforce our Terms of Service and other agreements</span>
            </li>
            <li className="flex gap-3">
              <span className="text-purple-600">•</span>
              <span className="text-slate-700">To protect against fraudulent, malicious, or illegal activity</span>
            </li>
          </ul>
        </div>

        {/* Information Sharing */}
        <div className="space-y-3 border-t border-white/20 pt-6">
          <h2 className="text-2xl font-bold text-slate-900">4. Information Sharing</h2>

          <p className="text-slate-700 leading-relaxed">
            We do not sell your personal information to third parties. We may share your information in the following circumstances:
          </p>

          <ul className="space-y-2 pl-4">
            <li className="flex gap-3">
              <span className="text-purple-600">•</span>
              <span className="text-slate-700"><strong>Service Providers:</strong> With trusted third-party service providers who assist us in operating our platform, subject to confidentiality agreements</span>
            </li>
            <li className="flex gap-3">
              <span className="text-purple-600">•</span>
              <span className="text-slate-700"><strong>Legal Compliance:</strong> When required by law or government requests</span>
            </li>
            <li className="flex gap-3">
              <span className="text-purple-600">•</span>
              <span className="text-slate-700"><strong>Safety and Protection:</strong> To protect our rights, privacy, safety, or property</span>
            </li>
            <li className="flex gap-3">
              <span className="text-purple-600">•</span>
              <span className="text-slate-700"><strong>Public Profiles:</strong> Your public profile information (username, display name, bio) is visible to all users</span>
            </li>
          </ul>
        </div>

        {/* Data Security */}
        <div className="space-y-3 border-t border-white/20 pt-6">
          <h2 className="text-2xl font-bold text-slate-900">5. Data Security</h2>

          <p className="text-slate-700 leading-relaxed">
            We implement appropriate technical, administrative, and physical safeguards to protect your personal information against unauthorized access, alteration, disclosure, or destruction. Our security measures include:
          </p>

          <ul className="space-y-2 pl-4">
            <li className="flex gap-3">
              <span className="text-purple-600">•</span>
              <span className="text-slate-700">HTTPS encryption for all data transmitted between your browser and our servers</span>
            </li>
            <li className="flex gap-3">
              <span className="text-purple-600">•</span>
              <span className="text-slate-700">Password hashing using industry-standard algorithms</span>
            </li>
            <li className="flex gap-3">
              <span className="text-purple-600">•</span>
              <span className="text-slate-700">Secure JWT token generation and validation</span>
            </li>
            <li className="flex gap-3">
              <span className="text-purple-600">•</span>
              <span className="text-slate-700">Regular security audits and vulnerability assessments</span>
            </li>
          </ul>

          <p className="text-slate-700 leading-relaxed pt-3">
            However, no method of transmission over the internet is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
          </p>
        </div>

        {/* User Rights */}
        <div className="space-y-3 border-t border-white/20 pt-6">
          <h2 className="text-2xl font-bold text-slate-900">6. Your Rights</h2>

          <p className="text-slate-700 leading-relaxed">
            You have the following rights regarding your personal information:
          </p>

          <ul className="space-y-2 pl-4">
            <li className="flex gap-3">
              <span className="text-purple-600">•</span>
              <span className="text-slate-700"><strong>Access:</strong> You can request access to the personal information we hold about you</span>
            </li>
            <li className="flex gap-3">
              <span className="text-purple-600">•</span>
              <span className="text-slate-700"><strong>Correction:</strong> You can update or correct your account information through your profile settings</span>
            </li>
            <li className="flex gap-3">
              <span className="text-purple-600">•</span>
              <span className="text-slate-700"><strong>Deletion:</strong> You can request deletion of your account and associated data</span>
            </li>
            <li className="flex gap-3">
              <span className="text-purple-600">•</span>
              <span className="text-slate-700"><strong>Opt-out:</strong> You can opt out of promotional communications at any time</span>
            </li>
          </ul>
        </div>

        {/* Retention */}
        <div className="space-y-3 border-t border-white/20 pt-6">
          <h2 className="text-2xl font-bold text-slate-900">7. Data Retention</h2>

          <p className="text-slate-700 leading-relaxed">
            We retain your personal information for as long as necessary to provide our services and fulfill the purposes outlined in this Privacy Policy. When you delete your account, we delete or anonymize your personal data within 30 days, except where legal obligations require us to retain it.
          </p>
        </div>

        {/* Children's Privacy */}
        <div className="space-y-3 border-t border-white/20 pt-6">
          <h2 className="text-2xl font-bold text-slate-900">8. Children's Privacy</h2>

          <p className="text-slate-700 leading-relaxed">
            Our platform is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected personal information from a child under 13, we will take steps to delete such information promptly.
          </p>
        </div>

        {/* Policy Changes */}
        <div className="space-y-3 border-t border-white/20 pt-6">
          <h2 className="text-2xl font-bold text-slate-900">9. Changes to This Privacy Policy</h2>

          <p className="text-slate-700 leading-relaxed">
            We may update this Privacy Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes by updating the "Last updated" date at the top of this page. Your continued use of our platform following such changes constitutes your acceptance of the updated Privacy Policy.
          </p>
        </div>

        {/* Contact */}
        <div className="space-y-3 border-t border-white/20 pt-6">
          <h2 className="text-2xl font-bold text-slate-900">10. Contact Us</h2>

          <p className="text-slate-700 leading-relaxed">
            If you have questions, concerns, or requests regarding this Privacy Policy or our privacy practices, please contact us at:
          </p>

          <div className="mt-4 space-y-2 rounded-lg border border-purple-200/50 bg-purple-50/40 p-4">
            <p className="text-slate-900 font-semibold">Codamium Privacy Team</p>
            <p className="text-slate-700">Email: privacy@codamium.com</p>
            <p className="text-slate-700">Response time: We aim to respond within 7 business days</p>
          </div>
        </div>
      </div>
    </section>
  )
}
