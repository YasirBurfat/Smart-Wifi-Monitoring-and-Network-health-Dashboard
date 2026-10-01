function presentUserRef(user) {
  if (!user) return null;
  if (typeof user === 'object' && user.name && user.email) {
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }
  return { id: user._id || user };
}

function presentLocationRef(location) {
  if (!location) return null;
  if (typeof location === 'object' && location.name) {
    return {
      id: location._id,
      name: location.name,
      building: location.building,
      floor: location.floor,
      currentStatus: location.currentStatus,
    };
  }
  return { id: location._id || location };
}

function presentLocation(location) {
  return {
    id: location._id,
    name: location.name,
    building: location.building,
    floor: location.floor || '',
    description: location.description || '',
    currentStatus: location.currentStatus,
    networkStatus: location.currentStatus,
    status: location.currentStatus,
    mapPosition: {
      x: location.mapPosition?.x ?? 0,
      y: location.mapPosition?.y ?? 0,
    },
    createdAt: location.createdAt,
    updatedAt: location.updatedAt,
  };
}

function presentTest(test) {
  return {
    id: test._id,
    user: presentUserRef(test.user),
    location: presentLocationRef(test.location),
    download: test.download,
    upload: test.upload,
    ping: test.ping,
    packetLoss: test.packetLoss,
    downloadMbps: test.download,
    uploadMbps: test.upload,
    pingMs: test.ping,
    score: test.score,
    band: test.band,
    status: test.band,
    health: test.band,
    healthStatus: test.band,
    components: test.components || null,
    trendMessage: test.trendMessage || null,
    problemFlag: test.problemFlag || null,
    createdAt: test.createdAt,
  };
}

function presentTestRef(test) {
  if (!test) return null;
  if (typeof test === 'object' && test.score != null) {
    return {
      id: test._id,
      score: test.score,
      band: test.band,
      download: test.download,
      upload: test.upload,
      ping: test.ping,
      packetLoss: test.packetLoss,
      createdAt: test.createdAt,
    };
  }
  return { id: test._id || test };
}

function assigneeName(user) {
  if (!user || typeof user !== 'object' || !user.name) return '';
  return user.name;
}

function presentNote(note) {
  return {
    id: note._id,
    author: presentUserRef(note.author),
    text: note.text,
    note: note.text,
    createdAt: note.createdAt,
  };
}

function presentComplaint(complaint) {
  return {
    id: complaint._id,
    user: presentUserRef(complaint.user),
    userId: complaint.user && complaint.user._id ? complaint.user._id : complaint.user,
    location: presentLocationRef(complaint.location),
    locationId: complaint.location && complaint.location._id ? complaint.location._id : complaint.location,
    type: complaint.type,
    description: complaint.description,
    status: complaint.status,
    relatedTest: presentTestRef(complaint.relatedTest),
    testId: complaint.relatedTest && complaint.relatedTest._id ? complaint.relatedTest._id : complaint.relatedTest || '',
    assignedTo: presentUserRef(complaint.assignedTo),
    assignee: assigneeName(complaint.assignedTo),
    notes: (complaint.notes || []).map(presentNote),
    createdAt: complaint.createdAt,
    updatedAt: complaint.updatedAt,
  };
}

function presentOutage(outage) {
  return {
    id: outage._id,
    location: presentLocationRef(outage.location),
    type: outage.type,
    status: outage.status,
    complaintCount: outage.complaintCount,
    startedAt: outage.startedAt,
    resolvedAt: outage.resolvedAt || null,
    resolvedReason: outage.resolvedReason || null,
    createdAt: outage.createdAt,
    updatedAt: outage.updatedAt,
  };
}

module.exports = {
  presentLocation,
  presentLocationRef,
  presentTest,
  presentComplaint,
  presentOutage,
  presentUserRef,
};
