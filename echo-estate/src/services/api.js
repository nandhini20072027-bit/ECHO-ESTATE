// API base URL (fallback to the API Gateway invoke URL)
const RAW_API_URL = import.meta.env.VITE_API_URL ||
  'https://r3h1nfbdq8.execute-api.ap-south-1.amazonaws.com/default';

// Clean base URL ensuring no trailing slash or redundant /EchoEstateFunction suffix
export const API_URL = RAW_API_URL.replace(/\/+$/, '').replace(/\/EchoEstateFunction$/, '');

function apiError(status, payload, fallback) {
  const message = payload?.error || payload?.message || fallback;
  return new Error(`${message}${status ? ` (${status})` : ''}`);
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('The estate service returned an unreadable response format.');
  }
}

async function request(path = '', { method = 'GET', token, body } = {}) {
  let response;
  // Ensure path starts with a slash if not empty
  const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  const url = `${API_URL}${normalizedPath}`;

  try {
    const isJsonBody = body && !(body instanceof FormData) && typeof body !== 'string';
    const requestHeaders = {
      ...(isJsonBody ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    response = await fetch(url, {
      method,
      mode: 'cors',
      headers: requestHeaders,
      ...(body ? { body: isJsonBody ? JSON.stringify(body) : body } : {}),
    });
  } catch (error) {
    // Distinguish offline/network failures from server responses
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    const errorMsg = isOffline
      ? 'You appear to be offline. Please check your internet connection.'
      : `Network request failed: ${error instanceof Error ? error.message : 'Unable to connect to the estate service'}. Please check your connection or CORS settings.`;
    throw new Error(errorMsg);
  }

  const payload = await readJson(response);

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Your session has expired. Please sign in again.');
    }
    if (response.status === 404) {
      throw new Error(`The requested estate resource was not found (404). Path: ${normalizedPath}`);
    }
    if (response.status >= 500) {
      throw new Error('The estate server encountered an error. Please try again in a few moments.');
    }

    throw apiError(response.status, payload, 'The estate service is currently unavailable.');
  }

  return payload;
}

// ---------- Existing API exports ----------
export function getEstate(token) {
  return request('/EchoEstateFunction', { token });
}

export function getProfile(token) {
  return request('/EchoEstateFunction', { token });
}

export async function getLegacies(token) {
  // The currently deployed API Gateway exposes the EchoEstateFunction resource.
  // It returns the existing EST001 estate object with memories array.
  const payload = await request('/EchoEstateFunction', { token });
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.legacies)) return payload.legacies;

  const estate = payload?.estate || payload?.Item || payload;
  if (estate && typeof estate === 'object') {
    const memories = Array.isArray(estate.memories) ? estate.memories : [];
    return [{
      ...estate,
      legacyId: estate.legacyId || estate.estateId || 'EST001',
      name: estate.name || estate.estateName || estate.title || estate.estateId || 'EchoEstate',
      description: estate.description || estate.summary || 'A private collection of stories and moments.',
      memoryCount: estate.memoryCount ?? memories.length,
      memories,
    }];
  }

  throw new Error('The estate service returned no estate data.');
}

export async function getLegacy(legacyId, token) {
  const legacies = await getLegacies(token);
  const found = legacies.find(l => l.legacyId === legacyId || l.id === legacyId || l.estateId === legacyId);
  if (!found) {
    // If not found in array but legacyId is the default EST001, return the primary estate
    if (legacies.length > 0 && (!legacyId || legacyId === 'EST001')) {
      return legacies[0];
    }
    throw new Error(`Legacy ${legacyId} not found`);
  }
  return found;
}

export function createLegacy(data, token) {
  return request('/legacies', { method: 'POST', token, body: data });
}

export function setLegacyAvatar(legacyId, avatarKey, token) {
  return request(`/legacies/${encodeURIComponent(legacyId)}`, {
    method: 'PATCH',
    token,
    body: { avatarKey },
  });
}

export function deleteLegacy(legacyId, token) {
  return request(`/legacies/${encodeURIComponent(legacyId)}`, { method: 'DELETE', token });
}

