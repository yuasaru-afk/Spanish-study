// 教材 JSON の読み込み（Service Worker が先読みしているので圏外でも読める）
const cache = new Map();

async function getJson(path) {
  if (!cache.has(path)) {
    cache.set(path, fetch(path).then(r => {
      if (!r.ok) throw new Error(`${path}: ${r.status}`);
      return r.json();
    }).catch(err => { cache.delete(path); throw err; }));
  }
  return cache.get(path);
}

export const loadIndex = () => getJson('content/units.json');

export async function loadUnit(id) {
  const entry = (await loadIndex()).find(u => u.id === id);
  if (!entry) throw new Error(`ユニットがありません: ${id}`);
  return getJson(`content/${entry.file}`);
}
