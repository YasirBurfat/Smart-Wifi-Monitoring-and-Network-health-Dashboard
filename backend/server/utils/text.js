function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizedType(type) {
  return String(type || '').trim().toLowerCase();
}

function exactTypeFilter(type) {
  return { $regex: `^${escapeRegex(String(type).trim())}$`, $options: 'i' };
}

module.exports = { escapeRegex, normalizedType, exactTypeFilter };