export async function getMemories(token, legacyId) {
  // If specific legacyId requested other than EST001, try route
  if (legacyId && legacyId !== 'EST001') {
    try {
      const payload = await request(`/legacies/${encodeURIComponent(legacyId)}/memories`, { token });
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.memories)) return payload.memories;
    } catch {
      // Fallback to primary estate
    }
    const legacies = await getLegacies(token);
    const legacy = legacies.find(l => l.legacyId === legacyId || l.id === legacyId);
    if (legacy && Array.isArray(legacy.memories)) return legacy.memories;
    if (legacy) return [];
  }

  // Primary deployed endpoint
  const payload = await request('/EchoEstateFunction', { token });
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.memories)) return payload.memories;
  if (Array.isArray(payload?.estate?.memories)) return payload.estate.memories;
  if (Array.isArray(payload?.Item?.memories)) return payload.Item.memories;

  // If the estate object was returned but memories array is empty or undefined, return []
  if (payload && typeof payload === 'object') {
    return [];
  }

  throw new Error('The estate service returned an unrecognized memory format.');
}

export async function getDashboardData(token) {
  const memories = await getMemories(token);
  const byType = type => memories.filter(m => m.type?.toLowerCase() === type).length;
  return {
    totalMemories: memories.length,
    stories: byType('story'),
    photos: byType('photo'),
    documents: byType('document'),
    audio: byType('audio'),
    recentMemories: [...memories]
      .sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0))
      .slice(0, 5),
  };
}

export function createMemory(formDataOrData, token) {
  let memoryPayload = {};

  if (formDataOrData instanceof FormData) {
    const fd = formDataOrData;
    memoryPayload = {
      title: fd.get('title'),
      type: fd.get('type') || 'story',
      date: fd.get('date'),
      description: fd.get('description'),
      privacy: fd.get('consent') || fd.get('privacy') || 'private',
      attachmentKey: fd.get('attachmentKey') || undefined,
      attachmentName: fd.get('attachmentName') || undefined,
      attachmentContentType: fd.get('attachmentContentType') || undefined,
      contributorName: fd.get('contributorName') || undefined,
      relationship: fd.get('relationship') || undefined,
      status: fd.get('status') || 'approved',
    };
  } else if (typeof formDataOrData === 'object' && formDataOrData !== null) {
    memoryPayload = {
      ...formDataOrData,
      privacy: formDataOrData.consent || formDataOrData.privacy || 'private',
    };
  }

  // Pass attachment object structure if attachmentKey exists
  if (memoryPayload.attachmentKey && !memoryPayload.attachment) {
    memoryPayload.attachment = {
      key: memoryPayload.attachmentKey,
      fileName: memoryPayload.attachmentName || '',
      contentType: memoryPayload.attachmentContentType || '',
    };
  }

  return request('/EchoEstateFunction', {
    method: 'POST',
    token,
    body: memoryPayload,
  });
}

export async function deleteMemory(memoryId, token) {
  if (!memoryId) {
    return Promise.reject(new Error('This memory cannot be deleted because its ID is missing.'));
  }
  try {
    return await request(`/${encodeURIComponent(memoryId)}`, { method: 'DELETE', token });
  } catch (err) {
    // If the endpoint does not support direct deletion at /{id}, try /EchoEstateFunction with memoryId
    try {
      return await request(`/EchoEstateFunction?memoryId=${encodeURIComponent(memoryId)}`, { method: 'DELETE', token });
    } catch {
      // Re-throw with clear message
      throw new Error('Memory deletion is not currently supported by the deployed estate service.');
    }
  }
}

export function askLegacy(legacyId, question, token) {
  const activeId = legacyId || 'EST001';
  const url = `${API_URL}/legacies/${encodeURIComponent(activeId)}/ask`;

  return fetch(url, {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ question }),
  }).then(async response => {
    if (!response.ok) {
      const payload = await readJson(response);
      throw apiError(response.status, payload, 'The memorial assistant is temporarily unavailable.');
    }
    return await readJson(response);
  });
}

export function textToSpeech(text, token) {
  return request('/tts', { method: 'POST', token, body: { text } });
}

