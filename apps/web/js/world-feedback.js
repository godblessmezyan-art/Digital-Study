import { getStoredUser } from './auth-client.js';
import { readFootprints } from './footprints.js';

const PREFIX = 'cloud-realm-world-feedback-v2';
const LEGACY_PREFIX = 'cloud-realm-world-feedback-v1';
const MAX_EVENTS = 24;
const identity = () => getStoredUser()?.id || getStoredUser()?.username || null;
const key = prefix => `${prefix}:${identity() || 'guest'}`;

function blankState() { return { events: [], worldMarks: [], lastVisitedScene: null }; }

function readStoredState() {
  if (!identity()) return blankState();
  try {
    const stored = JSON.parse(localStorage.getItem(key(PREFIX)) || 'null');
    if (stored?.events) return { ...blankState(), ...stored, events: stored.events.slice(0, MAX_EVENTS) };
    const legacy = JSON.parse(localStorage.getItem(key(LEGACY_PREFIX)) || '[]');
    return { ...blankState(), events: Array.isArray(legacy) ? legacy.slice(0, MAX_EVENTS) : [] };
  } catch { return blankState(); }
}

function writeState(state) {
  if (!identity()) return;
  localStorage.setItem(key(PREFIX), JSON.stringify({ ...state, events: state.events.slice(0, MAX_EVENTS), worldMarks: state.worldMarks.slice(0, 24) }));
}

function eventRef(type, detail) {
  return String(detail.id || detail.targetId || detail.slug || detail.sceneId || `${type}:${detail.title || ''}`);
}

export function recordWorldFeedback(type, detail = {}) {
  if (!identity()) return null;
  const state = readStoredState();
  const ref = eventRef(type, detail);
  const item = { id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`, ref, type, detail, createdAt: new Date().toISOString() };
  state.events = [item, ...state.events.filter(event => !(event.type === type && event.ref === ref))].slice(0, MAX_EVENTS);
  if (type === 'scene_visited') state.lastVisitedScene = item;
  if (type === 'chronicle_discovered') {
    state.worldMarks = [{ id: ref, type: 'chronicle', detail, createdAt: item.createdAt }, ...state.worldMarks.filter(mark => mark.id !== ref)];
  }
  writeState(state);
  window.dispatchEvent(new CustomEvent('worldfeedback', { detail: item }));
  return item;
}

export function readWorldFeedback() {
  return readStoredState().events.filter(item => item && typeof item.type === 'string');
}

export function latestWorldFeedback(type) {
  return readWorldFeedback().find(item => item.type === type) || null;
}

export function getWorldFeedbackState() {
  const stored = readStoredState();
  const footprints = readFootprints();
  const lastRead = footprints.find(item => item.kind === 'book' && ['progress', 'opened'].includes(item.activity)) || null;
  const lastQuote = footprints.find(item => item.kind === 'quote') || null;
  return {
    lastJournalEntry: stored.events.find(item => item.type === 'journal_saved') || null,
    lastReadBook: lastRead ? { type: 'book_read', detail: lastRead, createdAt: new Date(lastRead.timestamp).toISOString() } : null,
    lastChronicleDiscovery: stored.events.find(item => item.type === 'chronicle_discovered') || null,
    lastVisitedScene: stored.lastVisitedScene,
    recentActivity: [...stored.events, ...footprints.map(item => ({ type: `footprint_${item.kind}`, detail: item, createdAt: new Date(item.timestamp).toISOString() }))]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 8),
    worldMarks: stored.worldMarks,
    lastQuote,
  };
}
