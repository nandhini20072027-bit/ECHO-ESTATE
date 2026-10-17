import { Mail, ShieldCheck, UserRound, LogOut, Volume2, Share2, Sparkles, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import AppShell from './components/AppShell';
import { useAuth } from './services/auth.jsx';

export default function Profile() {
  const { user, logout } = useAuth();
  const name = user?.name || [user?.given_name, user?.family_name].filter(Boolean).join(' ') || 'Echo Estate member';
  const email = user?.email || 'Email not provided';
  const initial = name.charAt(0).toUpperCase();

  return (
    <AppShell>
      <section className="mb-8 animate-fade-up">
        <p className="eyebrow">Account & Studio</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">Your Profile</h1>
      </section>

      <div className="grid gap-5 max-w-2xl animate-fade-up">
        {/* Profile card */}
        <div className="card p-7">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-cream flex items-center justify-center text-2xl font-bold text-clay border-2 border-white shadow-sm flex-shrink-0">
              {initial}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-ink">{name}</h2>
              <p className="flex items-center gap-1.5 text-sm text-muted mt-0.5">
                <Mail size={13} /> {email}
              </p>
            </div>
          </div>

          <div className="mt-6 border-t border-ink/8 pt-5 space-y-3">
            <p className="eyebrow text-xs">Account provider</p>
            <p className="text-sm text-ink font-medium">Amazon Cognito secure account</p>
            {user?.sub && (
              <p className="text-xs text-muted break-all">User ID: {user.sub}</p>
            )}
          </div>
        </div>

        {/* AI Digital Legacy Tools Card */}
        <div className="card p-7 space-y-4">
          <h2 className="text-base font-semibold text-ink flex items-center gap-2">
            <Sparkles size={17} className="text-clay" /> AI Digital Legacy Tools
          </h2>
          <div className="grid sm:grid-cols-2 gap-3 pt-1">
            <Link
              to="/voice-studio"
              className="p-4 rounded-2xl bg-parchment hover:bg-clay/5 border border-ink/8 hover:border-clay/30 transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-clay shadow-xs">
                  <Volume2 size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-ink group-hover:text-clay transition">Voice Studio</h3>
                  <p className="text-[11px] text-muted">Reference audio & cloning</p>
                </div>
              </div>
              <ChevronRight size={14} className="text-muted group-hover:text-clay" />
            </Link>

            <Link
              to="/memory-graph"
              className="p-4 rounded-2xl bg-parchment hover:bg-clay/5 border border-ink/8 hover:border-clay/30 transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-clay shadow-xs">
                  <Share2 size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-ink group-hover:text-clay transition">Memory Graph</h3>
                  <p className="text-[11px] text-muted">Interactive knowledge map</p>
                </div>
              </div>
              <ChevronRight size={14} className="text-muted group-hover:text-clay" />
            </Link>
          </div>
        </div>

        {/* Privacy card */}
        <div className="card p-7">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-cream flex items-center justify-center">
              <ShieldCheck size={17} className="text-olive" />
            </div>
            <h2 className="text-base font-semibold text-ink">Privacy & Permissions</h2>
          </div>
          <p className="text-sm leading-relaxed text-muted">
            Your identity and sign-in information are managed securely by Cognito. Memory-level consent is selected whenever you add a memory.
          </p>
          <div className="mt-5 border-t border-ink/8 pt-5">
            <div className="flex items-start gap-3">
              <UserRound size={16} className="text-clay mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-ink">Authenticated identity</h3>
                <p className="mt-0.5 text-sm text-muted leading-relaxed">
                  Name, email, and account ID are read from your Cognito ID token. Tokens and private memories are protected.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm font-medium text-red-500 hover:text-red-600 transition w-fit"
        >
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </AppShell>
  );
}
