const fs = require("fs");
const file = "./db.json";

function load() {
  if (!fs.existsSync(file)) fs.writeFileSync(file, "{}");
  const raw = fs.readFileSync(file, "utf8") || "{}";
  try { return JSON.parse(raw); } 
  catch { fs.writeFileSync(file, "{}"); return {}; }
}

function save(data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

module.exports = {
  getSettings(guildId) {
    const db = load();
    return db[guildId]?.settings || {};
  },
  setSettings(guildId, settings) {
    const db = load();
    if (!db[guildId]) db[guildId] = {};
    db[guildId].settings = settings;
    save(db);
  },
  getActiveShift(guildId, userId) {
    const db = load();
    const shifts = db[guildId]?.shifts || [];
    return shifts.find(s => s.userId === userId && !s.end);
  },
  startShift(guildId, userId, startTime) {
    const db = load();
    if (!db[guildId]) db[guildId] = {};
    if (!db[guildId].shifts) db[guildId].shifts = [];
    db[guildId].shifts.push({ userId, start: startTime, end: null });
    save(db);
  },
  createShift(guildId, userId, startTime) {
    return this.startShift(guildId, userId, startTime);
  },
  endShift(guildId, userId, endTime) {
    const db = load();
    if (!db[guildId]?.shifts) return null;
    const shift = db[guildId].shifts.find(s => s.userId === userId && !s.end);
    if (shift) { shift.end = endTime; save(db); return shift; }
    return null;
  },
  getShifts(guildId, userId) {
    const db = load();
    return db[guildId]?.shifts?.filter(s => s.userId === userId) || [];
  },
  getLeaderboard(guildId) {
    const db = load();
    const shifts = db[guildId]?.shifts || [];
    const totalTime = {};
    shifts.forEach(s => {
      const start = new Date(s.start);
      const end = s.end ? new Date(s.end) : new Date();
      const duration = end - start;
      totalTime[s.userId] = (totalTime[s.userId] || 0) + duration;
    });
    return Object.entries(totalTime)
      .sort((a, b) => b[1] - a[1])
      .map(([userId, ms]) => ({ userId, ms }));
  }
};
