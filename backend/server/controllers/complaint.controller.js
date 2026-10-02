const Complaint = require('../models/Complaint');
const Location = require('../models/Location');
const Test = require('../models/Test');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { presentComplaint, presentOutage } = require('../utils/present');
const { getPaging, pageMeta } = require('../utils/pagination');
const { applyLocationFilters, applyCreatedRange } = require('../utils/filters');
const { COMPLAINT_STATUSES, STAFF_ROLES } = require('../utils/constants');
const { logActivity } = require('../services/activity.service');
const { evaluateOutage } = require('../services/outage.service');
const { notifyStaff, notifyUser, safeNotify } = require('../services/notification.service');
const { exactTypeFilter, escapeRegex } = require('../utils/text');

const POPULATE = [
  { path: 'user', select: 'name email role' },
  { path: 'location', select: 'name building floor currentStatus' },
  { path: 'assignedTo', select: 'name email role' },
  { path: 'relatedTest', select: 'score band download upload ping packetLoss createdAt' },
  { path: 'notes.author', select: 'name email role' },
];

function ownsComplaint(user, complaint) {
  const owner = complaint.user && complaint.user._id ? complaint.user._id : complaint.user;
  return String(owner) === String(user._id);
}

async function loadVisible(id, user) {
  const complaint = await Complaint.findById(id);
  if (!complaint) throw new ApiError(404, 'Complaint not found');
  if (user.role === 'student' && !ownsComplaint(user, complaint)) {
    throw new ApiError(404, 'Complaint not found');
  }
  return complaint;
}

async function requireStaffAssignee(id) {
  const assignee = await User.findById(id);
  if (!assignee || assignee.accountStatus !== 'active' || !STAFF_ROLES.includes(assignee.role)) {
    throw new ApiError(400, 'Assignee must be an active staff member');
  }
  return assignee;
}

async function resolveStaffAssignee(value) {
  const text = String(value || '').trim();
  if (!text) throw new ApiError(400, 'Assignee must be an active staff member');
  if (/^[a-fA-F0-9]{24}$/.test(text)) return requireStaffAssignee(text);

  const pattern = new RegExp(`^${escapeRegex(text)}$`, 'i');
  const assignee = await User.findOne({
    accountStatus: 'active',
    role: { $in: STAFF_ROLES },
    $or: [{ email: pattern }, { name: pattern }],
  });
  if (!assignee) throw new ApiError(400, 'Assignee must be an active staff member');
  return assignee;
}

function assertForwardStatus(current, next) {
  const from = COMPLAINT_STATUSES.indexOf(current);
  const to = COMPLAINT_STATUSES.indexOf(next);
  if (from < 0 || to < 0) {
    throw new ApiError(400, 'Unknown complaint status');
  }
  if (to !== from + 1) {
    const expected = COMPLAINT_STATUSES[from + 1];
    if (!expected) {
      throw new ApiError(400, 'Resolved complaints cannot change status');
    }
    throw new ApiError(400, `Status must move from ${current} to ${expected}`);
  }
}

const create = asyncHandler(async (req, res) => {
  const body = req.validated.body;
  const { locationId, type, description } = body;
  const location = await Location.findById(locationId);
  if (!location) throw new ApiError(404, 'Location not found');

  let relatedTestId = body.relatedTestId || body.testId || null;
  if (!relatedTestId && body.attachLatestTest) {
    const latest = await Test.findOne({ location: location._id, user: req.user._id })
      .sort({ createdAt: -1 })
      .select('_id');
    if (latest) relatedTestId = latest._id;
  }

  let relatedTest = null;
  if (relatedTestId) {
    relatedTest = await Test.findById(relatedTestId);
    if (!relatedTest) throw new ApiError(400, 'Related test was not found');
    if (String(relatedTest.location) !== String(location._id)) {
      throw new ApiError(400, 'Related test belongs to a different location');
    }
    if (req.user.role === 'student' && String(relatedTest.user) !== String(req.user._id)) {
      throw new ApiError(403, 'You can only attach your own test');
    }
  }

  const complaint = await Complaint.create({
    user: req.user._id,
    location: location._id,
    type,
    severity: body.severity || 'medium',
    description,
    status: 'Submitted',
    relatedTest: relatedTest ? relatedTest._id : null,
  });

  const outage = await evaluateOutage(complaint, req.user._id);
  await logActivity(req.user._id, 'create', 'Complaint', complaint._id, {
    location: location._id,
    type,
    severity: complaint.severity,
    outageId: outage ? outage._id : null,
  });
  await safeNotify(() => notifyStaff({
    title: 'New complaint',
    body: `${type} reported at ${location.name}.`,
    kind: 'complaint',
    entity: 'Complaint',
    entityId: complaint._id,
  }));

  await complaint.populate(POPULATE);
  res.status(201).json({
    ok: true,
    complaint: presentComplaint(complaint),
    outage: outage ? presentOutage(outage) : null,
  });
});

