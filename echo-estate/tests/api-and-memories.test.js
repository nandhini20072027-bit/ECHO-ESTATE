import test from 'node:test';
import assert from 'node:assert/strict';

// Helper function mirroring memories extraction in api.js
function extractMemories(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.memories)) return payload.memories;
  if (Array.isArray(payload?.estate?.memories)) return payload.estate.memories;
  if (Array.isArray(payload?.Item?.memories)) return payload.Item.memories;
  if (payload && typeof payload === 'object') return [];
  throw new Error('The estate service returned an unrecognized memory format.');
}

// Helper function mirroring memory filtering
function filterAndSortMemories(memories, { query = '', category = 'all', privacy = 'all', sort = 'newest' }) {
  let result = [...memories];

  if (category !== 'all') {
    result = result.filter(m => (m.type || 'story').toLowerCase() === category.toLowerCase());
  }

  if (privacy !== 'all') {
    result = result.filter(m => (m.privacy || m.consent || 'private').toLowerCase() === privacy.toLowerCase());
  }

  if (query.trim()) {
    const q = query.toLowerCase().trim();
    result = result.filter(m => {
      const title = (m.title || '').toLowerCase();
      const desc = (m.description || '').toLowerCase();
      const dateStr = (m.date || m.createdAt || '').toLowerCase();
      return title.includes(q) || desc.includes(q) || dateStr.includes(q);
    });
  }

  result.sort((a, b) => {
    if (sort === 'title') {
      return (a.title || '').localeCompare(b.title || '');
    }
    const timeA = new Date(a.date || a.createdAt || 0).getTime() || 0;
    const timeB = new Date(b.date || b.createdAt || 0).getTime() || 0;
    if (sort === 'oldest') {
      return timeA - timeB;
    }
    return timeB - timeA;
  });

  return result;
}

test('extractMemories extracts memories from direct memories property', () => {
  const payload = {
    estateId: 'EST001',
    memories: [
      { memoryId: '1', title: 'College Day', type: 'story' },
      { memoryId: '2', title: 'Graduation', type: 'milestone' }
    ]
  };
  const extracted = extractMemories(payload);
  assert.equal(extracted.length, 2);
  assert.equal(extracted[0].title, 'College Day');
});

test('extractMemories handles nested estate.memories and Item.memories', () => {
  const nestedEstate = { estate: { memories: [{ memoryId: '3', title: 'Trip to Vellore' }] } };
  assert.equal(extractMemories(nestedEstate).length, 1);

  const dynamoItem = { Item: { memories: [{ memoryId: '4', title: 'Family dinner' }] } };
  assert.equal(extractMemories(dynamoItem).length, 1);
});

test('extractMemories returns empty array for empty estate object without throwing', () => {
  const emptyEstate = { estateId: 'EST001', estateName: 'Empty Estate' };
  const extracted = extractMemories(emptyEstate);
  assert.deepEqual(extracted, []);
});

test('filterAndSortMemories correctly filters by category and search term', () => {
  const sampleData = [
    { memoryId: '1', title: 'First Day College', description: 'Exciting morning', type: 'story', date: '2026-10-05', privacy: 'trusted' },
    { memoryId: '2', title: 'School Days', description: 'Playing ludo', type: 'story', date: '2026-10-02', privacy: 'private' },
    { memoryId: '3', title: 'Morning Photo', description: 'Idly and sambar', type: 'photo', date: '2026-10-12', privacy: 'approved' }
  ];

  // Category filter
  const photosOnly = filterAndSortMemories(sampleData, { category: 'photo' });
  assert.equal(photosOnly.length, 1);
  assert.equal(photosOnly[0].title, 'Morning Photo');

  // Privacy filter
  const approvedOnly = filterAndSortMemories(sampleData, { privacy: 'approved' });
  assert.equal(approvedOnly.length, 1);
  assert.equal(approvedOnly[0].title, 'Morning Photo');

  // Search filter
  const searchLudo = filterAndSortMemories(sampleData, { query: 'ludo' });
  assert.equal(searchLudo.length, 1);
  assert.equal(searchLudo[0].title, 'School Days');

  // Sort newest first
  const sortedNewest = filterAndSortMemories(sampleData, { sort: 'newest' });
  assert.equal(sortedNewest[0].title, 'Morning Photo'); // 2026-10-12

  // Sort oldest first
  const sortedOldest = filterAndSortMemories(sampleData, { sort: 'oldest' });
  assert.equal(sortedOldest[0].title, 'School Days'); // 2026-10-02
});
