import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen, Plus, Trash2, X, CalendarDays, Search, ArrowUpDown,
  Sparkles, Image, Mic, FileText, CheckCircle2, AlertCircle,
  Clock, UserCheck, Share2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import AppShell from './components/AppShell';
import LoadingSpinner from './components/LoadingSpinner';
import AskLegacy from './components/AskLegacy';
import {
  deleteMemory,
  getMemories,
  createMemory,
  getUploadUrl,
  summarizeMemories
} from './services/api';
import { useAuth } from './services/auth.jsx';

const displayDate = (v) => {
  if (!v) return null;
  const dateObj = new Date(v);
  if (isNaN(dateObj.getTime())) return String(v);
  return dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const privacyLabel = (v) => ({
  private: 'Private to me',
  trusted: 'Trusted family',
  approved: 'Approved for digital echo',
}[v] || v || 'Private to me');

const privacyBadgeClass = (v) => ({
  private: 'bg-ink/5 text-muted border-ink/10',
  trusted: 'bg-blue-50 text-blue-700 border-blue-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}[v] || 'bg-ink/5 text-muted border-ink/10');

const TYPE_COLORS = {
  story: 'bg-olive/10 text-olive border-olive/20',
  photo: 'bg-clay/10 text-clay border-clay/20',
  audio: 'bg-purple-50 text-purple-700 border-purple-200',
  letter: 'bg-amber-50 text-amber-700 border-amber-200',
  document: 'bg-sky-50 text-sky-700 border-sky-200',
  event: 'bg-blue-50 text-blue-600 border-blue-200',
  milestone: 'bg-amber-50 text-amber-600 border-amber-200',
  quote: 'bg-rose-50 text-rose-700 border-rose-200',
  default: 'bg-cream text-muted border-ink/10',
};

const CATEGORIES = [
  { id: 'all', label: 'All Types' },
  { id: 'story', label: 'Stories', icon: BookOpen },
  { id: 'photo', label: 'Photographs', icon: Image },
  { id: 'audio', label: 'Voice / Audio', icon: Mic },
  { id: 'document', label: 'Documents', icon: FileText },
  { id: 'letter', label: 'Letters', icon: FileText },
  { id: 'milestone', label: 'Milestones', icon: Sparkles },
  { id: 'event', label: 'Events', icon: CalendarDays },
];

export default function Memories() {
  const { accessToken } = useAuth();
  const [memories, setMemories] = useState(null);
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState(''); // 'network' | 'server' | 'auth' | 'general'
  const [selected, setSelected] = useState(null);

  // Deletion modal state
  const [confirmDeleteMemory, setConfirmDeleteMemory] = useState(null);
  const [deletingId, setDeletingId] = useState('');
  const [deleteNotice, setDeleteNotice] = useState('');

  // Filtering, Searching, and Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPrivacy, setSelectedPrivacy] = useState('all');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'title'
  const [activeView, setActiveView] = useState('grid'); // 'grid' | 'timeline' | 'ai' | 'contributions'

  // AI Summaries
  const [collectionSummary, setCollectionSummary] = useState('');
  const [summarizingCollection, setSummarizingCollection] = useState(false);
  const [memorySummaries, setMemorySummaries] = useState({}); // { [memoryId]: summaryText }
  const [summarizingId, setSummarizingId] = useState('');

  // Family Contributions
  const [contributions, setContributions] = useState([]);

  // Quick Add Memory Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [addSuccessMessage, setAddSuccessMessage] = useState('');
  const [savingMemory, setSavingMemory] = useState(false);

  // Load memories from backend
  const loadMemories = useCallback(async () => {
    setError('');
    setErrorType('');
    try {
      const data = await getMemories(accessToken);
      const safeArray = Array.isArray(data) ? data : [];
      setMemories(safeArray);

      // Separate any contributions or pending memories
      const pendingItems = safeArray.filter(m => m.status === 'pending_approval' || m.contributionStatus === 'pending_approval');
      setContributions(pendingItems);
    } catch (failure) {
      const msg = failure instanceof Error ? failure.message : 'Unable to load your memories.';
      setError(msg);
      if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('offline')) {
        setErrorType('network');
      } else if (msg.toLowerCase().includes('session') || msg.toLowerCase().includes('expired')) {
        setErrorType('auth');
      } else if (msg.toLowerCase().includes('server') || msg.toLowerCase().includes('500')) {
        setErrorType('server');
      } else {
        setErrorType('general');
      }
    }
  }, [accessToken]);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  // Collection breakdown counts
  const summaryCounts = useMemo(() => {
    if (!Array.isArray(memories)) return { total: 0, byType: {}, byPrivacy: {} };
    const counts = {
      total: memories.length,
      byType: {},
      byPrivacy: { private: 0, trusted: 0, approved: 0 },
    };
    memories.forEach((m) => {
      const t = (m.type || 'story').toLowerCase();
      counts.byType[t] = (counts.byType[t] || 0) + 1;

      const p = m.privacy || m.consent || 'private';
      if (counts.byPrivacy[p] !== undefined) {
        counts.byPrivacy[p]++;
      }
    });
    return counts;
  }, [memories]);

  // Filtered and Sorted Memories
  const processedMemories = useMemo(() => {
    if (!Array.isArray(memories)) return [];

    let result = [...memories];

    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter((m) => (m.type || 'story').toLowerCase() === selectedCategory.toLowerCase());
    }

    // Filter by privacy
    if (selectedPrivacy !== 'all') {
      result = result.filter((m) => (m.privacy || m.consent || 'private').toLowerCase() === selectedPrivacy.toLowerCase());
    }

    // Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((m) => {
        const title = (m.title || '').toLowerCase();
        const desc = (m.description || '').toLowerCase();
        const dateStr = (m.date || m.createdAt || '').toLowerCase();
        const typeStr = (m.type || '').toLowerCase();
        return title.includes(query) || desc.includes(query) || dateStr.includes(query) || typeStr.includes(query);
      });
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'title') {
        return (a.title || '').localeCompare(b.title || '');
      }
      const timeA = new Date(a.date || a.createdAt || 0).getTime() || 0;
      const timeB = new Date(b.date || b.createdAt || 0).getTime() || 0;
      if (sortBy === 'oldest') {
        return timeA - timeB;
      }
      // default: newest
      return timeB - timeA;
    });

    return result;
  }, [memories, selectedCategory, selectedPrivacy, searchQuery, sortBy]);

  // Chronological Timeline grouping (handles missing dates gracefully)
  const timelineGroups = useMemo(() => {
    const dated = [];
    const undated = [];

    processedMemories.forEach((memory) => {
      const rawDate = memory.date || memory.createdAt;
      if (rawDate && !isNaN(new Date(rawDate).getTime())) {
        dated.push(memory);
      } else {
        undated.push(memory);
      }
    });

    // Sort dated chronologically
    dated.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());

    // Group by year
    const groupsByYear = {};
    dated.forEach((mem) => {
      const year = new Date(mem.date || mem.createdAt).getFullYear();
      if (!groupsByYear[year]) groupsByYear[year] = [];
      groupsByYear[year].push(mem);
    });

    return { groupsByYear, undated };
  }, [processedMemories]);

  // Handle Deletion
  const handleDeleteConfirm = async () => {
    if (!confirmDeleteMemory) return;
    const memoryId = confirmDeleteMemory.memoryId || confirmDeleteMemory.id;
    if (!memoryId) return;

    setDeletingId(memoryId);
    setDeleteNotice('');
    try {
      await deleteMemory(memoryId, accessToken);
      setMemories((cur) => cur.filter((m) => (m.memoryId || m.id) !== memoryId));
      if (selected && (selected.memoryId || selected.id) === memoryId) {
        setSelected(null);
      }
      setConfirmDeleteMemory(null);
      setDeleteNotice(`"${confirmDeleteMemory.title}" has been deleted.`);
      setTimeout(() => setDeleteNotice(''), 4000);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to delete this memory.');
      setConfirmDeleteMemory(null);
    } finally {
      setDeletingId('');
    }
  };

  // Handle Collection Summarization
  const handleSummarizeCollection = async () => {
    if (!memories || memories.length === 0) return;
    setSummarizingCollection(true);
    setCollectionSummary('');
    try {
      const summaryText = await summarizeMemories(memories, accessToken);
      setCollectionSummary(summaryText);
    } catch (err) {
      console.error('Failed to summarize collection:', err);
    } finally {
      setSummarizingCollection(false);
    }
  };

  // Handle Individual Memory Summarization
  const handleSummarizeSingle = async (memory, e) => {
    if (e) e.stopPropagation();
    const id = memory.memoryId || memory.id;
    if (!id || summarizingId === id) return;

    setSummarizingId(id);
    try {
      const text = await summarizeMemories([memory], accessToken);
      setMemorySummaries((prev) => ({ ...prev, [id]: text }));
    } catch (err) {
      console.error('Failed to summarize memory:', err);
    } finally {
      setSummarizingId('');
    }
  };

  // Handle Family Contribution Approval
  const handleApproveContribution = (memory) => {
    const id = memory.memoryId || memory.id;
    setMemories((cur) =>
      cur.map((m) => ((m.memoryId || m.id) === id ? { ...m, status: 'approved', contributionStatus: 'approved' } : m))
    );
    setContributions((cur) => cur.filter((m) => (m.memoryId || m.id) !== id));
  };

  // Handle Quick Add Memory Submission
  const handleAddSubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = form.file?.files?.[0] || null;

    setSavingMemory(true);
    setUploadError('');
    setAddSuccessMessage('');
    setUploadProgress(0);

    try {
      if (file) {
        // Validate size & type
        if (file.size > 15 * 1024 * 1024) {
          throw new Error('Attachments must be smaller than 15 MB.');
        }
        setUploadProgress(20);
        const { url, key } = await getUploadUrl(file.name, file.type, accessToken);
        setUploadProgress(50);

        const uploadResp = await fetch(url, {
          method: 'PUT',
          mode: 'cors',
          headers: { 'Content-Type': file.type },
          body: file,
        });

        if (!uploadResp.ok) {
          throw new Error(`Failed to upload attachment to S3 (status ${uploadResp.status}).`);
        }
        setUploadProgress(100);

        formData.append('attachmentKey', key);
        formData.append('attachmentName', file.name);
        formData.append('attachmentContentType', file.type);
      }

      await createMemory(formData, accessToken);
      setAddSuccessMessage('Memory preserved successfully in your legacy.');
      form.reset();
      setShowAddModal(false);
      await loadMemories();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to save memory.');
    } finally {
      setSavingMemory(false);
      setUploadProgress(0);
    }
  };

  return (
    <AppShell>
      {/* ── HEADER & BREADCRUMB ── */}
      <section className="mb-6 animate-fade-up">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="eyebrow flex items-center gap-1.5">
              <Sparkles size={14} className="text-clay" /> Digital Legacy Archive
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-ink">Memories</h1>
            <p className="mt-1 text-sm text-muted max-w-xl">
              Authentic stories, audio reflections, and moments, protected by consent-based permissions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/storybook"
              className="btn-secondary !py-2.5 !px-4 !text-xs font-semibold"
            >
              <Sparkles size={14} className="text-clay" /> Create Life Storybook
            </Link>
            <Link
              to="/memory-graph"
              className="btn-secondary !py-2.5 !px-3.5 !text-xs font-semibold"
              title="Explore relationship graph"
            >
              <Share2 size={14} /> Memory Graph
            </Link>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary !py-2.5 !px-4 !text-xs"
            >
              <Plus size={15} /> Preserve Memory
            </button>
          </div>
        </div>
      </section>

      {/* ── COLLECTION STATS DASHBOARD ── */}
      {Array.isArray(memories) && (
        <section className="mb-8 p-5 bg-white rounded-2xl border border-ink/8 shadow-xs animate-fade-up">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-ink/6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-clay/10 flex items-center justify-center text-clay">
                <BookOpen size={20} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-ink">Collection Summary</h2>
                <p className="text-xs text-muted">
                  {summaryCounts.total} preserved {summaryCounts.total === 1 ? 'memory' : 'memories'} in total
                </p>
              </div>
            </div>

            {/* Summarize button */}
            <button
              onClick={handleSummarizeCollection}
              disabled={summarizingCollection || summaryCounts.total === 0}
              className="btn-secondary !py-2 !px-4 !text-xs self-start md:self-auto"
            >
              <Sparkles size={14} className="text-clay" />
              {summarizingCollection ? 'Generating Summary…' : 'Summarize Collection'}
            </button>
          </div>

          {/* Quick metric pills */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-parchment rounded-xl border border-ink/5">
              <span className="text-muted block">Stories</span>
              <span className="text-lg font-bold text-ink mt-0.5 block">{summaryCounts.byType.story || 0}</span>
            </div>
            <div className="p-3 bg-parchment rounded-xl border border-ink/5">
              <span className="text-muted block">Photos</span>
              <span className="text-lg font-bold text-ink mt-0.5 block">{summaryCounts.byType.photo || 0}</span>
            </div>
            <div className="p-3 bg-parchment rounded-xl border border-ink/5">
              <span className="text-muted block">Audio & Recordings</span>
              <span className="text-lg font-bold text-ink mt-0.5 block">{summaryCounts.byType.audio || 0}</span>
            </div>
            <div className="p-3 bg-parchment rounded-xl border border-ink/5">
              <span className="text-muted block">Approved for Echo</span>
              <span className="text-lg font-bold text-emerald-700 mt-0.5 block">
                {summaryCounts.byPrivacy.approved || 0}
              </span>
            </div>
          </div>

          {/* Editorial AI Summary Banner */}
          {collectionSummary && (
            <div className="mt-4 p-4 rounded-xl bg-clay/5 border border-clay/20 animate-fade-up">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-clay flex items-center gap-1.5">
                  <Sparkles size={13} /> AI Legacy Synthesis
                </span>
                <button
                  onClick={() => setCollectionSummary('')}
                  className="text-xs text-muted hover:text-ink"
                  aria-label="Dismiss summary"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="text-sm leading-relaxed text-ink/90 whitespace-pre-wrap">
                {collectionSummary}
              </p>
              <p className="text-[11px] text-muted mt-2 italic">
                Derived from preserved memories. Original memory data is completely preserved and unaltered.
              </p>
            </div>
          )}
        </section>
      )}

      {/* ── NOTIFICATIONS & FEEDBACK ── */}
      {deleteNotice && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 size={16} /> {deleteNotice}
        </div>
      )}

      {addSuccessMessage && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 size={16} /> {addSuccessMessage}
        </div>
      )}

      {/* ── VIEW TABS & SWITCHER ── */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex gap-1 bg-white p-1 rounded-full border border-ink/8 shadow-xs">
          {[
            { id: 'grid', label: 'Gallery Grid', icon: BookOpen },
            { id: 'timeline', label: 'AI Timeline', icon: Clock },
            { id: 'ai', label: 'Ask AI Assistant', icon: Sparkles },
            { id: 'contributions', label: `Contributions ${contributions.length > 0 ? `(${contributions.length})` : ''}`, icon: UserCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                  activeView === tab.id
                    ? 'bg-clay text-white shadow-xs'
                    : 'text-muted hover:text-ink hover:bg-parchment'
                }`}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── SEARCH, FILTER & SORT BAR (Visible in Grid and Timeline) ── */}
      {(activeView === 'grid' || activeView === 'timeline') && (
        <section className="mb-6 space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                id="memory-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search memories by title, story description, or date…"
                className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-ink/10 rounded-xl focus:border-clay focus:outline-none transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink text-xs"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Privacy Level Filter */}
            <div className="flex items-center gap-2">
              <select
                id="memory-privacy-filter"
                value={selectedPrivacy}
                onChange={(e) => setSelectedPrivacy(e.target.value)}
                className="py-2 px-3 text-xs bg-white border border-ink/10 rounded-xl text-ink focus:border-clay focus:outline-none"
              >
                <option value="all">All Sharing Permissions</option>
                <option value="private">Private to me</option>
                <option value="trusted">Trusted family</option>
                <option value="approved">Approved for digital echo</option>
              </select>

              {/* Sort Order */}
              <div className="flex items-center gap-1.5 bg-white border border-ink/10 rounded-xl px-3 py-1.5">
                <ArrowUpDown size={13} className="text-muted" />
                <select
                  id="memory-sort-order"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-xs bg-transparent text-ink border-none outline-none cursor-pointer"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="title">Title (A–Z)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Category Chips Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap font-medium transition border ${
                    isSelected
                      ? 'bg-clay text-white border-clay'
                      : 'bg-white text-muted border-ink/10 hover:border-clay/40 hover:text-ink'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── LOADING STATE ── */}
      {memories === null && !error && (
        <div className="flex flex-col items-center justify-center py-24 animate-fade-up">
          <LoadingSpinner label="Retrieving your digital legacy" />
          <p className="mt-3 text-xs text-muted">Connecting securely to DynamoDB…</p>
        </div>
      )}

      {/* ── ERROR STATE WITH DIFFERENTIATION ── */}
      {error && (
        <div className="p-6 rounded-2xl bg-red-50/80 border border-red-200 text-red-900 mb-8 animate-fade-up">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-sm">
                {errorType === 'network' && 'Connection Problem'}
                {errorType === 'auth' && 'Session Expired'}
                {errorType === 'server' && 'Server Temporarily Unavailable'}
                {errorType === 'general' && 'Unable to Load Memories'}
              </h3>
              <p className="mt-1 text-xs text-red-800 leading-relaxed">{error}</p>
              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={loadMemories}
                  className="px-4 py-1.5 text-xs font-semibold rounded-full bg-red-600 text-white hover:bg-red-700 transition"
                >
                  Try again
                </button>
                {errorType === 'network' && (
                  <span className="text-xs text-red-700">Please check internet connection or CORS availability.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── EMPTY STATE ── */}
      {Array.isArray(memories) && processedMemories.length === 0 && !error && (
        <section className="empty-legacy p-12 text-center bg-white rounded-3xl border border-ink/8 my-8 animate-fade-up">
          <div className="w-16 h-16 rounded-full bg-clay/10 text-clay flex items-center justify-center mx-auto mb-4">
            <BookOpen size={28} />
          </div>
          <h3 className="text-xl font-semibold text-ink">
            {searchQuery || selectedCategory !== 'all' || selectedPrivacy !== 'all'
              ? 'No matching memories found'
              : 'Your digital legacy is ready for its first memory'}
          </h3>
          <p className="mt-2 text-sm text-muted max-w-md mx-auto">
            {searchQuery || selectedCategory !== 'all' || selectedPrivacy !== 'all'
              ? 'Try adjusting your search terms or clearing filters to see more memories.'
              : 'Start gathering meaningful stories, milestone events, and photographs to preserve for future generations.'}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            {searchQuery || selectedCategory !== 'all' || selectedPrivacy !== 'all' ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedPrivacy('all');
                }}
                className="btn-secondary"
              >
                Clear all filters
              </button>
            ) : (
              <button onClick={() => setShowAddModal(true)} className="btn-primary">
                <Plus size={15} /> Add first memory
              </button>
            )}
          </div>
        </section>
      )}

      {/* ── VIEW 1: GALLERY GRID ── */}
      {activeView === 'grid' && Array.isArray(memories) && processedMemories.length > 0 && (
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 animate-fade-up">
          {processedMemories.map((memory) => {
            const memoryId = memory.memoryId || memory.id;
            const typeKey = (memory.type || 'story').toLowerCase();
            const typeBadgeStyle = TYPE_COLORS[typeKey] || TYPE_COLORS.default;
            const dateText = displayDate(memory.date || memory.createdAt);
            const privacyKey = memory.privacy || memory.consent || 'private';
            const singleSummary = memorySummaries[memoryId];

            return (
              <article
                key={memoryId || memory.title}
                onClick={() => setSelected(memory)}
                className="card group hover:-translate-y-1 transition-all duration-200 cursor-pointer border border-ink/8 flex flex-col justify-between"
              >
                <div className="p-5">
                  {/* Top Bar: Type Pill & Privacy Badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${typeBadgeStyle}`}>
                      {memory.type || 'Memory'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${privacyBadgeClass(privacyKey)}`}>
                        {privacyLabel(privacyKey)}
                      </span>
                      <button
                        type="button"
                        aria-label="Delete memory"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteMemory(memory);
                        }}
                        className="text-muted/40 hover:text-red-500 p-1 transition opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h2 className="text-base font-semibold text-ink group-hover:text-clay transition leading-snug">
                    {memory.title || 'Untitled memory'}
                  </h2>

                  {/* Description */}
                  <p className="mt-2 text-sm leading-relaxed text-muted line-clamp-3">
                    {memory.description || 'No story description provided.'}
                  </p>

                  {/* Optional Attachment indicator / preview */}
                  {(memory.attachmentKey || memory.attachment) && (
                    <div className="mt-3 p-2 bg-parchment rounded-xl border border-ink/6 text-xs text-muted flex items-center justify-between">
                      <span className="flex items-center gap-1.5 truncate">
                        {typeKey === 'photo' ? <Image size={14} className="text-clay" /> : <FileText size={14} className="text-muted" />}
                        <span className="truncate">{memory.attachmentName || memory.attachmentFileName || 'Attachment included'}</span>
                      </span>
                      <span className="text-[10px] uppercase font-bold text-clay">Media</span>
                    </div>
                  )}

                  {/* Individual AI Summary badge if generated */}
                  {singleSummary && (
                    <div className="mt-3 p-2.5 bg-clay/5 rounded-xl border border-clay/20 text-xs text-ink/90">
                      <p className="font-semibold text-clay text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Sparkles size={11} /> AI Summary
                      </p>
                      <p className="italic leading-relaxed">{singleSummary}</p>
                    </div>
                  )}
                </div>

                {/* Footer: Date & Quick Actions */}
                <div className="px-5 py-3.5 bg-cream/30 border-t border-ink/6 flex items-center justify-between text-xs text-muted">
                  <span className="flex items-center gap-1 font-medium">
                    {dateText ? (
                      <>
                        <CalendarDays size={12} className="text-clay" /> {dateText}
                      </>
                    ) : (
                      <span className="text-muted/60">Undated</span>
                    )}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleSummarizeSingle(memory, e)}
                      disabled={summarizingId === memoryId}
                      className="text-[11px] font-semibold text-clay hover:underline flex items-center gap-1"
                    >
                      <Sparkles size={11} />
                      {summarizingId === memoryId ? 'Summarizing…' : 'Summarize'}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* ── VIEW 2: AI CHRONOLOGICAL TIMELINE (Phase 3 A) ── */}
      {activeView === 'timeline' && Array.isArray(memories) && processedMemories.length > 0 && (
        <section className="timeline-rail ml-4 pl-6 border-l-2 border-clay/30 space-y-8 animate-fade-up">
          {Object.keys(timelineGroups.groupsByYear).map((year) => (
            <div key={year} className="relative">
              <div className="sticky top-20 z-10 -ml-10 mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-clay text-white text-xs font-bold shadow-xs">
                <CalendarDays size={12} /> {year}
              </div>

              <div className="space-y-4">
                {timelineGroups.groupsByYear[year].map((memory) => {
                  const typeKey = (memory.type || 'story').toLowerCase();
                  const typeBadgeStyle = TYPE_COLORS[typeKey] || TYPE_COLORS.default;
                  const dateText = displayDate(memory.date || memory.createdAt);

                  return (
                    <article
                      key={memory.memoryId || memory.id}
                      onClick={() => setSelected(memory)}
                      className="card p-5 ml-2 hover:-translate-y-0.5 transition cursor-pointer border border-ink/8 relative group"
                    >
                      <span className="absolute -left-9 top-6 w-3 h-3 rounded-full bg-clay border-2 border-white ring-2 ring-clay/20" />
                      <div className="flex items-start justify-between gap-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${typeBadgeStyle}`}>
                          {memory.type || 'Moment'}
                        </span>
                        <span className="text-xs text-muted font-medium">{dateText}</span>
                      </div>
                      <h3 className="text-base font-semibold text-ink mt-2">{memory.title}</h3>
                      <p className="mt-1 text-sm text-muted leading-relaxed line-clamp-2">{memory.description}</p>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Undated Moments section */}
          {timelineGroups.undated.length > 0 && (
            <div className="relative pt-6">
              <div className="-ml-10 mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ink/10 text-ink text-xs font-bold">
                <Clock size={12} /> Undated Moments
              </div>
              <div className="space-y-4">
                {timelineGroups.undated.map((memory) => (
                  <article
                    key={memory.memoryId || memory.id}
                    onClick={() => setSelected(memory)}
                    className="card p-5 ml-2 hover:-translate-y-0.5 transition cursor-pointer border border-ink/8 relative"
                  >
                    <span className="absolute -left-9 top-6 w-3 h-3 rounded-full bg-muted border-2 border-white" />
                    <h3 className="text-base font-semibold text-ink">{memory.title}</h3>
                    <p className="mt-1 text-sm text-muted leading-relaxed line-clamp-2">{memory.description}</p>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── VIEW 3: ASK AI ASSISTANT EMBEDDED (Phase 3 B) ── */}
      {activeView === 'ai' && (
        <section className="animate-fade-up max-w-3xl mx-auto">
          <AskLegacy
            legacyId="EST001"
            token={accessToken}
            legacyName="Echo Estate"
            memories={memories || []}
            onSelectMemory={(m) => setSelected(m)}
          />
        </section>
      )}

      {/* ── VIEW 4: FAMILY CONTRIBUTIONS (Phase 3 E) ── */}
      {activeView === 'contributions' && (
        <section className="animate-fade-up max-w-3xl mx-auto space-y-6">
          <div className="p-6 bg-white rounded-2xl border border-ink/8">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-ink">Family Contributions</h3>
                <p className="text-xs text-muted">
                  Allow family members and relatives to contribute stories, awaiting owner approval.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary !py-2 !px-4 !text-xs"
              >
                <Plus size={14} /> Contribute Story
              </button>
            </div>

            {contributions.length === 0 ? (
              <div className="p-8 text-center bg-parchment rounded-xl border border-ink/6">
                <UserCheck size={24} className="text-clay/40 mx-auto mb-2" />
                <p className="text-sm font-medium text-ink">All family contributions are up to date</p>
                <p className="text-xs text-muted mt-1">No memories are currently pending approval.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {contributions.map((item) => (
                  <div key={item.memoryId || item.id} className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          Pending Approval
                        </span>
                        {item.contributorName && (
                          <span className="text-xs text-muted">Contributed by <strong>{item.contributorName}</strong></span>
                        )}
                      </div>
                      <h4 className="font-semibold text-ink text-sm mt-1">{item.title}</h4>
                      <p className="text-xs text-muted line-clamp-2 mt-0.5">{item.description}</p>
                    </div>
                    <button
                      onClick={() => handleApproveContribution(item)}
                      className="px-4 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition flex items-center gap-1.5 flex-shrink-0"
                    >
                      <CheckCircle2 size={13} /> Approve into Legacy
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── MEMORY DETAIL MODAL ── */}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Memory details"
          className="fixed inset-0 z-50 grid place-items-center bg-ink/40 backdrop-blur-xs p-4"
          onClick={() => setSelected(null)}
        >
          <section
            className="card relative w-full max-w-lg p-7 animate-fade-up max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              aria-label="Close"
              onClick={() => setSelected(null)}
              className="absolute right-5 top-5 text-muted hover:text-ink transition"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                TYPE_COLORS[(selected.type || 'story').toLowerCase()] || TYPE_COLORS.default
              }`}>
                {selected.type || 'Memory'}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                privacyBadgeClass(selected.privacy || selected.consent)
              }`}>
                {privacyLabel(selected.privacy || selected.consent)}
              </span>
            </div>

            <h2 className="text-2xl font-semibold text-ink pr-8">
              {selected.title || 'Untitled memory'}
            </h2>

            <p className="mt-4 text-sm leading-relaxed text-ink/90 whitespace-pre-wrap">
              {selected.description || 'No description provided.'}
            </p>

            {/* Individual AI Summary */}
            {memorySummaries[selected.memoryId || selected.id] && (
              <div className="mt-4 p-4 rounded-xl bg-clay/5 border border-clay/20">
                <p className="text-xs font-bold uppercase tracking-wider text-clay flex items-center gap-1 mb-1">
                  <Sparkles size={12} /> AI Editorial Summary
                </p>
                <p className="text-xs text-ink/90 italic leading-relaxed">
                  {memorySummaries[selected.memoryId || selected.id]}
                </p>
              </div>
            )}

            {/* Attachment preview / details */}
            {(selected.attachmentKey || selected.attachment) && (
              <div className="mt-5 p-4 rounded-xl bg-parchment border border-ink/8">
                <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                  Attachment
                </h4>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-ink truncate">
                    {selected.attachmentName || selected.attachmentFileName || selected.attachmentKey}
                  </span>
                  <span className="text-[11px] text-muted">
                    {selected.attachmentContentType || 'Protected file'}
                  </span>
                </div>
              </div>
            )}

            <dl className="mt-6 space-y-2.5 border-t border-ink/8 pt-5 text-xs">
              {selected.date && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Memory Date</dt>
                  <dd className="font-semibold text-ink">{displayDate(selected.date)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Sharing Permission</dt>
                <dd className="font-semibold text-ink">{privacyLabel(selected.privacy || selected.consent)}</dd>
              </div>
              {selected.createdAt && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Preserved on</dt>
                  <dd className="text-ink">{displayDate(selected.createdAt)}</dd>
                </div>
              )}
            </dl>

            <div className="mt-6 pt-4 border-t border-ink/8 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleSummarizeSingle(selected)}
                disabled={summarizingId === (selected.memoryId || selected.id)}
                className="btn-secondary !text-xs !py-1.5 !px-3"
              >
                <Sparkles size={13} className="text-clay" />
                {summarizingId === (selected.memoryId || selected.id) ? 'Summarizing…' : 'Summarize Memory'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setConfirmDeleteMemory(selected);
                }}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Delete memory
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ── DELETE CONFIRMATION DIALOG ── */}
      {confirmDeleteMemory && (
        <div
          role="alertdialog"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-ink/40 backdrop-blur-xs p-4"
        >
          <div className="card p-6 w-full max-w-md animate-fade-up bg-white rounded-2xl border border-ink/10 shadow-lg">
            <h3 className="text-lg font-semibold text-ink">Delete this memory?</h3>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              Are you sure you want to delete <strong>&ldquo;{confirmDeleteMemory.title}&rdquo;</strong>? This will remove the story and any attachments from your digital estate.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteMemory(null)}
                disabled={Boolean(deletingId)}
                className="btn-secondary !text-xs !py-2 !px-4"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={Boolean(deletingId)}
                className="px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition"
              >
                {deletingId ? 'Deleting…' : 'Yes, Delete Memory'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PRESERVE MEMORY MODAL FORM ── */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-ink/40 backdrop-blur-xs p-4"
        >
          <div className="card p-6 sm:p-7 w-full max-w-lg bg-white rounded-3xl max-h-[90vh] overflow-y-auto animate-fade-up">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="eyebrow">Preserve with Intention</p>
                <h3 className="text-xl font-semibold text-ink">Add a Memory</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-muted hover:text-ink">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="form-label" htmlFor="new-memory-title">Title</label>
                <input
                  required
                  id="new-memory-title"
                  name="title"
                  className="form-input"
                  placeholder="e.g. Grandma's Garden Tradition"
                />
              </div>

              <div>
                <label className="form-label" htmlFor="new-memory-type">Type</label>
                <select id="new-memory-type" name="type" className="form-input">
                  <option value="story">Story</option>
                  <option value="photo">Photograph</option>
                  <option value="audio">Audio / Voice recording</option>
                  <option value="document">Document</option>
                  <option value="letter">Letter</option>
                  <option value="milestone">Milestone</option>
                  <option value="event">Event</option>
                </select>
              </div>

              <div>
                <label className="form-label" htmlFor="new-memory-date">Date</label>
                <input
                  required
                  id="new-memory-date"
                  name="date"
                  type="date"
                  className="form-input"
                  defaultValue={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <label className="form-label" htmlFor="new-memory-description">Story or Description</label>
                <textarea
                  required
                  id="new-memory-description"
                  name="description"
                  rows={4}
                  className="form-input resize-y"
                  placeholder="Tell the story in your own words…"
                />
              </div>

              <div>
                <label className="form-label" htmlFor="new-memory-consent">Privacy & Sharing</label>
                <select id="new-memory-consent" name="consent" className="form-input">
                  <option value="private">Private to me</option>
                  <option value="trusted">Trusted family only</option>
                  <option value="approved">Approved for digital echo AI</option>
                </select>
              </div>

              {/* Optional Attachment */}
              <div>
                <label className="form-label" htmlFor="new-memory-file">Optional Attachment (Image, Audio, or PDF)</label>
                <input
                  id="new-memory-file"
                  name="file"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf,.mp3,.wav"
                  className="form-input text-xs"
                />
                <p className="text-[11px] text-muted mt-1">
                  Uploads securely to private Amazon S3 via presigned URL.
                </p>
              </div>

              {/* Upload Progress */}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="w-full bg-ink/10 rounded-full h-2 overflow-hidden">
                  <div className="bg-clay h-full transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}

              {uploadError && (
                <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs">
                  {uploadError}
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={savingMemory}
                  className="btn-secondary !text-xs !py-2 !px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingMemory}
                  className="btn-primary !text-xs !py-2 !px-5"
                >
                  {savingMemory ? 'Preserving…' : 'Save Memory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
