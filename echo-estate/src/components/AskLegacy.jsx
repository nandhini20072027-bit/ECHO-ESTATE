import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, Sparkles, BookOpen, Volume2, Pause, Play } from 'lucide-react';
import { askLegacy } from '../services/api';

function Avatar({ audioRef, status, photoUrl }) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) return;
    const updateProgress = () => {
      if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioRef]);

  const togglePlay = () => {
    const audio = audioRef?.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
  };

  const avatarStyle = {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    border: '3px solid #fff',
    boxShadow: '0 4px 16px rgba(184, 111, 82, 0.2)',
    position: 'relative',
    margin: '0 auto',
    overflow: 'hidden',
    backgroundColor: '#EEE9DF',
  };

  const glowStyle = {
    position: 'absolute',
    inset: '-6px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(184, 111, 82, 0.35), transparent 70%)',
    opacity: status === 'speaking' ? 1 : 0,
    animation: status === 'speaking' ? 'pulseGlow 1.6s infinite' : 'none',
  };

  const mouthStyle = {
    position: 'absolute',
    bottom: '14%',
    left: '50%',
    width: '24%',
    height: '5%',
    background: '#25231F',
    borderRadius: '50%',
    transform: 'translateX(-50%)',
    animation: status === 'speaking' ? 'mouthMove 0.5s ease-in-out infinite alternate' : 'none',
  };

  return (
    <div className="avatar-container my-4 text-center">
      <div style={avatarStyle}>
        {photoUrl ? (
          <img src={photoUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#B86F52', fontWeight: 700, fontSize: '2rem' }}>
            ✦
          </div>
        )}
        <div style={glowStyle} />
        <div style={mouthStyle} />
      </div>
      <div className="avatar-controls flex items-center justify-center gap-2 mt-3">
        <button
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play voice'}
          className="p-1.5 rounded-full bg-cream text-clay hover:bg-clay hover:text-white transition"
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <div className="progress-bar w-24 h-1.5 bg-ink/10 rounded-full overflow-hidden">
          <div className="progress-filled h-full bg-clay transition-all duration-150" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-xs text-muted font-medium flex items-center gap-1">
          <Volume2 size={12} className="text-clay" /> Voice
        </span>
      </div>
      <style>{`
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 6px rgba(184, 111, 82, 0.3); }
          50% { box-shadow: 0 0 16px rgba(184, 111, 82, 0.6); }
          100% { box-shadow: 0 0 6px rgba(184, 111, 82, 0.3); }
        }
        @keyframes mouthMove {
          from { transform: translateX(-50%) scaleY(1); }
          to { transform: translateX(-50%) scaleY(0.4); }
        }
      `}</style>
    </div>
  );
}

const SUGGESTIONS = [
  'What were their favorite memories and hobbies?',
  'Tell me about school and college memories.',
  'What food or meals did they enjoy most?',
  'What traditions mattered most to the family?',
];

/**
 * AskLegacy — Editorial AI conversation grounded in preserved memories.
 * Calls /legacies/{legacyId}/ask and handles both WAV and MP3 Base64 audio responses.
 */
