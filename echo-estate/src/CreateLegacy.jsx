import { useState } from 'react';
import { ArrowLeft, Heart, ImagePlus, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AppShell from './components/AppShell';
import { createLegacy } from './services/api';
import { useAuth } from './services/auth.jsx';

const STEPS = [
  { num: 1, label: 'Who?' },
  { num: 2, label: 'Their story' },
  { num: 3, label: 'Portrait' },
  { num: 4, label: 'Preview' },
];

export default function CreateLegacy() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [preview, setPreview] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    name: '', relationship: '', description: '',
    personality: '', favorites: '', importantDates: '',
  });

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const choosePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setMessage('Choose a JPG, PNG, or WEBP image smaller than 5 MB.');
      e.target.value = '';
      return;
    }
    setPreview(URL.createObjectURL(file));
  };

  const submit = async () => {
    setSending(true);
    setMessage('');
    try {
      const result = await createLegacy({ ...form, voiceMode: 'synthetic' }, accessToken);
      navigate(`/legacy/${result?.legacy?.legacyId || result?.legacyId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create this digital legacy.');
    } finally {
      setSending(false);
    }
  };

  const canContinueStep1 = form.name.trim() && form.relationship.trim();

  return (
    <AppShell>
      <Link to="/dashboard" className="back-link">
        <ArrowLeft size={15} /> Back to my legacies
      </Link>

      {/* Step indicator */}
      <div className="step-indicator animate-fade-up">
        {STEPS.map((s, i) => (
          <>
            <button
              key={s.num}
              className={`step-dot ${step === s.num ? 'active' : step > s.num ? 'done' : 'pending'}`}
              onClick={() => step > s.num && setStep(s.num)}
              aria-label={`Step ${s.num}: ${s.label}`}
            >
              {step > s.num ? '✓' : s.num}
            </button>
            {i < STEPS.length - 1 && <div className="step-line" key={`line-${s.num}`} />}
          </>
        ))}
      </div>

      <div className="max-w-lg mx-auto animate-fade-up">

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div>
            <p className="eyebrow">Step 01</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">Who are you preserving?</h2>
            <p className="mt-2 body-text">Start with the person at the heart of this story.</p>
            <div className="mt-8 space-y-5">
              <div>
                <label className="form-label" htmlFor="name">Full name</label>
                <input id="name" className="form-input" placeholder="Their name" value={form.name} onChange={set('name')} required />
              </div>
              <div>
                <label className="form-label" htmlFor="relationship">Relationship</label>
                <input id="relationship" className="form-input" placeholder="Mother, mentor, friend…" value={form.relationship} onChange={set('relationship')} required />
              </div>
            </div>
            <button
              className="btn-primary mt-8 w-full justify-center"
              disabled={!canContinueStep1}
              onClick={() => setStep(2)}
            >
              Continue →
            </button>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div>
            <p className="eyebrow">Step 02</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">Tell their story.</h2>
            <p className="mt-2 body-text">Share what made them unique. You can always add more later.</p>
            <div className="mt-8 space-y-5">
              <div>
                <label className="form-label" htmlFor="description">About them</label>
                <textarea id="description" rows={4} className="form-input resize-y" placeholder="A short description of who they were…" value={form.description} onChange={set('description')} />
              </div>
              <div>
                <label className="form-label" htmlFor="personality">Personality</label>
                <input id="personality" className="form-input" placeholder="Warm, witty, patient…" value={form.personality} onChange={set('personality')} />
              </div>
              <div>
                <label className="form-label" htmlFor="favorites">Favourite things</label>
                <textarea id="favorites" rows={3} className="form-input resize-y" placeholder="Foods, songs, places, hobbies, traditions…" value={form.favorites} onChange={set('favorites')} />
              </div>
              <div>
                <label className="form-label" htmlFor="importantDates">Important dates</label>
                <input id="importantDates" className="form-input" placeholder="Born 1945 · Anniversary June 12" value={form.importantDates} onChange={set('importantDates')} />
              </div>
            </div>
            <div className="mt-8 flex gap-3">
              <button className="btn-secondary flex-1 justify-center" onClick={() => setStep(1)}>← Back</button>
              <button className="btn-primary flex-1 justify-center" onClick={() => setStep(3)}>Continue →</button>
            </div>
          </div>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && (
          <div>
            <p className="eyebrow">Step 03</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">Add their portrait.</h2>
            <p className="mt-2 body-text">A photo helps bring the legacy to life.</p>
            <div className="mt-8">
              {preview ? (
                <div className="relative rounded-2xl overflow-hidden w-48 h-48 mx-auto">
                  <img src={preview} alt="Portrait preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPreview('')}
                    className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-ink shadow"
                    aria-label="Remove photo"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="photo-placeholder h-48 max-w-xs mx-auto flex flex-col" htmlFor="photo">
                  <ImagePlus size={28} className="text-clay/50" />
                  <strong className="mt-3 text-sm">Choose a portrait</strong>
                  <span>JPG, PNG or WEBP · up to 5 MB</span>
                  <p className="text-xs text-muted/60 mt-2">Photo storage requires S3 to be configured</p>
                  <input id="photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} className="sr-only" />
                </label>
              )}
            </div>
            <div className="mt-8 flex gap-3">
              <button className="btn-secondary flex-1 justify-center" onClick={() => setStep(2)}>← Back</button>
              <button className="btn-primary flex-1 justify-center" onClick={() => setStep(4)}>Preview →</button>
            </div>
          </div>
        )}

        {/* ── STEP 4: PREVIEW ── */}
        {step === 4 && (
          <div>
            <p className="eyebrow">Step 04 — Preview</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">Your digital legacy is ready.</h2>
            <p className="mt-2 body-text">Review everything before creating.</p>

            <div className="card p-6 mt-8">
              {/* Portrait */}
              <div className="flex items-center gap-4 mb-5">
                <div className="legacy-portrait-wrap w-16 h-16 min-w-[64px]">
                  {preview ? (
                    <img src={preview} alt="Portrait" />
                  ) : (
                    <div className="legacy-portrait-initials text-2xl">
                      {form.name?.charAt(0) || <Heart size={20} />}
                    </div>
                  )}
                </div>
                <div>
                  <p className="eyebrow text-xs">{form.relationship}</p>
                  <h3 className="text-xl font-semibold text-ink">{form.name}</h3>
                </div>
              </div>

              {form.description && (
                <p className="text-sm leading-relaxed text-muted mb-3">{form.description}</p>
              )}
              {form.personality && (
                <p className="text-xs text-muted"><strong className="text-ink">Personality:</strong> {form.personality}</p>
              )}
              {form.favorites && (
                <p className="text-xs text-muted mt-1"><strong className="text-ink">Favourites:</strong> {form.favorites}</p>
              )}
              {form.importantDates && (
                <p className="text-xs text-muted mt-1"><strong className="text-ink">Dates:</strong> {form.importantDates}</p>
              )}
            </div>

            {message && (
              <div className="form-message form-message-error mt-4">{message}</div>
            )}

            <div className="mt-8 flex gap-3">
              <button className="btn-secondary flex-1 justify-center" onClick={() => setStep(3)}>← Back</button>
              <button
                className="btn-primary flex-1 justify-center"
                disabled={sending}
                onClick={submit}
              >
                {sending ? 'Creating…' : <><Heart size={15} /> Create Legacy</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
