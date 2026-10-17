import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, Heart, MessageCircle, Plus, Sparkles, Volume2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import AppShell from './components/AppShell';
import LoadingSpinner from './components/LoadingSpinner';
import AskLegacy from './components/AskLegacy';
import { getPresignedGetUrl, setLegacyAvatar } from './services/api';
import { getLegacy, getMemories } from './services/api';
import { useAuth } from './services/auth.jsx';

const TYPE_COLORS = {
  story: 'bg-olive/10 text-olive',
  photo: 'bg-clay/10 text-clay',
  event: 'bg-blue-50 text-blue-600',
  milestone: 'bg-amber-50 text-amber-600',
  default: 'bg-cream text-muted',
};

export default function LegacyProfile() {
  const { legacyId } = useParams();
  const { accessToken } = useAuth();
  const [legacy, setLegacy] = useState(null);
  const [memories, setMemories] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('about');
  const [avatarUrl, setAvatarUrl] = useState(null);

  // Fetch presigned URL for stored avatarKey (if any)
  useEffect(() => {
    if (legacy?.avatarKey) {
      console.log('Fetching avatar URL for key', legacy.avatarKey);
      getPresignedGetUrl(legacy.avatarKey, accessToken)
        .then(url => {
          console.log('Avatar presigned URL:', url);
          setAvatarUrl(url);
        })
        .catch(err => {
          console.error('Failed to get avatar URL', err);
        });
    }
  }, [legacy, accessToken]);

  const handleSetAvatar = async (key) => {
    if (!key) {
      console.warn('No attachment key provided for avatar');
      return;
    }
    try {
      console.log('Setting avatar key', key);
      await setLegacyAvatar(legacyId, key, accessToken);
      const url = await getPresignedGetUrl(key, accessToken);
      setAvatarUrl(url);
      console.log('Avatar updated', url);
    } catch (e) {
      console.error('Failed to set avatar', e);
    }
  };

  const load = useCallback(async () => {
    setError('');
    try {
      const [legacyData, memoryData] = await Promise.all([
        getLegacy(legacyId, accessToken),
        getMemories(accessToken, legacyId),
      ]);
      setLegacy(legacyData?.legacy || legacyData);
      setMemories(memoryData);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to load this digital legacy.');
    }
  }, [accessToken, legacyId]);

  useEffect(() => { load(); }, [load]);

  if (!legacy && !error) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-24">
          <LoadingSpinner label="Opening this legacy" />
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="form-message form-message-error">
          {error}
          <button onClick={load} className="ml-2 font-semibold underline">Try again</button>
        </div>
      </AppShell>
    );
  }

  const photo = avatarUrl || legacy.photoUrl || legacy.photoKey;

  return (
    <AppShell>
      <Link to="/dashboard" className="back-link">
        <ArrowLeft size={15} /> Back to my legacies
      </Link>

      {/* ── PROFILE HERO ── */}
      <section className="card p-6 sm:p-8 mb-8 animate-fade-up">
        <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
          {/* Portrait */}
          <div className="legacy-portrait-wrap">
            {photo ? (
              <img src={photo} alt={`${legacy.name}'s portrait`} />
            ) : (
              <div className="legacy-portrait-initials">
                {legacy.name?.charAt(0) || <Heart size={28} />}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {legacy.relationship && (
              <p className="eyebrow">{legacy.relationship}</p>
            )}
            <h1 className="mt-1 text-3xl sm:text-4xl font-semibold text-ink">
              {legacy.name}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted max-w-xl">
              {legacy.description || 'A private collection of the memories that matter.'}
            </p>

            <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
              <span className="font-semibold text-ink">{memories?.length || 0} memories</span>
              {legacy.importantDates && (
                <span className="flex items-center gap-1">
                  <CalendarDays size={13} /> {legacy.importantDates}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex flex-wrap gap-2.5">
          <Link to={`/add-memory?legacyId=${encodeURIComponent(legacyId)}`} className="btn-primary !text-xs !py-2 !px-4">
            <Plus size={14} /> Add Memory
          </Link>
          <Link to="/storybook" className="btn-secondary !text-xs !py-2 !px-4">
            <Sparkles size={14} className="text-clay" /> Life Storybook
          </Link>
          <Link to="/voice-studio" className="btn-secondary !text-xs !py-2 !px-4">
            <Volume2 size={14} className="text-clay" /> Voice Studio
          </Link>
          <a href="#ai-assistant" className="btn-secondary !text-xs !py-2 !px-4">
            <MessageCircle size={14} /> Ask AI Assistant
          </a>
        </div>
      </section>

      {/* ── TABS ── */}
      <div className="flex gap-1 mb-6 bg-cream rounded-full p-1 w-fit">
        {['about', 'memories', 'ai'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-full text-sm font-semibold capitalize transition-all ${
              activeTab === tab
                ? 'bg-white text-clay shadow-sm'
                : 'text-muted hover:text-ink'
            }`}
          >
            {tab === 'ai' ? 'Ask AI' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* ── ABOUT TAB ── */}
      {activeTab === 'about' && (
        <div className="animate-fade-up space-y-5">
          {/* Description */}
          {legacy.description && (
            <section className="card p-6">
              <p className="eyebrow mb-3">About</p>
              <p className="text-sm leading-relaxed text-ink">{legacy.description}</p>
            </section>
          )}

          {/* Personality */}
          {legacy.personality && (
            <section className="card p-6">
              <p className="eyebrow mb-3">Personality</p>
              <p className="text-sm leading-relaxed text-ink">{legacy.personality}</p>
            </section>
          )}

          {/* Favourites */}
          {legacy.favorites && (
            <section className="card p-6">
              <p className="eyebrow mb-3">Favourite Things</p>
              <p className="text-sm leading-relaxed text-ink">{legacy.favorites}</p>
            </section>
          )}

          {/* Important dates */}
          {legacy.importantDates && (
            <section className="card p-6">
              <p className="eyebrow mb-3">Important Dates</p>
              <p className="text-sm leading-relaxed text-ink">{legacy.importantDates}</p>
            </section>
          )}

          {!legacy.description && !legacy.personality && !legacy.favorites && (
            <div className="empty-legacy">
              <Heart size={24} className="text-clay/40" />
              <h3>No details yet</h3>
              <p>Edit this legacy to add personal details.</p>
            </div>
          )}
        </div>
      )}

      {/* ── MEMORIES TAB ── */}
      {activeTab === 'memories' && (
        <div className="animate-fade-up">
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm font-semibold text-ink">
              {memories?.length || 0} memories preserved
            </p>
            <Link
              to={`/add-memory?legacyId=${encodeURIComponent(legacyId)}`}
              className="btn-secondary !py-1.5 !px-4 !text-xs"
            >
              <Plus size={13} /> Add
            </Link>
          </div>

          {(!memories || memories.length === 0) ? (
            <section className="empty-legacy">
              <CalendarDays size={24} className="text-clay/40" />
              <h3>This legacy is waiting for its first story.</h3>
              <p>Preserve a memory, a tradition, or a moment that belongs here.</p>
              <Link to={`/add-memory?legacyId=${encodeURIComponent(legacyId)}`} className="btn-primary mt-5">
                Add first memory
              </Link>
            </section>
          ) : (
            <section className="memory-timeline">
              {memories.map((memory) => {
                const typeClass = TYPE_COLORS[memory.type?.toLowerCase()] || TYPE_COLORS.default;
                return (
                  <article key={memory.memoryId || memory.id}>
                    <span className="timeline-dot" />
                    <div className="flex items-start gap-3 flex-wrap">
                      <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${typeClass}`}>
                        {memory.type || 'Memory'}
                      </span>
                      {memory.date && (
                        <span className="text-xs text-muted">{memory.date}</span>
                      )}
                    </div>
                    <h3>{memory.title || 'Untitled memory'}</h3>
                    <p>{memory.description || 'No description added.'}</p>
                    {memory.privacy && (
                      <small>{memory.privacy}</small>
                    )}
                    {memory.attachmentKey && (
                      <button onClick={() => handleSetAvatar(memory.attachmentKey)} className="btn-secondary mt-2 text-xs">
                        Set as Avatar
                      </button>
                    )}
                  </article>
                );
              })}
            </section>
          )}
        </div>
      )}

      {/* ── AI TAB ── */}
      {activeTab === 'ai' && (
        <div id="ai-assistant" className="animate-fade-up">
          <AskLegacy
            legacyId={legacyId}
            token={accessToken}
            legacyPhoto={photo}
            legacyName={legacy.name}
            memories={memories || []}
          />
        </div>
      )}
    </AppShell>
  );
}