export default function AskLegacy({ legacyId = 'EST001', token, legacyPhoto, legacyName, memories = [], onSelectMemory }) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [audioUrl, setAudioUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('ready'); // ready | thinking | speaking
  const audioRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (audioUrl && audioRef.current) {
      setStatus('speaking');
      audioRef.current.play().catch(() => {
        // Autoplay may be restricted by browser until user gesture
      });
    }
  }, [audioUrl]);

  // Reset status when audio ends
  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;
    const handleEnded = () => setStatus('ready');
    audioEl.addEventListener('ended', handleEnded);
    return () => audioEl.removeEventListener('ended', handleEnded);
  }, [audioUrl]);

  // Find candidate memories referenced in an answer
  const findGroundedSources = (answerText) => {
    if (!memories || memories.length === 0 || !answerText) return [];
    const textLower = answerText.toLowerCase();

    return memories.filter((m) => {
      if (!m.title) return false;
      const titleWords = m.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const matchesTitle = textLower.includes(m.title.toLowerCase()) || titleWords.some(w => textLower.includes(w));
      return matchesTitle;
    }).slice(0, 3);
  };

  const ask = async (q) => {
    const text = (q || question).trim();
    if (!text || loading) return;
    setQuestion('');
    setLoading(true);
    setError('');
    setStatus('thinking');
    setMessages((prev) => [...prev, { role: 'user', text }]);

    try {
      const result = await askLegacy(legacyId, text, token);
      const rawAnswer = result?.answer || result?.response || '';

      const answer = rawAnswer || 'Information on this topic is not preserved in the current legacy records.';
      const sources = findGroundedSources(answer);

      setMessages((prev) => [...prev, {
        role: 'ai',
        text: answer,
        sources,
        hasSources: sources.length > 0,
      }]);

      if (result?.audio) {
        try {
          if (typeof result.audio === 'string' && (result.audio.startsWith('http://') || result.audio.startsWith('https://') || result.audio.startsWith('blob:'))) {
            setAudioUrl(result.audio);
          } else {
            const byteString = atob(result.audio);
            const byteNumbers = new Uint8Array(byteString.length);
            for (let i = 0; i < byteString.length; i++) {
              byteNumbers[i] = byteString.charCodeAt(i);
            }

            // Distinguish WAV vs MP3 format correctly
            let mime = 'audio/mpeg';
            if (result.audioFormat) {
              const fmt = String(result.audioFormat).toLowerCase().trim();
              if (fmt === 'wav' || fmt === 'audio/wav') {
                mime = 'audio/wav';
              } else if (fmt === 'mp3' || fmt === 'audio/mp3' || fmt === 'audio/mpeg') {
                mime = 'audio/mpeg';
              } else {
                mime = fmt.startsWith('audio/') ? fmt : `audio/${fmt}`;
              }
            }

            const blob = new Blob([byteNumbers], { type: mime });
            const blobUrl = URL.createObjectURL(blob);
            setAudioUrl(blobUrl);
          }
        } catch (audioErr) {
          console.warn('Audio decoding fallback:', audioErr);
        }
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to connect to the memorial assistant.');
      setStatus('ready');
    } finally {
      setLoading(false);
      setStatus('ready');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    ask();
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="ask-section card p-6 bg-white border border-ink/8 rounded-2xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-ink/6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-clay/10 flex items-center justify-center text-clay">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-ink">
              Ask AI About {legacyName || 'Preserved Memories'}
            </h3>
            <p className="text-xs text-muted">
              Grounded exclusively in stored stories, dates, and milestones
            </p>
          </div>
        </div>
        {status === 'speaking' && (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-olive/10 text-olive">
            <span className="w-2 h-2 rounded-full bg-olive animate-ping" /> Speaking
          </span>
        )}
      </div>

      {/* Conversation Thread */}
      {hasMessages && (
        <div className="mb-6 space-y-6 max-h-96 overflow-y-auto pr-2">
          {messages.map((msg, i) => (
            <div key={i} className={msg.role === 'user' ? 'msg-user text-right' : 'msg-ai text-left'}>
              <p className="text-xs font-bold uppercase tracking-widest text-muted/80 mb-1">
                {msg.role === 'user' ? 'You' : 'Echo Memorial Assistant'}
              </p>
              <div className={`p-4 rounded-2xl inline-block text-left text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-clay text-white max-w-[85%]'
                  : 'bg-parchment text-ink max-w-[95%] border border-ink/6'
              }`}>
                <p className="whitespace-pre-wrap">{msg.text}</p>

                {/* Sources linking */}
                {msg.role === 'ai' && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-ink/8">
                    <p className="text-xs font-semibold text-muted flex items-center gap-1 mb-1.5">
                      <BookOpen size={12} className="text-clay" /> Grounded Source Memories:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((src) => (
                        <button
                          key={src.memoryId || src.title}
                          type="button"
                          onClick={() => onSelectMemory && onSelectMemory(src)}
                          className="px-2.5 py-1 text-xs rounded-full bg-white border border-clay/30 text-clay font-medium hover:bg-clay hover:text-white transition"
                        >
                          {src.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Avatar speaking audio visualization */}
              {msg.role === 'ai' && audioUrl && i === messages.length - 1 && (
                <Avatar audioRef={audioRef} status={status} photoUrl={legacyPhoto} />
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Error notification */}
      {error && (
        <div className="form-message form-message-error mb-4 flex items-center justify-between text-xs">
          <span>{error}</span>
          <button onClick={() => ask()} className="font-semibold underline ml-2">
            Retry
          </button>
        </div>
      )}

      {/* Suggestions if no messages yet */}
      {!hasMessages && (
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2.5">
            Suggested questions:
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => ask(s)}
                className="text-xs px-3.5 py-2 rounded-full bg-parchment hover:bg-clay/10 hover:text-clay text-ink border border-ink/10 transition text-left"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Question composer */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center gap-2 p-1.5 rounded-full border-2 border-ink/12 bg-parchment focus-within:border-clay transition">
          <Mic size={16} className="text-muted ml-3 flex-shrink-0" />
          <input
            id="legacy-question-input"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about preserved memories…"
            aria-label="Ask about preserved memories"
            disabled={loading}
            className="flex-1 bg-transparent px-2 py-1 text-sm text-ink outline-none placeholder:text-muted/70"
          />
          <button
            type="submit"
            disabled={!question.trim() || loading}
            aria-label="Send question"
            className="w-9 h-9 rounded-full bg-clay text-white flex items-center justify-center hover:bg-[#a05e43] disabled:opacity-40 disabled:cursor-not-allowed transition flex-shrink-0"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Send size={15} />
            )}
          </button>
        </div>
        {loading && (
          <p className="mt-2 text-xs text-muted text-center animate-pulse">
            Searching DynamoDB memories and synthesizing response with Bedrock…
          </p>
        )}
      </form>

      {/* Hidden audio player */}
      {audioUrl && <audio ref={audioRef} src={audioUrl} className="sr-only" />}
    </div>
  );
}
