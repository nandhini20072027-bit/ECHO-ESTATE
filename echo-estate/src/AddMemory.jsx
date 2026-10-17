import { useState } from 'react';
import { ArrowLeft, CheckCircle2, AlertCircle, Sparkles, UploadCloud } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AppShell from './components/AppShell';
import { createMemory, getUploadUrl } from './services/api';
import { useAuth } from './services/auth.jsx';

const TYPES = ['Story', 'Photo', 'Audio', 'Letter', 'Document', 'Event', 'Milestone', 'Quote'];
const PRIVACY_OPTIONS = [
  { value: 'private', label: 'Private to me (default)' },
  { value: 'trusted', label: 'Trusted family only' },
  { value: 'approved', label: 'Approved for digital echo AI' },
];

export default function AddMemory() {
  const { accessToken, user } = useAuth();
  const navigate = useNavigate();

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [sending, setSending] = useState(false);

  // Attachment handling state
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Optional Family contributor toggle
  const [isFamilyContribution, setIsFamilyContribution] = useState(false);
  const [contributorName, setContributorName] = useState(user?.name || '');
  const [relationship, setRelationship] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setSending(true);
    setMessage('');
    setUploadError('');

    try {
      const formData = new FormData(form);

      // If an attachment was selected, upload it to S3 first via presigned URL
      if (selectedFile) {
        if (selectedFile.size > 20 * 1024 * 1024) {
          throw new Error('Attachment exceeds 20 MB limit. Please select a smaller file.');
        }

        setUploadProgress(20);
        // Request presigned URL from backend
        const { url, key } = await getUploadUrl(selectedFile.name, selectedFile.type, accessToken);
        setUploadProgress(50);

        const uploadResp = await fetch(url, {
          method: 'PUT',
          mode: 'cors',
          headers: { 'Content-Type': selectedFile.type },
          body: selectedFile,
        });

        if (!uploadResp.ok) {
          const errMsg = `Failed to upload attachment to S3 storage (Status ${uploadResp.status}).`;
          throw new Error(errMsg);
        }

        setUploadProgress(100);
        setUploadSuccess(true);

        // Append attachment metadata to the memory payload
        formData.append('attachmentKey', key);
        formData.append('attachmentName', selectedFile.name);
        formData.append('attachmentContentType', selectedFile.type);
      }

      // If family contribution
      if (isFamilyContribution) {
        formData.append('contributorName', contributorName);
        formData.append('relationship', relationship);
        formData.append('status', 'pending_approval');
      } else {
        formData.append('status', 'approved');
      }

      await createMemory(formData, accessToken);
      setMessageType('success');
      setMessage('Memory preserved successfully in your legacy archive.');
      form.reset();
      setSelectedFile(null);
      setUploadProgress(0);

      // Redirect after brief delay
      setTimeout(() => {
        navigate('/memories');
      }, 1500);
    } catch (error) {
      setMessageType('error');
      setMessage(error instanceof Error ? error.message : 'Failed to save memory.');
    } finally {
      setSending(false);
    }
  };

  return (
    <AppShell>
      <Link to="/memories" className="back-link inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink mb-6">
        <ArrowLeft size={14} /> Back to memories
      </Link>

      {/* Header */}
      <section className="mb-8 animate-fade-up">
        <p className="eyebrow flex items-center gap-1.5">
          <Sparkles size={14} /> Preserve with Intention
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">Preserve a Memory</h1>
        <p className="mt-2 body-text max-w-lg">
          Capture genuine stories, photographs, and reflections, and choose who can access them.
        </p>
      </section>

      {/* Form Card */}
      <form onSubmit={submit} className="max-w-xl card p-6 sm:p-8 animate-fade-up bg-white rounded-3xl border border-ink/8 shadow-xs">
        {/* Memory Title */}
        <div className="mb-5">
          <label className="form-label" htmlFor="title">Memory Title *</label>
          <input
            required
            id="title"
            name="title"
            className="form-input"
            placeholder="e.g. My First Day at College, Sunday Family Dinner"
          />
        </div>

        {/* Memory Type */}
        <div className="mb-5">
          <label className="form-label">Memory Type</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {TYPES.map((t) => (
              <label key={t} className="cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value={t.toLowerCase()}
                  className="sr-only"
                  defaultChecked={t === 'Story'}
                />
                <span className="inline-block px-3 py-1.5 rounded-full text-xs font-semibold border-2 border-ink/10 text-muted transition has-[:checked]:border-clay has-[:checked]:text-clay has-[:checked]:bg-clay/5 hover:border-clay/40">
                  {t}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Date */}
        <div className="mb-5">
          <label className="form-label" htmlFor="date">Date *</label>
          <input
            required
            id="date"
            name="date"
            type="date"
            className="form-input"
            defaultValue={new Date().toISOString().split('T')[0]}
          />
        </div>

        {/* Story Description */}
        <div className="mb-5">
          <label className="form-label" htmlFor="description">The Story *</label>
          <textarea
            required
            id="description"
            name="description"
            rows={5}
            className="form-input resize-y"
            placeholder="Tell the story in your own words. Small details matter…"
          />
        </div>

        {/* Privacy & Sharing Level */}
        <div className="mb-5">
          <label className="form-label" htmlFor="consent">Privacy & Sharing Permissions</label>
          <select id="consent" name="consent" className="form-input">
            {PRIVACY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <p className="text-[11px] text-muted mt-1">
            &ldquo;Approved for digital echo AI&rdquo; enables this memory to inform answers when family speaks with the AI assistant.
          </p>
        </div>

        {/* Optional S3 Attachment */}
        <div className="mb-5">
          <label className="form-label">Optional Attachment (Photo, Audio, Document)</label>
          <label className="flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed border-ink/15 hover:border-clay/50 cursor-pointer bg-parchment/60 transition" htmlFor="file">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-clay shadow-xs">
              <UploadCloud size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-ink">Choose a file to attach</p>
              <p className="text-[11px] text-muted truncate">JPG, PNG, WebP, MP3, WAV, or PDF (Max 20 MB)</p>
            </div>
            <input
              id="file"
              name="file"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf,.mp3,.wav"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setSelectedFile(file);
                setUploadSuccess(false);
                setUploadError('');
                setUploadProgress(0);
              }}
            />
          </label>

          {selectedFile && (
            <div className="mt-2.5 p-3 rounded-xl bg-parchment border border-ink/8 text-xs flex items-center justify-between">
              <span className="truncate font-medium text-ink">{selectedFile.name}</span>
              <span className="text-muted text-[11px]">{(selectedFile.size / (1024 * 1024)).toFixed(1)} MB</span>
            </div>
          )}

          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="mt-2 w-full bg-ink/10 rounded-full h-2 overflow-hidden">
              <div className="bg-clay h-full transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
            </div>
          )}

          {uploadSuccess && (
            <div className="mt-2 text-xs font-medium text-emerald-700 flex items-center gap-1">
              <CheckCircle2 size={13} /> S3 upload verified
            </div>
          )}

          {uploadError && (
            <div className="mt-2 text-xs font-medium text-red-600 flex items-center gap-1">
              <AlertCircle size={13} /> {uploadError}
            </div>
          )}
        </div>

        {/* Family Contribution Option */}
        <div className="mb-6 pt-4 border-t border-ink/8">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isFamilyContribution}
              onChange={(e) => setIsFamilyContribution(e.target.checked)}
              className="rounded text-clay focus:ring-clay"
            />
            <span className="text-xs font-semibold text-ink">Submit as a family contribution (requires owner approval)</span>
          </label>

          {isFamilyContribution && (
            <div className="mt-3 grid sm:grid-cols-2 gap-3 pl-6">
              <div>
                <label className="form-label !text-xs" htmlFor="contributor-name">Contributor Name</label>
                <input
                  id="contributor-name"
                  value={contributorName}
                  onChange={(e) => setContributorName(e.target.value)}
                  placeholder="Your Name"
                  className="form-input !text-xs !py-1.5"
                />
              </div>
              <div>
                <label className="form-label !text-xs" htmlFor="contributor-relationship">Relationship to Legacy</label>
                <input
                  id="contributor-relationship"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  placeholder="Grandchild, cousin, friend…"
                  className="form-input !text-xs !py-1.5"
                />
              </div>
            </div>
          )}
        </div>

        {/* Message Feedback */}
        {message && (
          <div className={`p-4 rounded-xl text-xs mb-5 flex items-center gap-2 ${
            messageType === 'error'
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}>
            {messageType === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
            <span>{message}</span>
          </div>
        )}

        {/* Action Button */}
        <button
          type="submit"
          disabled={sending}
          className="btn-primary w-full justify-center !py-3 shadow-xs"
        >
          {sending ? 'Preserving in Digital Estate…' : 'Preserve Memory'}
        </button>
      </form>
    </AppShell>
  );
}
