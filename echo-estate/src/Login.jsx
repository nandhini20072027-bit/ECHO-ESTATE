import { Navigate, Link } from 'react-router-dom';
import { useAuth } from './services/auth.jsx';
import { Heart, ShieldCheck } from 'lucide-react';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-parchment flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-up">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-clay mx-auto flex items-center justify-center">
            <Heart size={26} className="text-white" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold text-ink">Echo Estate</h1>
          <p className="mt-1 text-sm text-muted">Your memories, beautifully preserved.</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <h2 className="text-xl font-semibold text-ink text-center">Welcome back</h2>
          <p className="mt-1 text-sm text-muted text-center">
            Sign in securely to access your estate.
          </p>

          <button
            onClick={login}
            className="btn-primary w-full mt-8 justify-center"
          >
            Continue with Amazon Cognito
          </button>

          <div className="mt-5 flex items-start gap-2 p-3 rounded-xl bg-parchment">
            <ShieldCheck size={15} className="text-olive mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted leading-relaxed">
              Your account is securely managed by Amazon Cognito. Echo Estate never stores your password.
            </p>
          </div>

          <div className="mt-6 text-center">
            <Link to="/" className="text-xs text-muted hover:text-clay transition">
              ← Back to home
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}