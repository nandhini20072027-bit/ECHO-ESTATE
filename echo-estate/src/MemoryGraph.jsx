import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Share2, ZoomIn, ZoomOut, RotateCcw, Search, Filter, Sparkles,
  BookOpen, User, MapPin, Calendar, Plus, Trash2, X, AlertCircle,
  Info, ExternalLink, ChevronRight
} from 'lucide-react';
import AppShell from './components/AppShell';
import LoadingSpinner from './components/LoadingSpinner';
import { getMemories, getGraphRelationships, saveGraphRelationships } from './services/api';
import { useAuth } from './services/auth.jsx';

const NODE_COLORS = {
  memory: { bg: '#B86F52', text: '#ffffff', stroke: '#8c4e36', ring: 'rgba(184, 111, 82, 0.2)' },
  person: { bg: '#059669', text: '#ffffff', stroke: '#047857', ring: 'rgba(5, 150, 105, 0.2)' },
  location: { bg: '#2563EB', text: '#ffffff', stroke: '#1D4ED8', ring: 'rgba(37, 99, 235, 0.2)' },
  event: { bg: '#D97706', text: '#ffffff', stroke: '#B45309', ring: 'rgba(217, 119, 6, 0.2)' },
};

export default function MemoryGraph() {
  const { accessToken } = useAuth();
  const [memories, setMemories] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Graph state
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'memory' | 'person' | 'location' | 'event'

  // Viewport pan & zoom
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Node Dragging
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const svgRef = useRef(null);

  // New relationship modal
  const [showAddRelationModal, setShowAddRelationModal] = useState(false);
  const [sourceNodeId, setSourceNodeId] = useState('');
  const [targetNodeId, setTargetNodeId] = useState('');
  const [relationLabel, setRelationLabel] = useState('connected to');

  // Load Memories & Initialize Graph
  const loadGraphData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const memoryList = await getMemories(accessToken);
      const safeMemories = Array.isArray(memoryList) ? memoryList : [];
      setMemories(safeMemories);

      // Check for previously saved/approved relationship metadata
      const cached = await getGraphRelationships(accessToken);

      if (cached && cached.nodes && cached.links) {
        setNodes(cached.nodes);
        setLinks(cached.links);
      } else {
        // Extract entities and relationships grounded purely in stored memories
        const generated = extractGroundedGraph(safeMemories);
        setNodes(generated.nodes);
        setLinks(generated.links);
        await saveGraphRelationships(generated, accessToken);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to construct memory graph.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadGraphData();
  }, [loadGraphData]);

  // Extract entities strictly supported by stored memories
  const extractGroundedGraph = (mems) => {
    const rawNodes = [];
    const rawLinks = [];
    const entityMap = new Map();

    const addEntity = (name, type, connectedMemoryId, relationText) => {
      if (!name || name.trim().length < 2) return;
      const cleanName = name.trim();
      const entityId = `entity_${type}_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

      if (!entityMap.has(entityId)) {
        entityMap.set(entityId, {
          id: entityId,
          title: cleanName,
          type,
          connectedMemoryIds: [connectedMemoryId],
        });
      } else {
        const item = entityMap.get(entityId);
        if (!item.connectedMemoryIds.includes(connectedMemoryId)) {
          item.connectedMemoryIds.push(connectedMemoryId);
        }
      }

      rawLinks.push({
        id: `link_${connectedMemoryId}_${entityId}`,
        source: connectedMemoryId,
        target: entityId,
        label: relationText || 'associated with',
      });
    };

    // Center root legacy node
    rawNodes.push({
      id: 'root_legacy',
      title: 'Echo Estate',
      type: 'location',
      description: 'The foundation archive for all preserved family memories and milestones.',
      x: 450,
      y: 300,
    });

    mems.forEach((m, idx) => {
      const memoryId = m.memoryId || m.id || `mem_${idx}`;
      const angle = (idx / Math.max(mems.length, 1)) * 2 * Math.PI;
      const radius = 220;

      rawNodes.push({
        id: memoryId,
        title: m.title || 'Untitled Memory',
        type: 'memory',
        description: m.description,
        date: m.date || m.createdAt,
        privacy: m.privacy || m.consent,
        attachmentName: m.attachmentName || m.attachmentFileName,
        x: 450 + radius * Math.cos(angle),
        y: 300 + radius * Math.sin(angle),
      });

      // Link memory to estate root
      rawLinks.push({
        id: `link_root_${memoryId}`,
        source: 'root_legacy',
        target: memoryId,
        label: 'anchored in',
      });

      // Grounded Entity Extraction based on real memory facts:
      const fullText = `${m.title} ${m.description}`.toLowerCase();

      // People
      if (fullText.includes('friends') || fullText.includes('ludo') || fullText.includes('classmates')) {
        addEntity('School Playmates', 'person', memoryId, 'shared by');
      }
      if (m.contributorName) {
        addEntity(m.contributorName, 'person', memoryId, 'contributed by');
      }
      if (fullText.includes('family') || fullText.includes('grandma') || fullText.includes('mother')) {
        addEntity('Family Circle', 'person', memoryId, 'shared with');
      }

      // Locations
      if (fullText.includes('college')) {
        addEntity('College Campus', 'location', memoryId, 'occurred at');
      }
      if (fullText.includes('school')) {
        addEntity('School Grounds', 'location', memoryId, 'experienced at');
      }
      if (fullText.includes('vellore')) {
        addEntity('Vellore', 'location', memoryId, 'located in');
      }
      if (fullText.includes('dining') || fullText.includes('dinner') || fullText.includes('kitchen') || fullText.includes('chapathi')) {
        addEntity('Family Dining Hall', 'location', memoryId, 'gathered at');
      }

      // Events & Milestones
      if (fullText.includes('first day') || fullText.includes('college memory')) {
        addEntity('First Day of College', 'event', memoryId, 'milestone moment');
      }
      if (fullText.includes('school days')) {
        addEntity('School Days Era', 'event', memoryId, 'life era');
      }
      if (fullText.includes('dinner time') || fullText.includes('paneer') || fullText.includes('idly')) {
        addEntity('Traditional Meal', 'event', memoryId, 'culinary tradition');
      }
    });

    // Append entity nodes positioned slightly further out
    let entityIdx = 0;
    const totalEntities = entityMap.size;
    entityMap.forEach((ent) => {
      const angle = (entityIdx / Math.max(totalEntities, 1)) * 2 * Math.PI + 0.3;
      const radius = 380;
      rawNodes.push({
        ...ent,
        x: 450 + radius * Math.cos(angle),
        y: 300 + radius * Math.sin(angle),
      });
      entityIdx++;
    });

    return { nodes: rawNodes, links: rawLinks };
  };

  // Filtered nodes according to search and category
  const filteredNodes = useMemo(() => {
    return nodes.filter((n) => {
      if (activeFilter !== 'all' && n.type !== activeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (n.title || '').toLowerCase().includes(q);
        const matchDesc = (n.description || '').toLowerCase().includes(q);
        return matchTitle || matchDesc;
      }
      return true;
    });
  }, [nodes, activeFilter, searchQuery]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map(n => n.id)), [filteredNodes]);

  // Filtered links
  const filteredLinks = useMemo(() => {
    return links.filter(l => filteredNodeIds.has(l.source) && filteredNodeIds.has(l.target));
  }, [links, filteredNodeIds]);

  // Node position map
  const nodeMap = useMemo(() => {
    const map = new Map();
    nodes.forEach(n => map.set(n.id, n));
    return map;
  }, [nodes]);

  // Pan / Zoom Controls
  const handleZoom = (delta) => {
    setScale(s => Math.min(Math.max(s + delta, 0.5), 2.5));
  };

  const handleReset = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    setSelectedNode(null);
    setSearchQuery('');
    setActiveFilter('all');
  };

  // Dragging Nodes
  const handleMouseDownNode = (e, node) => {
    e.stopPropagation();
    setDraggingNodeId(node.id);
  };

  const handleMouseMove = (e) => {
    if (draggingNodeId) {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = (e.clientX - rect.left - pan.x) / scale;
      const mouseY = (e.clientY - rect.top - pan.y) / scale;

      setNodes(prev => prev.map(n => n.id === draggingNodeId ? { ...n, x: mouseX, y: mouseY } : n));
    } else if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
    }
  };

  const handleMouseUp = () => {
    if (draggingNodeId) {
      setDraggingNodeId(null);
      saveGraphRelationships({ nodes, links }, accessToken);
    }
    setIsPanning(false);
  };

  const handleMouseDownCanvas = (e) => {
    if (e.target.tagName === 'svg' || e.target.id === 'graph-bg') {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  // Add custom verified relationship
  const handleAddRelationship = async (e) => {
    e.preventDefault();
    if (!sourceNodeId || !targetNodeId || sourceNodeId === targetNodeId) return;

    const newLink = {
      id: `link_${sourceNodeId}_${targetNodeId}_${Date.now()}`,
      source: sourceNodeId,
      target: targetNodeId,
      label: relationLabel.trim() || 'connected to',
    };

    const updatedLinks = [...links, newLink];
    setLinks(updatedLinks);
    await saveGraphRelationships({ nodes, links: updatedLinks }, accessToken);
    setShowAddRelationModal(false);
    setSourceNodeId('');
    setTargetNodeId('');
  };

  // Remove relationship
  const handleRemoveLink = async (linkId) => {
    const updatedLinks = links.filter(l => l.id !== linkId);
    setLinks(updatedLinks);
    await saveGraphRelationships({ nodes, links: updatedLinks }, accessToken);
  };

  return (
    <AppShell>
      {/* ── HEADER ── */}
      <section className="mb-6 animate-fade-up">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="eyebrow flex items-center gap-1.5">
              <Sparkles size={14} className="text-clay" /> Interactive Knowledge Graph
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-ink">Memory Relationship Graph</h1>
            <p className="mt-1 text-sm text-muted max-w-xl">
              Explore interconnected people, locations, events, and memories grounded in stored records.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddRelationModal(true)}
              className="btn-primary !py-2 !px-4 !text-xs"
            >
              <Plus size={14} /> Add Verified Link
            </button>
            <button
              onClick={handleReset}
              className="btn-secondary !py-2 !px-3 !text-xs"
              title="Reset View"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* ── SEARCH & FILTER CONTROLS ── */}
      <section className="mb-4 flex flex-col sm:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search nodes by person, location, event, or memory title…"
            className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-ink/10 rounded-xl focus:border-clay focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Node Type Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'all', label: 'All Nodes', icon: Share2 },
            { id: 'memory', label: 'Memories', icon: BookOpen },
            { id: 'person', label: 'People', icon: User },
            { id: 'location', label: 'Locations', icon: MapPin },
            { id: 'event', label: 'Events & Eras', icon: Calendar },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition border ${
                activeFilter === f.id
                  ? 'bg-clay text-white border-clay shadow-2xs'
                  : 'bg-white text-muted border-ink/10 hover:border-clay/40 hover:text-ink'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── LOADING & ERROR STATES ── */}
      {loading && (
        <div className="h-[550px] bg-white rounded-3xl border border-ink/8 flex flex-col items-center justify-center">
          <LoadingSpinner label="Constructing knowledge graph" />
          <p className="mt-2 text-xs text-muted">Resolving entities from DynamoDB memories…</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-red-900 my-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-sm">Failed to generate relationship graph</h4>
            <p className="text-xs text-red-700 mt-0.5">{error}</p>
            <button onClick={loadGraphData} className="mt-2 text-xs font-semibold underline">Retry</button>
          </div>
        </div>
      )}

      {/* ── INTERACTIVE CANVAS VIEWPORT ── */}
      {!loading && !error && (
        <div className="relative h-[620px] bg-white rounded-3xl border border-ink/8 shadow-xs overflow-hidden flex">
          {/* Zoom Controls Overlay */}
          <div className="absolute left-4 top-4 z-20 flex flex-col gap-1.5 bg-white/95 p-1 rounded-2xl border border-ink/10 shadow-sm">
            <button
              onClick={() => handleZoom(0.2)}
              className="p-2 text-muted hover:text-ink hover:bg-parchment rounded-xl"
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={() => handleZoom(-0.2)}
              className="p-2 text-muted hover:text-ink hover:bg-parchment rounded-xl"
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            <button
              onClick={handleReset}
              className="p-2 text-muted hover:text-ink hover:bg-parchment rounded-xl"
              title="Reset Viewport"
            >
              <RotateCcw size={16} />
            </button>
          </div>

          {/* Legend Overlay */}
          <div className="absolute left-4 bottom-4 z-20 bg-white/90 backdrop-blur-xs p-3 rounded-2xl border border-ink/8 shadow-2xs text-[11px] space-y-1.5">
            <span className="font-bold text-ink block uppercase tracking-wider text-[10px]">Legend</span>
            <div className="flex items-center gap-2 text-muted">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: NODE_COLORS.memory.bg }} /> Memory Record
            </div>
            <div className="flex items-center gap-2 text-muted">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: NODE_COLORS.person.bg }} /> Person / Relative
            </div>
            <div className="flex items-center gap-2 text-muted">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: NODE_COLORS.location.bg }} /> Place / Location
            </div>
            <div className="flex items-center gap-2 text-muted">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: NODE_COLORS.event.bg }} /> Milestone / Event
            </div>
          </div>

          {/* SVG Graph View */}
          <div
            className="flex-1 h-full cursor-grab active:cursor-grabbing select-none"
            onMouseDown={handleMouseDownCanvas}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <svg
              ref={svgRef}
              id="graph-canvas"
              className="w-full h-full"
              viewBox="0 0 900 620"
            >
              <rect id="graph-bg" width="900" height="620" fill="#FAF8F5" />

              {/* Viewport Transform Group */}
              <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
                {/* Background Grid Pattern */}
                <defs>
                  <pattern id="graph-dots" width="30" height="30" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1.5" fill="#E8E2D8" />
                  </pattern>
                </defs>
                <rect x="-1000" y="-1000" width="3000" height="3000" fill="url(#graph-dots)" pointerEvents="none" />

                {/* Render Links / Edges */}
                {filteredLinks.map((link) => {
                  const src = nodeMap.get(link.source);
                  const tgt = nodeMap.get(link.target);
                  if (!src || !tgt) return null;

                  const isHighlighted = selectedNode && (selectedNode.id === src.id || selectedNode.id === tgt.id);

                  return (
                    <g key={link.id}>
                      <line
                        x1={src.x}
                        y1={src.y}
                        x2={tgt.x}
                        y2={tgt.y}
                        stroke={isHighlighted ? '#B86F52' : '#D1C7BA'}
                        strokeWidth={isHighlighted ? 2.5 : 1.5}
                        strokeDasharray={link.label === 'anchored in' ? '4 2' : 'none'}
                        opacity={isHighlighted ? 1 : 0.7}
                      />
                      {/* Relationship Label along link */}
                      {scale > 0.8 && (
                        <text
                          x={(src.x + tgt.x) / 2}
                          y={(src.y + tgt.y) / 2 - 4}
                          fill="#8C8275"
                          fontSize="9"
                          fontFamily="sans-serif"
                          textAnchor="middle"
                          className="select-none pointer-events-none"
                        >
                          {link.label}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Render Nodes */}
                {filteredNodes.map((node) => {
                  const style = NODE_COLORS[node.type] || NODE_COLORS.memory;
                  const isSelected = selectedNode?.id === node.id;
                  const nodeRadius = node.type === 'memory' ? 24 : node.id === 'root_legacy' ? 28 : 20;

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x}, ${node.y})`}
                      className="cursor-pointer group"
                      onClick={() => setSelectedNode(node)}
                      onMouseDown={(e) => handleMouseDownNode(e, node)}
                    >
                      {/* Selection Ring */}
                      {isSelected && (
                        <circle
                          r={nodeRadius + 8}
                          fill="none"
                          stroke={style.bg}
                          strokeWidth="2.5"
                          strokeDasharray="4 3"
                          className="animate-spin"
                          style={{ animationDuration: '10s' }}
                        />
                      )}

                      {/* Main Node Circle */}
                      <circle
                        r={nodeRadius}
                        fill={style.bg}
                        stroke="#ffffff"
                        strokeWidth="3"
                        className="transition-transform group-hover:scale-110 drop-shadow-sm"
                      />

                      {/* Icon inside node */}
                      <text
                        textAnchor="middle"
                        dy=".3em"
                        fill="#ffffff"
                        fontSize="11"
                        fontWeight="bold"
                        fontFamily="sans-serif"
                        className="select-none pointer-events-none"
                      >
                        {node.type === 'person' ? '👤' : node.type === 'location' ? '📍' : node.type === 'event' ? '✨' : '📖'}
                      </text>

                      {/* Label Text below node */}
                      <text
                        y={nodeRadius + 14}
                        textAnchor="middle"
                        fill="#25231F"
                        fontSize="11"
                        fontWeight="600"
                        fontFamily="sans-serif"
                        className="select-none"
                      >
                        {node.title.length > 20 ? `${node.title.slice(0, 18)}…` : node.title}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>

          {/* ── INSPECTOR DRAWER (Right Sidebar) ── */}
          {selectedNode && (
            <aside className="w-80 h-full bg-white border-l border-ink/8 p-6 flex flex-col justify-between overflow-y-auto z-30 shadow-lg animate-fade-up">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: NODE_COLORS[selectedNode.type]?.ring,
                      color: NODE_COLORS[selectedNode.type]?.stroke,
                    }}
                  >
                    {selectedNode.type}
                  </span>
                  <button onClick={() => setSelectedNode(null)} className="text-muted hover:text-ink">
                    <X size={16} />
                  </button>
                </div>

                <h3 className="text-lg font-semibold text-ink leading-snug">
                  {selectedNode.title}
                </h3>

                {selectedNode.date && (
                  <p className="text-xs text-muted mt-1 flex items-center gap-1 font-medium">
                    <Calendar size={12} className="text-clay" /> {new Date(selectedNode.date).toLocaleDateString()}
                  </p>
                )}

                <p className="mt-3 text-xs leading-relaxed text-muted whitespace-pre-wrap">
                  {selectedNode.description || 'Verified entity connected with preserved legacy memories.'}
                </p>

                {/* Connected Relationships List */}
                <div className="mt-5 pt-4 border-t border-ink/8">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink mb-2.5 flex items-center justify-between">
                    <span>Connected Nodes ({links.filter(l => l.source === selectedNode.id || l.target === selectedNode.id).length})</span>
                  </h4>
                  <div className="space-y-2">
                    {links
                      .filter(l => l.source === selectedNode.id || l.target === selectedNode.id)
                      .map((l) => {
                        const otherId = l.source === selectedNode.id ? l.target : l.source;
                        const otherNode = nodeMap.get(otherId);
                        if (!otherNode) return null;

                        return (
                          <div
                            key={l.id}
                            className="p-2.5 rounded-xl bg-parchment border border-ink/6 text-xs flex items-center justify-between group"
                          >
                            <button
                              onClick={() => setSelectedNode(otherNode)}
                              className="text-left flex-1 truncate font-medium text-ink hover:text-clay"
                            >
                              <span className="text-[10px] text-muted block italic">{l.label}</span>
                              <span className="truncate block">{otherNode.title}</span>
                            </button>
                            <button
                              onClick={() => handleRemoveLink(l.id)}
                              className="text-muted/40 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition"
                              title="Remove relationship"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-ink/8 space-y-2">
                {selectedNode.type === 'memory' ? (
                  <a
                    href={`/memories`}
                    className="btn-primary w-full justify-center !text-xs !py-2"
                  >
                    <BookOpen size={13} /> View in Memories Archive
                  </a>
                ) : (
                  <button
                    onClick={() => {
                      setSourceNodeId(selectedNode.id);
                      setShowAddRelationModal(true);
                    }}
                    className="btn-secondary w-full justify-center !text-xs !py-2"
                  >
                    <Plus size={13} /> Link Another Memory
                  </button>
                )}
              </div>
            </aside>
          )}
        </div>
      )}

      {/* ── ADD VERIFIED RELATIONSHIP MODAL ── */}
      {showAddRelationModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-ink/40 backdrop-blur-xs p-4"
        >
          <div className="card p-6 w-full max-w-md bg-white rounded-3xl animate-fade-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-ink">Add Verified Relationship</h3>
              <button onClick={() => setShowAddRelationModal(false)} className="text-muted hover:text-ink">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddRelationship} className="space-y-4 text-xs">
              <div>
                <label className="form-label" htmlFor="source-node">Source Node</label>
                <select
                  id="source-node"
                  value={sourceNodeId}
                  onChange={(e) => setSourceNodeId(e.target.value)}
                  className="form-input text-xs"
                  required
                >
                  <option value="">Select source entity…</option>
                  {nodes.map(n => (
                    <option key={n.id} value={n.id}>[{n.type.toUpperCase()}] {n.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" htmlFor="relationship-label">Relationship Description</label>
                <input
                  id="relationship-label"
                  value={relationLabel}
                  onChange={(e) => setRelationLabel(e.target.value)}
                  placeholder="e.g. celebrated at, shared with, occurred during"
                  className="form-input text-xs"
                  required
                />
              </div>

              <div>
                <label className="form-label" htmlFor="target-node">Target Node</label>
                <select
                  id="target-node"
                  value={targetNodeId}
                  onChange={(e) => setTargetNodeId(e.target.value)}
                  className="form-input text-xs"
                  required
                >
                  <option value="">Select target entity…</option>
                  {nodes.filter(n => n.id !== sourceNodeId).map(n => (
                    <option key={n.id} value={n.id}>[{n.type.toUpperCase()}] {n.title}</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddRelationModal(false)}
                  className="btn-secondary !text-xs !py-1.5 !px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary !text-xs !py-1.5 !px-4"
                >
                  Save Verified Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
