function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function daysAgo(days) {
  return hoursAgo(days * 24);
}

function utcDateString(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function recentDates(count) {
  const dates = [];
  const today = new Date();
  const cursor = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const day = new Date(cursor);
    day.setUTCDate(cursor.getUTCDate() - offset);
    dates.push(day.toISOString().slice(0, 10));
  }
  return dates;
}

module.exports = { hoursAgo, daysAgo, utcDateString, recentDates };
