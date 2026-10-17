import { useCallback, useEffect, useState } from 'react';
import { Plus, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import AppShell from './components/AppShell';
import LoadingSpinner from './components/LoadingSpinner';
import { deleteLegacy, getLegacies } from './services/api';
import { useAuth } from './services/auth.jsx';

export default function Dashboard() {
  const { accessToken, user } = useAuth();
  const [legacies, setLegacies] = useState(null);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setLegacies(await getLegacies(accessToken));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to load your digital legacies.');
    }
  }, [accessToken]);

  useEffect(() => { load(); }, [load]);

  const remove = async (legacy) => {
    const id = legacy.legacyId || legacy.id;
    if (!id || !window.confirm(`Delete "${legacy.name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await deleteLegacy(id, accessToken);
      setLegacies((cur) => cur.filter((l) => (l.legacyId || l.id) !== id));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to delete this legacy.');
    } finally {
      setDeleting('');
    }
  };

  const name = user?.given_name || user?.name?.split(' ')[0] || '';

  return (
    <AppShell>
      {/* Greeting */}
      <section className="mb-10 animate-fade-up">
        <p className="eyebrow">Welcome back{name ? `, ${name}` : ''}</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">Your digital legacies</h1>
        <p className="mt-2 body-text max-w-lg">
          Preserve the people, stories and moments that matter.
        </p>
      </section>

      {/* Top action */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-base font-semibold text-ink">Legacies</h2>
        <Link to="/legacies/new" className="btn-primary">
          <Plus size={16} /> Create legacy
        </Link>
      </div>

      {/* Loading */}
      {legacies === null && !error && (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner label="Loading your legacies" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="form-message form-message-error">
          {error}
          <button onClick={load} className="ml-2 font-semibold underline">Try again</button>
        </div>
      )}

      {/* Empty */}
      {Array.isArray(legacies) && legacies.length === 0 && (
        <section className="empty-legacy animate-fade-up">
          <Heart size={28} className="text-clay/40" />
          <p className="eyebrow mt-4">A place to begin</p>
          <h3>Your first legacy starts with a memory.</h3>
          <p>Create a private digital legacy and build it slowly, in your own words.</p>
          <Link to="/legacies/new" className="btn-primary mt-6">
            Create your first legacy
          </Link>
        </section>
      )}

      {/* Legacy cards */}
      {Array.isArray(legacies) && legacies.length > 0 && (
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 animate-fade-up">
          {legacies.map((legacy) => {
            const id = legacy.legacyId || legacy.id;
            const photo = legacy.photoUrl || legacy.photoKey;
            return (
              <article key={id} className="card group hover:-translate-y-1 transition-transform duration-200">
                {/* Photo area */}
                <div className="relative h-44 bg-cream overflow-hidden">
                  {photo ? (
                    <img
                      src={photo}
                      alt={`${legacy.name}'s portrait`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-white border-2 border-clay/20 flex items-center justify-center text-2xl font-bold text-clay">
                        {legacy.name?.charAt(0) || <Heart size={20} />}
                      </div>
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-clay bg-white/90 rounded-full px-3 py-1">
                      {legacy.relationship || 'Digital legacy'}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="p-5">
                  <h2 className="text-lg font-semibold text-ink">{legacy.name || 'Untitled legacy'}</h2>
                  <p className="mt-1 text-sm text-muted line-clamp-2 leading-relaxed">
                    {legacy.description || 'A private collection of stories and moments.'}
                  </p>

                  <div className="mt-3 flex items-center justify-between text-xs text-muted/70">
                    <span>{legacy.memoryCount ?? legacy.memoriesCount ?? 0} memories</span>
                    {legacy.updatedAt && (
                      <span>Updated {new Date(legacy.updatedAt).toLocaleDateString()}</span>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Link to={`/legacy/${id}`} className="btn-primary flex-1 justify-center !py-2">
                      Open legacy
                    </Link>
                    <button
                      aria-label={`Delete ${legacy.name}`}
                      disabled={deleting === id}
                      onClick={() => remove(legacy)}
                      className="icon-btn text-red-400 hover:border-red-300 hover:text-red-500"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </AppShell>
  );
}
