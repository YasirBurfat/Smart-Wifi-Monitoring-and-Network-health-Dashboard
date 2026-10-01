function getPaging(query = {}) {
  const page = query.page || 1;
  const limit = query.limit || 100;
  return { page, limit, skip: (page - 1) * limit };
}

function pageMeta(total, page, limit) {
  return {
    page,
    limit,
    total,
    pages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

module.exports = { getPaging, pageMeta };
