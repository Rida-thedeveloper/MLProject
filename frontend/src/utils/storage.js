export function getLocalInterviews() {
  try {
    const raw = localStorage.getItem('mockly_interviews');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('Failed to read local interviews from localStorage', e);
    return [];
  }
}

export function saveLocalInterview(record) {
  try {
    const existing = getLocalInterviews();
    const sessionId = record.recorded_answers?.sessionId || record.sessionId || record.id;
    if (sessionId && existing.some(item => (item.recorded_answers?.sessionId || item.sessionId || item.id) === sessionId)) {
      return existing;
    }
    const updated = [record, ...existing];
    localStorage.setItem('mockly_interviews', JSON.stringify(updated));
    window.dispatchEvent(new Event('mockly_interviews_updated'));
    return updated;
  } catch (e) {
    console.error('Failed to save local interview', e);
    return [];
  }
}

export function combineInterviews(supabaseData, localData) {
  const map = new Map();
  (localData || []).forEach(item => {
    const key = item.recorded_answers?.sessionId || item.sessionId || item.id || item.created_at || Math.random();
    map.set(key, item);
  });
  (supabaseData || []).forEach(item => {
    const key = item.recorded_answers?.sessionId || item.sessionId || item.id || item.created_at || Math.random();
    map.set(key, item);
  });
  const all = Array.from(map.values());
  all.sort((a, b) => new Date(b.created_at || Date.now()) - new Date(a.created_at || Date.now()));
  return all;
}

export function deleteLocalInterview(sessionId) {
  try {
    const existing = getLocalInterviews();
    const updated = existing.filter(item => {
      const id = item.id || item.recorded_answers?.sessionId || item.sessionId;
      return id !== sessionId && String(id) !== String(sessionId);
    });
    localStorage.setItem('mockly_interviews', JSON.stringify(updated));
    window.dispatchEvent(new Event('mockly_interviews_updated'));
    return updated;
  } catch (e) {
    console.error('Failed to delete local interview', e);
    return [];
  }
}

export function clearAllLocalInterviews() {
  try {
    localStorage.removeItem('mockly_interviews');
    window.dispatchEvent(new Event('mockly_interviews_updated'));
    return [];
  } catch (e) {
    console.error('Failed to clear local interviews', e);
    return [];
  }
}