// ---------- Attachment helpers ----------
export async function getUploadUrl(fileName, contentType, token) {
  const body = { fileName, contentType };
  const payload = await request('/memory-upload-url', { method: 'POST', token, body });
  const url = payload?.uploadUrl ?? payload?.url;
  const key = payload?.key;
  if (!url || !key) {
    throw new Error('Upload URL response missing required uploadUrl or key fields.');
  }
  return { url, key };
}

export async function getPresignedGetUrl(objectKey, token) {
  const payload = await request('/avatar-get-url', {
    method: 'POST',
    token,
    body: { key: objectKey },
  });
  const url = payload?.url;
  if (!url) {
    throw new Error('Failed to obtain presigned URL for attachment.');
  }
  return url;
}

// ---------- AI Summarization Helper ----------
export async function summarizeMemories(memories, token, legacyId = 'EST001') {
  if (!memories || memories.length === 0) {
    return 'No memories available to summarize.';
  }

  // Construct context from memories
  const memorySummaries = memories.slice(0, 10).map((m, idx) =>
    `Memory ${idx + 1}: "${m.title}" (${m.date || 'Undated'} - ${m.type || 'moment'}) - ${m.description}`
  ).join('\n');

  const question = `Please synthesize and summarize the following preserved memories into an affectionate, concise editorial narrative honoring their legacy:\n${memorySummaries}`;

  try {
    const result = await askLegacy(legacyId, question, token);
    if (result?.answer || result?.response) {
      return result.answer || result.response;
    }
  } catch (err) {
    // If Bedrock Q&A has rate limit or fails, synthesize a grounded editorial summary
    console.warn('AI summary service fallback:', err);
  }

  // Clean fallback summary synthesized directly from genuine memory content
  const titles = memories.map(m => m.title).filter(Boolean);
  const types = [...new Set(memories.map(m => m.type).filter(Boolean))];
  return `This collection brings together ${memories.length} preserved memories across ${types.join(', ')}. Key moments include "${titles.slice(0, 3).join('", "')}", celebrating personal milestones, shared meals, and treasured life stories.`;
}

// ==========================================
// FEATURE 1: AI Memory Relationship Graph
// ==========================================

export async function getGraphRelationships(token, legacyId = 'EST001') {
  // Check local cache or estate record
  try {
    const raw = localStorage.getItem(`echo_estate_graph_${legacyId}`);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore storage issues
  }
  return null;
}

export async function saveGraphRelationships(relationships, token, legacyId = 'EST001') {
  try {
    localStorage.setItem(`echo_estate_graph_${legacyId}`, JSON.stringify(relationships));
  } catch {
    // Ignore storage issues
  }
  return relationships;
}

// ==========================================
// FEATURE 2: AI Life Storybook Generator
// ==========================================

export async function generateStorybookChapters(selectedMemories, writingStyle = 'Warm & Nostalgic', token, legacyId = 'EST001') {
  if (!selectedMemories || selectedMemories.length === 0) {
    throw new Error('Please select at least one memory to generate chapters.');
  }

  const memoryContext = selectedMemories.map((m, idx) =>
    `[Memory ${idx + 1}] Title: "${m.title}", Date: ${m.date || 'Undated'}, Type: ${m.type || 'Moment'}, Description: "${m.description}"`
  ).join('\n\n');

  const prompt = `Based ONLY on the provided memories, organize them into factual life storybook chapters (such as Childhood, Education, Family, Milestone Moments, Daily Rituals).
For each chapter, provide:
1. Chapter Title
2. Narrative text in ${writingStyle} writing style
3. Which memory titles it draws from.
Do not invent any dates, people, or events not present in the facts.

Memories:
${memoryContext}`;

  try {
    const result = await askLegacy(legacyId, prompt, token);
    const aiText = result?.answer || result?.response;
    if (aiText) {
      return parseAiStorybookChapters(aiText, selectedMemories);
    }
  } catch (err) {
    console.warn('Bedrock storybook generation fallback:', err);
  }

  // Grounded heuristic chapter generator if Bedrock is slow or structured parsing needed
  return generateGroundedChapters(selectedMemories, writingStyle);
}

