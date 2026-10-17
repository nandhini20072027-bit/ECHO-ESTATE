import { Link, NavLink, useNavigate } from 'react-router-dom';
import { BookOpen, UserRound, Plus, Home, LogOut, Share2, Sparkles, Volume2 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../services/auth.jsx';

const navLinks = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/memories', label: 'Memories', icon: BookOpen },
  { to: '/memory-graph', label: 'Graph', icon: Share2 },
  { to: '/storybook', label: 'Storybook', icon: Sparkles },
  { to: '/voice-studio', label: 'Voice Studio', icon: Volume2 },
  { to: '/profile', label: 'Profile', icon: UserRound },
];

const bottomLinks = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/memories', label: 'Memories', icon: BookOpen },
  { to: '/memory-graph', label: 'Graph', icon: Share2 },
  { to: '/storybook', label: 'Book', icon: Sparkles },
  { to: '/profile', label: 'Profile', icon: UserRound },
];

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const initial = (user?.given_name || user?.name || 'E').charAt(0).toUpperCase();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); };

  const activeClass = 'text-clay font-semibold';
  const inactiveClass = 'text-muted hover:text-ink';

  return (
    <>
      {/* ── Desktop floating top nav ── */}
      <nav
        className="floating-nav hidden md:flex gap-1"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 font-semibold text-ink mr-4 text-sm"
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-clay text-white text-xs font-bold">
            E
          </span>
          Echo Estate
        </Link>

        {isAuthenticated ? (
          <>
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={label}
                to={to}
                end={to === '/dashboard'}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-full text-xs font-medium transition ${isActive ? activeClass + ' bg-parchment' : inactiveClass}`
                }
              >
                {label}
              </NavLink>
            ))}

            {/* Add memory quick link */}
            <Link
              to="/add-memory"
              className="ml-2 flex items-center gap-1.5 rounded-full bg-clay px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[#a05e43]"
            >
              <Plus size={13} /> Add
            </Link>

            {/* Avatar dropdown */}
            <div className="relative ml-2">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="grid h-8 w-8 place-items-center rounded-full bg-cream border border-ink/10 text-xs font-bold text-clay transition hover:ring-2 hover:ring-clay/30"
                aria-label="Account menu"
                aria-expanded={menuOpen}
              >
                {initial}
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-10 w-48 rounded-2xl bg-white border border-ink/8 shadow-lg py-2 text-xs">
                  <Link
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-ink hover:bg-parchment rounded-xl mx-1"
                  >
                    <UserRound size={14} /> Profile
                  </Link>
                  <Link
                    to="/voice-studio"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-ink hover:bg-parchment rounded-xl mx-1"
                  >
                    <Volume2 size={14} /> Voice Studio
                  </Link>
                  <Link
                    to="/memory-graph"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-ink hover:bg-parchment rounded-xl mx-1"
                  >
                    <Share2 size={14} /> Memory Graph
                  </Link>
                  <Link
                    to="/storybook"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-ink hover:bg-parchment rounded-xl mx-1"
                  >
                    <Sparkles size={14} /> Life Storybook
                  </Link>
                  <div className="my-1 border-t border-ink/6" />
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 rounded-xl mx-1"
                  >
                    <LogOut size={14} /> Log out
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link to="/login" className="px-4 py-1.5 text-xs text-muted hover:text-ink rounded-full transition">
              Log in
            </Link>
            <Link to="/login" className="btn-primary !px-4 !py-1.5 !text-xs ml-2">
              Get started
            </Link>
          </>
        )}
      </nav>

      {/* ── Mobile floating bottom nav ── */}
      {isAuthenticated && (
        <nav
          className="bottom-nav md:hidden"
          aria-label="Mobile navigation"
        >
          {bottomLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={label}
              to={to}
              end={to === '/dashboard'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 text-[10px] transition ${isActive ? 'text-clay font-bold' : 'text-muted'}`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      )}

      {/* Overlay to close menu */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setMenuOpen(false)}
          aria-hidden
        />
      )}
    </>
  );
}