const list = asyncHandler(async (req, res) => {
  const query = req.validated.query;
  const { page, limit, skip } = getPaging(query);
  const filter = {};
  await applyLocationFilters(filter, query);
  applyCreatedRange(filter, query);
  if (query.type) filter.type = exactTypeFilter(query.type);
  if (query.status) filter.status = query.status;
  if (req.user.role === 'student') filter.user = req.user._id;

  const [complaints, total] = await Promise.all([
    Complaint.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate(POPULATE),
    Complaint.countDocuments(filter),
  ]);

  res.json({
    ok: true,
    complaints: complaints.map(presentComplaint),
    ...pageMeta(total, page, limit),
  });
});

const getOne = asyncHandler(async (req, res) => {
  const complaint = await loadVisible(req.validated.params.id, req.user);
  await complaint.populate(POPULATE);
  res.json({ ok: true, complaint: presentComplaint(complaint) });
});

const updateStatus = asyncHandler(async (req, res) => {
  const { status, assigneeId, assignee: assigneeName } = req.validated.body;
  const complaint = await Complaint.findById(req.validated.params.id);
  if (!complaint) throw new ApiError(404, 'Complaint not found');

  assertForwardStatus(complaint.status, status);
  const assigneeValue = assigneeId || String(assigneeName || '').trim();
  if (assigneeValue) {
    const assignee = await resolveStaffAssignee(assigneeValue);
    complaint.assignedTo = assignee._id;
  }
  if (status === 'Assigned' && !complaint.assignedTo) {
    throw new ApiError(400, 'Assign a staff member when moving the complaint to Assigned');
  }

  const from = complaint.status;
  complaint.status = status;
  await complaint.save();
  await logActivity(req.user._id, 'status_change', 'Complaint', complaint._id, {
    from,
    to: status,
    assignedTo: complaint.assignedTo,
  });
  if (status === 'Resolved') {
    await safeNotify(() => notifyUser(complaint.user, {
      title: 'Complaint resolved',
      body: `Your ${complaint.type} report was resolved.`,
      kind: 'complaint',
      entity: 'Complaint',
      entityId: complaint._id,
    }));
  } else {
    await safeNotify(() => notifyUser(complaint.user, {
      title: 'Complaint updated',
      body: `Your ${complaint.type} report moved from ${from} to ${status}.`,
      kind: 'complaint',
      entity: 'Complaint',
      entityId: complaint._id,
    }));
  }
  if (status === 'Assigned' && complaint.assignedTo) {
    await safeNotify(() => notifyUser(complaint.assignedTo, {
      title: 'Complaint assigned',
      body: `${complaint.type} was assigned to you.`,
      kind: 'assignment',
      entity: 'Complaint',
      entityId: complaint._id,
    }));
  }
  await complaint.populate(POPULATE);
  res.json({ ok: true, complaint: presentComplaint(complaint) });
});

const assign = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.validated.params.id);
  if (!complaint) throw new ApiError(404, 'Complaint not found');
  if (complaint.status === 'Resolved') {
    throw new ApiError(400, 'Resolved complaints cannot be reassigned');
  }

  const assignee = await resolveStaffAssignee(
    req.validated.body.assigneeId || req.validated.body.assignee
  );
  complaint.assignedTo = assignee._id;
  await complaint.save();
  await logActivity(req.user._id, 'update', 'Complaint', complaint._id, {
    assignedTo: assignee._id,
  });
  await safeNotify(() => notifyUser(assignee._id, {
    title: 'Complaint assigned',
    body: `${complaint.type} was assigned to you.`,
    kind: 'assignment',
    entity: 'Complaint',
    entityId: complaint._id,
  }));
  await complaint.populate(POPULATE);
  res.json({ ok: true, complaint: presentComplaint(complaint) });
});

const addNote = asyncHandler(async (req, res) => {
  const complaint = await loadVisible(req.validated.params.id, req.user);
  complaint.notes.push({
    author: req.user._id,
    text: req.validated.body.text || req.validated.body.note,
    createdAt: new Date(),
  });
  await complaint.save();
  await logActivity(req.user._id, 'update', 'Complaint', complaint._id, { note: true });
  await complaint.populate(POPULATE);
  res.status(201).json({ ok: true, complaint: presentComplaint(complaint) });
});

module.exports = { create, list, getOne, updateStatus, assign, addNote };