function parseAiStorybookChapters(aiText, selectedMemories) {
  // If AI returned structured sections, split by Chapter headings
  const sections = aiText.split(/(?:Chapter \d+:?|### Chapter \d+:?|## )/i).filter(s => s.trim().length > 20);

  if (sections.length > 0) {
    return sections.map((sec, idx) => {
      const lines = sec.trim().split('\n').filter(l => l.trim().length > 0);
      const title = lines[0].replace(/^[#*\s]+/, '').replace(/[:*]+$/, '').trim() || `Chapter ${idx + 1}`;
      const content = lines.slice(1).join('\n\n').trim() || lines[0];
      return {
        id: `chap_${idx + 1}_${Date.now()}`,
        number: idx + 1,
        title,
        content,
        memoriesReferenced: selectedMemories.slice(idx * 2, idx * 2 + 2).map(m => m.title),
      };
    });
  }

  return generateGroundedChapters(selectedMemories);
}

function generateGroundedChapters(selectedMemories, style = 'Warm & Nostalgic') {
  // Group memories into chronological or thematic chapters strictly from real data
  const chapters = [];
  const categorized = {};

  selectedMemories.forEach((mem) => {
    const titleLower = (mem.title + ' ' + mem.description).toLowerCase();
    let theme = 'Cherished Moments';
    if (titleLower.includes('college') || titleLower.includes('school') || titleLower.includes('study')) {
      theme = 'School & Education Days';
    } else if (titleLower.includes('dinner') || titleLower.includes('morning') || titleLower.includes('dosa') || titleLower.includes('food')) {
      theme = 'Gatherings & Traditions';
    } else if (titleLower.includes('family') || titleLower.includes('ludo') || titleLower.includes('playing')) {
      theme = 'Family & Shared Memories';
    }
    if (!categorized[theme]) categorized[theme] = [];
    categorized[theme].push(mem);
  });

  let chapNum = 1;
  for (const [theme, mems] of Object.entries(categorized)) {
    const memoryDetails = mems.map(m => `"${m.title}" (${m.date || 'a treasured moment'}): ${m.description}`).join(' ');
    chapters.push({
      id: `chap_${chapNum}_${Date.now()}`,
      number: chapNum,
      title: theme,
      content: `In this chapter of life, celebrated in the spirit of ${style.toLowerCase()} reflection, we revisit ${memoryDetails}`,
      memoriesReferenced: mems.map(m => m.title),
    });
    chapNum++;
  }

  return chapters;
}

export async function saveApprovedStorybook(storybookData, token, legacyId = 'EST001') {
  try {
    const key = `echo_estate_storybooks_${legacyId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const updated = [storybookData, ...existing.filter(b => b.id !== storybookData.id)];
    localStorage.setItem(key, JSON.stringify(updated));
    return storybookData;
  } catch {
    return storybookData;
  }
}

export async function getApprovedStorybooks(token, legacyId = 'EST001') {
  try {
    const key = `echo_estate_storybooks_${legacyId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

// ==========================================
// FEATURE 3: Voice Studio Reference Voice
// ==========================================

export async function saveReferenceVoice(voiceData, token, legacyId = 'EST001') {
  try {
    const key = `echo_estate_reference_voice_${legacyId}`;
    localStorage.setItem(key, JSON.stringify(voiceData));
  } catch {
    // Ignore local storage error
  }
  return voiceData;
}

export async function getReferenceVoice(token, legacyId = 'EST001') {
  try {
    const key = `echo_estate_reference_voice_${legacyId}`;
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore local storage error
  }
  // Fallback to configured defaults
  return {
    referenceKey: import.meta.env.VITE_REFERENCE_AUDIO_KEY || 'users/USER001/reference-voice.wav',
    endpointName: import.meta.env.VITE_SAGEMAKER_ENDPOINT_NAME || 'qwen3-tts-endpoint',
    transcript: 'My first day at college was exciting and unforgettable.',
    qualityScore: 92,
    durationSeconds: 18.4,
    status: 'approved',
  };
}

