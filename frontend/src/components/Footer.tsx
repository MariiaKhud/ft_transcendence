import { Link } from 'react-router-dom'

export const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative z-10 border-t border-white/20 bg-white/10 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-slate-600">
            © {currentYear} Codamium. All rights reserved.
        </p>
        <nav aria-label="Footer links" className="flex items-center gap-4 text-sm">
          <Link to="/privacy-policy" className="text-slate-600 transition-colors hover:text-purple-600">
            Privacy Policy
          </Link>
          <Link to="/terms-of-service" className="text-slate-600 transition-colors hover:text-purple-600">
            Terms of Service
          </Link>
          <a
            href="https://github.com/MariiaKhud/ft_transcendence/tree/main"
            target="_blank"
            rel="noreferrer"
            className="text-slate-600 transition-colors hover:text-purple-600"
          >
            GitHub repo
          </a>
        </nav>
      </div>
    </footer>
  )
}
