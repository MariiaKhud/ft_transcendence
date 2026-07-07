import { Link } from 'react-router-dom'

export const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative z-10 border-t border-white/20 bg-white/10 backdrop-blur-md">
      <div className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Codamium</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              A platform for sharing knowledge, building connections, and growing together as a community of developers.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-slate-600 hover:text-purple-600 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="text-slate-600 hover:text-purple-600 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-of-service" className="text-slate-600 hover:text-purple-600 transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Contact</h3>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-slate-600">Email:</span>{' '}
                <a href="mailto:contact@codamium.com" className="text-purple-600 hover:text-purple-700 transition-colors">
                  contact@codamium.com
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 border-t border-white/20 pt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-slate-600">
            © {currentYear} Codamium. All rights reserved.
          </p>
          <div className="flex gap-4 text-sm">
            <Link to="/privacy-policy" className="text-slate-600 hover:text-purple-600 transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms-of-service" className="text-slate-600 hover:text-purple-600 transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
