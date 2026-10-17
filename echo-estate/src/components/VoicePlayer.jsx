import { Pause, Play, Volume2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { textToSpeech } from '../services/api';

export default function VoicePlayer({ text, token }) {
  const audioRef = useRef(null); const [url, setUrl] = useState(''); const [loading, setLoading] = useState(false); const [playing, setPlaying] = useState(false); const [error, setError] = useState('');
  const listen = async () => { if (url && audioRef.current) { if (playing) audioRef.current.pause(); else await audioRef.current.play(); return; } setLoading(true); setError(''); try { const result = await textToSpeech(text, token); const audioUrl = result?.audioUrl || result?.url; if (!audioUrl) throw new Error('Voice generation is not configured yet.'); setUrl(audioUrl); } catch (failure) { console.error('Voice generation error:', failure); setError(failure instanceof Error ? failure.message : 'Unable to generate a synthetic memorial voice.'); } finally { setLoading(false); } };
  return <div className="voice-player"><button onClick={listen} disabled={loading} className="quiet-button !px-3 !py-2 text-xs">{playing ? <Pause size={15} /> : url ? <Play size={15} /> : <Volume2 size={15} />}{loading ? 'Generating voice...' : playing ? 'Pause' : 'Listen'}</button>{url && <audio ref={audioRef} src={url} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />}{error && <p className="text-xs text-amber-200">{error}</p>}<p className="text-xs text-stone-500">AI-generated synthetic memorial voice</p></div>;
}
