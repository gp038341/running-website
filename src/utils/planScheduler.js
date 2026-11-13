// src/utils/planScheduler.js

/**
 * Utilities to:
 * - Compute dynamic plan length from goal date
 * - Anchor the plan so the final day aligns with the race date
 * - Assign real calendar dates to each plan day
 * - Guarantee a Race day exactly on the goal date
 */

export function calculatePlanLengthFromGoal(goalDateISO, minWeeks = 4, maxWeeks = 52) {
  const today = new Date();
  const race = new Date(goalDateISO + 'T00:00:00');
  today.setHours(0,0,0,0);
  race.setHours(0,0,0,0);

  const diffDays = Math.round((race - today) / (1000 * 60 * 60 * 24));
  const weeks = Math.ceil(diffDays / 7);
  return Math.max(weeks, minWeeks);
}

export function getStartDateAnchoredToRace(goalDateISO, planLengthWeeks) {
  const raceDate = new Date(goalDateISO + 'T00:00:00');
  raceDate.setHours(0,0,0,0);
  const start = new Date(raceDate);
  start.setDate(start.getDate() - ((planLengthWeeks * 7) - 1));
  // Adjust start date to the previous Monday
  const dayOfWeek = start.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const diffToMonday = (dayOfWeek === 0) ? 6 : dayOfWeek - 1;
  start.setDate(start.getDate() - diffToMonday);
  return start;
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function assignDatesToPlan(plan, startDateISO, goalDateISO) {
  const startDate = new Date(startDateISO);
  startDate.setHours(0,0,0,0);
  const raceDate = new Date(goalDateISO + 'T00:00:00');
  raceDate.setHours(0,0,0,0);

  // Calculate total days between start and race (inclusive)
  const totalDays = Math.round((raceDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

  // Flatten all plan days into a single array
  let flatDays = [];
  plan.weeks.forEach(week => {
    if (!Array.isArray(week.days)) week.days = [];
    flatDays = flatDays.concat(week.days);
  });

  // Patch: pad or trim to match totalDays
  while (flatDays.length < totalDays) {
    flatDays.splice(flatDays.length - 1, 0, {
      type: 'Rest',
      description: 'Rest day (auto-added to align plan with calendar)'
    });
  }
  if (flatDays.length > totalDays) {
    flatDays.splice(totalDays - 1, flatDays.length - totalDays);
  }

  // Assign dates and dayOfWeek
  let currentDate = new Date(startDate);
  for (let i = 0; i < flatDays.length; i++) {
    flatDays[i].date = currentDate.toISOString();
    flatDays[i].dayOfWeek = dayNames[currentDate.getDay()];
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Only the last day should be "Race"
  for (let i = 0; i < flatDays.length - 1; i++) {
    if (flatDays[i].type && flatDays[i].type.toLowerCase() === 'race') {
      flatDays[i].type = 'Recovery';
      flatDays[i].description = 'Easy recovery day (auto-corrected from misplaced Race day)';
    }
  }

  // Ensure last day is race day and correct dayOfWeek
  flatDays[flatDays.length - 1].date = raceDate.toISOString();
  flatDays[flatDays.length - 1].dayOfWeek = dayNames[raceDate.getDay()];
  flatDays[flatDays.length - 1].type = 'Race';
  flatDays[flatDays.length - 1].description = '🏆 RACE DAY — Good luck!';

  // Ensure the day before race is a shakeout
  if (flatDays.length > 1) {
    const dayBefore = flatDays[flatDays.length - 2];
    dayBefore.type = 'Recovery';
    dayBefore.description = '3-4 mile shakeout run, light strides, and drills. Hydrate and rest!';
  }

  // Rebuild weeks (groups of 7)
  const weeks = [];
  for (let i = 0; i < flatDays.length; i += 7) {
    weeks.push({
      ...plan.weeks[Math.floor(i / 7)] || {},
      days: flatDays.slice(i, i + 7)
    });
  }

  return { ...plan, weeks };
}

// ---------- Helpers ----------

//const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function dayOfWeekName(date) {
  return dayNames[date.getDay()];
}

function toISO(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function simplifyForTaper(desc = '') {
  let out = desc || '';
  out = out.replace(/(\d+)\s*x\s*(\d+)/i, (m, a, b) => {
    const half = Math.max(1, Math.floor(Number(a) / 2));
    return `${half} x ${b}`;
  });
  out = out.replace(/(\d+)\s*mile(s)?/i, (m, n) => {
    const reduced = Math.max(1, Math.round(Number(n) * 0.6));
    return `${reduced} mile${reduced === 1 ? '' : 's'}`;
  });
  return out + ' (keep it snappy, full recovery)';
}