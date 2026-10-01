const Location = require('../models/Location');

async function applyLocationFilters(filter, query) {
  if (query.location) {
    filter.location = query.location;
  }
  if (query.building) {
    const ids = await Location.find({ building: query.building }).distinct('_id');
    if (filter.location) {
      const wanted = String(filter.location);
      const allowed = ids.some((id) => String(id) === wanted);
      filter.location = allowed ? filter.location : { $in: [] };
    } else {
      filter.location = { $in: ids };
    }
  }
  return filter;
}

function applyCreatedRange(filter, query) {
  if (query.date && /^\d{4}-\d{2}-\d{2}$/.test(query.date)) {
    const start = new Date(`${query.date}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    filter.createdAt = { $gte: start, $lt: end };
    return filter;
  }

  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = new Date(query.from);
    if (query.to) filter.createdAt.$lte = new Date(query.to);
  }
  return filter;
}

module.exports = { applyLocationFilters, applyCreatedRange };
