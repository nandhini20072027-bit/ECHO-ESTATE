import { useState, useEffect, useMemo, useRef } from 'react';
import {
  BookOpen, Sparkles, ChevronLeft, ChevronRight, Download, Printer,
  Volume2, Pause, Play, Edit3, Trash2, ArrowUp, ArrowDown, Plus,
  CheckCircle2, AlertCircle, RefreshCw, Eye, FileText, ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';
import AppShell from './components/AppShell';
import LoadingSpinner from './components/LoadingSpinner';
import {
  getMemories,
  generateStorybookChapters,
  saveApprovedStorybook,
  getApprovedStorybooks,
  askLegacy
} from './services/api';
import { useAuth } from './services/auth.jsx';

const WRITING_STYLES = [
  { id: 'Warm & Nostalgic', label: 'Warm & Nostalgic', desc: 'Heartfelt, conversational tone celebrating warmth and affection.' },
  { id: 'Editorial Memoir', label: 'Editorial Memoir', desc: 'Reflective, literary biographical prose suited for formal keepsakes.' },
  { id: 'Chronological Journal', label: 'Chronological Journal', desc: 'Documentary timeline honoring milestones and specific dates.' },
  { id: 'Family Heritage', label: 'Family Heritage', desc: 'Generational focus on enduring traditions and shared values.' },
];

const COVER_THEMES = [
  { id: 'terracotta', name: 'Terracotta Classic', bg: 'bg-[#B86F52]', text: 'text-white', border: 'border-[#a05e43]' },
  { id: 'ivory', name: 'Warm Ivory', bg: 'bg-[#F7F4EE]', text: 'text-[#25231F]', border: 'border-ink/10' },
  { id: 'olive', name: 'Heritage Olive', bg: 'bg-[#7C8065]', text: 'text-white', border: 'border-[#62664e]' },
  { id: 'midnight', name: 'Midnight Legacy', bg: 'bg-[#1E293B]', text: 'text-white', border: 'border-slate-700' },
];

export default function LifeStorybook() {
  const { accessToken } = useAuth();
  const [memories, setMemories] = useState(null);
  const [loadingMemories, setLoadingMemories] = useState(true);
  const [error, setError] = useState('');

  // Workflow steps: 'select' -> 'customize' -> 'generating' -> 'editor' -> 'preview'
  const [step, setStep] = useState('select');

  // Selection
  const [selectedMemoryIds, setSelectedMemoryIds] = useState(new Set());
  const [bookTitle, setBookTitle] = useState('The Living Legacy: A Life in Stories');
  const [writingStyle, setWritingStyle] = useState('Warm & Nostalgic');
  const [coverTheme, setCoverTheme] = useState('terracotta');

  // Chapters & Generation
  const [chapters, setChapters] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeEditingChapter, setActiveEditingChapter] = useState(null);

  // Digital Book Reader State
  const [currentPage, setCurrentPage] = useState(0); // 0 is cover, 1..N are chapters

  // Audio narration
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [loadingAudio, setLoadingAudio] = useState(false);
  const audioRef = useRef(null);

  // Saved books
  const [savedBooks, setSavedBooks] = useState([]);
  const [saveNotice, setSaveNotice] = useState('');

  // Load Memories
  useEffect(() => {
    async function loadData() {
      setLoadingMemories(true);
      try {
        const mems = await getMemories(accessToken);
        const safe = Array.isArray(mems) ? mems : [];
        setMemories(safe);
        // Pre-select all memories by default
        setSelectedMemoryIds(new Set(safe.map(m => m.memoryId || m.id)));

        // Load previously generated storybooks
        const books = await getApprovedStorybooks(accessToken);
        setSavedBooks(books);
        if (books.length > 0 && books[0].chapters?.length > 0) {
          setChapters(books[0].chapters);
          setBookTitle(books[0].title || 'The Living Legacy: A Life in Stories');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load memories for storybook.');
      } finally {
        setLoadingMemories(false);
      }
    }
    loadData();
  }, [accessToken]);

  // Selected Memory objects
  const selectedMemories = useMemo(() => {
    if (!memories) return [];
    return memories.filter(m => selectedMemoryIds.has(m.memoryId || m.id));
  }, [memories, selectedMemoryIds]);

  const toggleSelectMemory = (id) => {
    setSelectedMemoryIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (!memories) return;
    if (selectedMemoryIds.size === memories.length) {
      setSelectedMemoryIds(new Set());
    } else {
      setSelectedMemoryIds(new Set(memories.map(m => m.memoryId || m.id)));
    }
  };

  // Generate Chapters using Bedrock AI
  const handleGenerateStorybook = async () => {
    if (selectedMemories.length === 0) return;
    setIsGenerating(true);
    setStep('generating');
    setError('');

    try {
      const generated = await generateStorybookChapters(selectedMemories, writingStyle, accessToken);
      setChapters(generated);
      setStep('editor');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate storybook chapters.');
      setStep('customize');
    } finally {
      setIsGenerating(false);
    }
  };

  // Reordering Chapters
  const moveChapter = (idx, direction) => {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= chapters.length) return;
    const updated = [...chapters];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    // update chapter numbers
    setChapters(updated.map((c, i) => ({ ...c, number: i + 1 })));
  };

  const removeChapter = (id) => {
    const updated = chapters.filter(c => c.id !== id).map((c, i) => ({ ...c, number: i + 1 }));
    setChapters(updated);
  };

  const saveChapterEdit = (id, newTitle, newContent) => {
    setChapters(prev => prev.map(c => c.id === id ? { ...c, title: newTitle, content: newContent } : c));
    setActiveEditingChapter(null);
  };

  // Persist Storybook
  const handleSaveBook = async () => {
    const bookRecord = {
      id: `book_${Date.now()}`,
      title: bookTitle,
      writingStyle,
      coverTheme,
      chapters,
      createdAt: new Date().toISOString(),
      memoryCount: selectedMemories.length,
    };
    await saveApprovedStorybook(bookRecord, accessToken);
    setSavedBooks(prev => [bookRecord, ...prev]);
    setSaveNotice('Storybook saved successfully to your digital archive.');
    setTimeout(() => setSaveNotice(''), 4000);
  };

  // Generate Narration Audio for active chapter
  const handleNarrateChapter = async (text) => {
    if (isPlayingAudio && audioRef.current) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
      return;
    }

    if (audioUrl && audioRef.current) {
      audioRef.current.play().catch(() => {});
      setIsPlayingAudio(true);
      return;
    }

    setLoadingAudio(true);
    try {
      const result = await askLegacy('EST001', `Please read and narrate this storybook chapter:\n${text.slice(0, 400)}`, accessToken);
      if (result?.audio) {
        const byteString = atob(result.audio);
        const byteNumbers = new Uint8Array(byteString.length);
        for (let i = 0; i < byteString.length; i++) {
          byteNumbers[i] = byteString.charCodeAt(i);
        }
        const mime = result.audioFormat ? `audio/${result.audioFormat}` : 'audio/mpeg';
        const blob = new Blob([byteNumbers], { type: mime });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setIsPlayingAudio(true);
      }
    } catch (err) {
      console.warn('Narration error:', err);
    } finally {
      setLoadingAudio(false);
    }
  };

  // Browser Print / PDF Export
  const handlePrintPdf = () => {
    window.print();
  };

  const selectedTheme = COVER_THEMES.find(t => t.id === coverTheme) || COVER_THEMES[0];

  return (
    <AppShell>
      {/* ── HEADER ── */}
      <section className="mb-6 animate-fade-up print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link to="/memories" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink mb-2">
              <ArrowLeft size={13} /> Back to memories
            </Link>
            <h1 className="text-3xl font-semibold text-ink flex items-center gap-2">
              <BookOpen size={28} className="text-clay" /> AI Life Storybook Generator
            </h1>
            <p className="mt-1 text-sm text-muted max-w-xl">
              Turn preserved memories into an editable, beautifully formatted biographical memoir grounded strictly in real life moments.
            </p>
          </div>

          {/* Stepper buttons */}
          <div className="flex items-center gap-2">
            {step === 'editor' && (
              <>
                <button onClick={() => setStep('preview')} className="btn-secondary !py-2 !px-4 !text-xs">
                  <Eye size={14} /> Preview Digital Book
                </button>
                <button onClick={handleSaveBook} className="btn-primary !py-2 !px-4 !text-xs">
                  Save Storybook
                </button>
              </>
            )}
            {step === 'preview' && (
              <>
                <button onClick={() => setStep('editor')} className="btn-secondary !py-2 !px-4 !text-xs">
                  <Edit3 size={14} /> Back to Editor
                </button>
                <button onClick={handlePrintPdf} className="btn-primary !py-2 !px-4 !text-xs">
                  <Printer size={14} /> Export / Download PDF
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Save Notification */}
      {saveNotice && (
        <div className="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 print:hidden">
          <CheckCircle2 size={15} /> {saveNotice}
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2 print:hidden">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* ── STEP 1: SELECT MEMORIES ── */}
      {step === 'select' && (
        <section className="space-y-6 animate-fade-up print:hidden">
          <div className="p-6 bg-white rounded-3xl border border-ink/8 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-ink/6">
              <div>
                <span className="eyebrow">Step 1 of 3</span>
                <h3 className="text-lg font-semibold text-ink mt-0.5">Select Memories to Include</h3>
                <p className="text-xs text-muted">
                  Choose which stories, photos, and recordings will ground the biographical chapters.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSelectAll}
                  className="text-xs font-semibold text-clay hover:underline"
                >
                  {selectedMemoryIds.size === (memories?.length || 0) ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  disabled={selectedMemoryIds.size === 0}
                  onClick={() => setStep('customize')}
                  className="btn-primary !py-2 !px-5 !text-xs"
                >
                  Continue ({selectedMemoryIds.size}) <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {loadingMemories ? (
              <div className="py-20 flex justify-center">
                <LoadingSpinner label="Loading memory archive" />
              </div>
            ) : !memories || memories.length === 0 ? (
              <div className="py-12 text-center text-muted text-sm">
                No memories found in estate. Please add memories first.
              </div>
            ) : (
              <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {memories.map((m) => {
                  const id = m.memoryId || m.id;
                  const isChecked = selectedMemoryIds.has(id);
                  return (
                    <div
                      key={id}
                      onClick={() => toggleSelectMemory(id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                        isChecked
                          ? 'border-clay bg-clay/5 ring-1 ring-clay/30'
                          : 'border-ink/8 bg-parchment hover:border-clay/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-1 rounded text-clay focus:ring-clay"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-clay block">
                          {m.type || 'Memory'}
                        </span>
                        <h4 className="font-semibold text-ink text-sm truncate">{m.title}</h4>
                        <p className="text-xs text-muted line-clamp-2 mt-1">{m.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── STEP 2: CUSTOMIZE STORYBOOK ── */}
      {step === 'customize' && (
        <section className="max-w-2xl mx-auto space-y-6 animate-fade-up print:hidden">
          <div className="p-7 bg-white rounded-3xl border border-ink/8 shadow-xs">
            <span className="eyebrow">Step 2 of 3</span>
            <h3 className="text-xl font-semibold text-ink mt-0.5">Customize Your Life Storybook</h3>
            <p className="text-xs text-muted mt-1">
              Configure the title, literary writing style, and book presentation.
            </p>

            <div className="mt-6 space-y-5">
              {/* Title */}
              <div>
                <label className="form-label" htmlFor="storybook-title">Storybook Title</label>
                <input
                  id="storybook-title"
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  className="form-input text-sm"
                  placeholder="e.g. Echoes of a Journey"
                  required
                />
              </div>

              {/* Writing Style */}
              <div>
                <label className="form-label">Literary Writing Style</label>
                <div className="grid sm:grid-cols-2 gap-3 mt-1.5">
                  {WRITING_STYLES.map((ws) => (
                    <button
                      key={ws.id}
                      type="button"
                      onClick={() => setWritingStyle(ws.id)}
                      className={`p-3.5 rounded-2xl text-left border transition ${
                        writingStyle === ws.id
                          ? 'border-clay bg-clay/5 ring-1 ring-clay/40'
                          : 'border-ink/10 hover:border-clay/40 bg-parchment'
                      }`}
                    >
                      <span className="font-semibold text-sm text-ink block">{ws.label}</span>
                      <span className="text-xs text-muted block mt-1 leading-snug">{ws.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cover Theme */}
              <div>
                <label className="form-label">Cover Theme & Color</label>
                <div className="flex flex-wrap gap-2.5 mt-1.5">
                  {COVER_THEMES.map((th) => (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => setCoverTheme(th.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold border transition ${
                        coverTheme === th.id
                          ? 'border-clay ring-2 ring-clay/40 shadow-xs'
                          : 'border-ink/10 bg-white hover:border-clay/40'
                      }`}
                    >
                      {th.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-ink/8 flex items-center justify-between">
                <button onClick={() => setStep('select')} className="btn-secondary !text-xs !py-2 !px-4">
                  <ChevronLeft size={14} /> Back
                </button>
                <button onClick={handleGenerateStorybook} className="btn-primary !text-xs !py-2 !px-5">
                  <Sparkles size={14} /> Generate Chapters with Bedrock AI
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── STEP: GENERATING STATE ── */}
      {step === 'generating' && (
        <div className="h-[400px] bg-white rounded-3xl border border-ink/8 flex flex-col items-center justify-center animate-fade-up print:hidden">
          <LoadingSpinner label="Bedrock AI is synthesizing biographical chapters" />
          <p className="mt-2 text-xs text-muted max-w-sm text-center">
            Structuring authentic stories into cohesive chapters. No facts or dates are fabricated.
          </p>
        </div>
      )}

      {/* ── STEP 3: CHAPTER EDITOR ── */}
      {step === 'editor' && (
        <section className="space-y-6 animate-fade-up print:hidden">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <span className="eyebrow">Step 3 of 3 · Editorial Review</span>
              <h2 className="text-2xl font-semibold text-ink mt-0.5">{bookTitle}</h2>
              <p className="text-xs text-muted">
                Review, reorder, edit, or regenerate individual chapters before exporting.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const newChap = {
                    id: `chap_${Date.now()}`,
                    number: chapters.length + 1,
                    title: 'New Chapter',
                    content: 'Write your story in your own words…',
                    memoriesReferenced: [],
                  };
                  setChapters(prev => [...prev, newChap]);
                }}
                className="btn-secondary !py-2 !px-3 !text-xs"
              >
                <Plus size={14} /> Add Chapter
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {chapters.map((chap, idx) => (
              <div
                key={chap.id}
                className="p-6 bg-white rounded-3xl border border-ink/8 shadow-2xs hover:border-ink/15 transition"
              >
                {activeEditingChapter === chap.id ? (
                  /* Editing Mode */
                  <div className="space-y-3">
                    <input
                      id={`chap-title-${chap.id}`}
                      defaultValue={chap.title}
                      className="form-input font-semibold text-base"
                    />
                    <textarea
                      id={`chap-content-${chap.id}`}
                      defaultValue={chap.content}
                      rows={6}
                      className="form-input text-sm leading-relaxed resize-y"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setActiveEditingChapter(null)}
                        className="btn-secondary !text-xs !py-1.5 !px-3"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          const title = document.getElementById(`chap-title-${chap.id}`)?.value || chap.title;
                          const content = document.getElementById(`chap-content-${chap.id}`)?.value || chap.content;
                          saveChapterEdit(chap.id, title, content);
                        }}
                        className="btn-primary !text-xs !py-1.5 !px-4"
                      >
                        Save Chapter
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Display Mode */
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-clay/10 text-clay text-xs font-bold flex items-center justify-center">
                          {chap.number}
                        </span>
                        <h3 className="text-lg font-semibold text-ink">{chap.title}</h3>
                      </div>

                      <div className="flex items-center gap-1 text-muted">
                        <button
                          onClick={() => moveChapter(idx, -1)}
                          disabled={idx === 0}
                          className="p-1 hover:text-ink disabled:opacity-30"
                          title="Move up"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          onClick={() => moveChapter(idx, 1)}
                          disabled={idx === chapters.length - 1}
                          className="p-1 hover:text-ink disabled:opacity-30"
                          title="Move down"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          onClick={() => setActiveEditingChapter(chap.id)}
                          className="p-1 hover:text-clay"
                          title="Edit text"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => removeChapter(chap.id)}
                          className="p-1 hover:text-red-500"
                          title="Remove chapter"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <p className="text-sm leading-relaxed text-ink/90 whitespace-pre-wrap pl-8">
                      {chap.content}
                    </p>

                    {chap.memoriesReferenced && chap.memoriesReferenced.length > 0 && (
                      <div className="mt-3 pl-8 flex items-center gap-2 text-[11px] text-muted">
                        <span className="font-semibold">Grounded in:</span>
                        <span className="italic">{chap.memoriesReferenced.join(', ')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── STEP 4: DIGITAL BOOK READER & PRINTABLE PDF PREVIEW ── */}
      {step === 'preview' && (
        <section className="space-y-6 animate-fade-up">
          {/* Reader Top Bar (Hidden when printing) */}
          <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-ink/8 print:hidden">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted">
                {currentPage === 0 ? 'Cover Page' : `Chapter ${currentPage} of ${chapters.length}`}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 0))}
                disabled={currentPage === 0}
                className="btn-secondary !py-1.5 !px-3 !text-xs disabled:opacity-30"
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, chapters.length))}
                disabled={currentPage === chapters.length}
                className="btn-secondary !py-1.5 !px-3 !text-xs disabled:opacity-30"
              >
                Next <ChevronRight size={14} />
              </button>

              {/* Narration audio trigger */}
              {currentPage > 0 && chapters[currentPage - 1] && (
                <button
                  onClick={() => handleNarrateChapter(chapters[currentPage - 1].content)}
                  disabled={loadingAudio}
                  className="btn-secondary !py-1.5 !px-3 !text-xs text-clay"
                  title="Listen with Qwen3-TTS / Cartesia audio"
                >
                  {loadingAudio ? (
                    <span className="animate-spin text-xs">⏳</span>
                  ) : isPlayingAudio ? (
                    <Pause size={13} />
                  ) : (
                    <Play size={13} />
                  )}
                  {isPlayingAudio ? 'Pause Narration' : 'Narrate Chapter'}
                </button>
              )}
            </div>
          </div>

          {/* ── SCREEN BOOK VIEW (Interactive single/two page) ── */}
          <div className="print:hidden max-w-3xl mx-auto">
            {currentPage === 0 ? (
              /* Cover Page */
              <div className={`aspect-[3/4] p-12 rounded-3xl shadow-xl flex flex-col justify-between border-4 ${selectedTheme.bg} ${selectedTheme.text} ${selectedTheme.border}`}>
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest opacity-80">Echo Estate Digital Life Storybook</p>
                  <p className="text-sm opacity-90 italic">{writingStyle} Collection</p>
                </div>
                <div className="my-auto text-center space-y-4">
                  <h1 className="text-4xl font-serif font-bold tracking-tight leading-tight">{bookTitle}</h1>
                  <div className="w-16 h-0.5 bg-white/40 mx-auto" />
                  <p className="text-sm opacity-90">Preserved for future generations</p>
                </div>
                <div className="flex justify-between items-end text-xs opacity-70">
                  <span>EST001 Archive</span>
                  <span>{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</span>
                </div>
              </div>
            ) : (
              /* Chapter Page */
              <div className="min-h-[550px] p-12 bg-white rounded-3xl border border-ink/8 shadow-md flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-ink/6 mb-6">
                    <span className="text-xs font-bold uppercase tracking-widest text-clay">
                      Chapter {chapters[currentPage - 1]?.number}
                    </span>
                    <span className="text-xs text-muted">Echo Estate Storybook</span>
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-ink mb-4">
                    {chapters[currentPage - 1]?.title}
                  </h2>
                  <p className="text-base font-serif leading-relaxed text-ink/90 whitespace-pre-wrap">
                    {chapters[currentPage - 1]?.content}
                  </p>
                </div>
                <div className="pt-8 text-center text-xs text-muted/60">
                  Page {currentPage}
                </div>
              </div>
            )}
          </div>

          {/* ── PRINT-OPTIMIZED DOCUMENT FORMAT (Used during PDF Export) ── */}
          <div className="hidden print:block print:space-y-12">
            {/* Print Cover */}
            <div className="h-screen flex flex-col justify-between p-16 text-center border-4 border-ink">
              <p className="text-sm uppercase tracking-widest">Echo Estate Life Storybook</p>
              <h1 className="text-5xl font-bold my-auto">{bookTitle}</h1>
              <p className="text-xs text-muted">Archive EST001 · Grounded Life History</p>
            </div>

            {/* Print All Chapters Sequentially */}
            {chapters.map((ch) => (
              <div key={ch.id} className="min-h-screen p-12 space-y-6 border-b border-ink/20 page-break">
                <span className="text-xs font-bold uppercase text-clay block">Chapter {ch.number}</span>
                <h2 className="text-3xl font-bold">{ch.title}</h2>
                <p className="text-base leading-relaxed whitespace-pre-wrap font-serif">{ch.content}</p>
              </div>
            ))}
          </div>

          {/* Hidden audio element */}
          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setIsPlayingAudio(false)}
              className="sr-only"
            />
          )}
        </section>
      )}
    </AppShell>
  );
}
