const ROLES = ['student', 'it', 'manager', 'admin'];
const STAFF_ROLES = ['it', 'manager', 'admin'];
const LOCATION_WRITE_ROLES = ['admin', 'manager'];
const ACCOUNT_STATUSES = ['active', 'disabled'];
const BANDS = ['Excellent', 'Good', 'Fair', 'Poor', 'Critical'];
const LOCATION_STATUSES = [...BANDS, 'Unknown'];
const COMPLAINT_STATUSES = ['Submitted', 'Reviewed', 'Assigned', 'In Progress', 'Resolved'];
const OUTAGE_STATUSES = ['active', 'resolved'];
const HEALTHY_BANDS = ['Good', 'Excellent'];
const PROBLEM_BANDS = ['Poor', 'Critical'];
const SPEEDTEST_MAX_MB = 25;

const COMPLAINT_CATEGORIES = [
  'slow internet',
  'no connection',
  'wifi dropping',
  'login/authentication',
  'high latency',
  'hardware/access point',
  'other',
];

const DEFAULT_THRESHOLDS = {
  downloadMbps: 50,
  downloadPoints: 30,
  uploadMbps: 20,
  uploadPoints: 15,
  pingGoodMs: 20,
  pingBadMs: 250,
  pingPoints: 25,
  packetLossPercent: 15,
  packetLossPoints: 20,
  stabilityPoints: 10,
  failurePenalty: 2,
  complaintPenalty: 1,
  excellentMin: 90,
  goodMin: 70,
  fairMin: 50,
  poorMin: 30,
};

const DEFAULT_OUTAGE_RULE = {
  minComplaints: 3,
  windowMinutes: 30,
};

module.exports = {
  ROLES,
  STAFF_ROLES,
  LOCATION_WRITE_ROLES,
  ACCOUNT_STATUSES,
  BANDS,
  LOCATION_STATUSES,
  COMPLAINT_STATUSES,
  OUTAGE_STATUSES,
  HEALTHY_BANDS,
  PROBLEM_BANDS,
  SPEEDTEST_MAX_MB,
  COMPLAINT_CATEGORIES,
  DEFAULT_THRESHOLDS,
  DEFAULT_OUTAGE_RULE,
};
